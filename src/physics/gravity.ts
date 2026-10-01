import { clampVector, normalize, scale, subtract, type Vec2 } from '../core/vector';
import { SpatialGrid } from './spatial-grid';
import balance from '../data/balance.json';

export interface GravityField {
  id: number;
  source: string;
  mode: 'directional' | 'radial' | 'vortex' | 'zero';
  direction: Vec2;
  position: Vec2;
  strength: number;
  radius: number;
  falloff: 'constant' | 'linear' | 'inverseSquare';
  remaining: number;
  affects?: string[];
}

/** The only gravity authority. Strength is acceleration in px/ms². */
export class GravitySystem {
  direction: Vec2 = { x: 0, y: 1 };
  readonly fields = new Map<number, GravityField>();
  private readonly index = new SpatialGrid<GravityField>(160);
  private nextId = 1;
  private dirty = false;

  constructor(
    public strength: number,
    private readonly maxAcceleration: number,
  ) {}

  setDirection(direction: Vec2): boolean {
    if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y)) return false;
    this.direction = normalize(direction);
    return true;
  }

  addField(definition: Omit<GravityField, 'id'>): number {
    if (this.fields.size >= balance.physics.maxFields)
      throw new Error('Gravity field budget exceeded');
    if (
      !Number.isFinite(definition.strength) ||
      !Number.isFinite(definition.radius) ||
      definition.radius <= 0 ||
      definition.radius > 4096 ||
      !Number.isFinite(definition.position.x) ||
      !Number.isFinite(definition.position.y) ||
      !Number.isFinite(definition.remaining) ||
      definition.remaining <= 0
    )
      throw new Error('Invalid gravity field');
    const id = this.nextId++;
    this.fields.set(id, {
      ...definition,
      position: { ...definition.position },
      direction: normalize(definition.direction),
      id,
    });
    this.dirty = true;
    return id;
  }

  removeField(id: number): void {
    this.fields.delete(id);
    this.dirty = true;
  }

  moveField(id: number, position: Vec2): void {
    const field = this.fields.get(id);
    if (!field || !Number.isFinite(position.x + position.y)) return;
    field.position = { ...position };
    this.dirty = true;
  }

  tick(dt: number): void {
    for (const field of this.fields.values()) {
      field.remaining -= dt;
      if (field.remaining <= 0) this.removeField(field.id);
    }
  }

  sample(
    position: Vec2,
    response = 1,
    tags: readonly string[] = [],
    globalDirection = this.direction,
  ): Vec2 {
    return this.calculate(position, response, tags, globalDirection);
  }

  /** Fields whose removal changes the actual, capped acceleration at this point. */
  influencingFields(position: Vec2, response = 1, tags: readonly string[] = []): Set<number> {
    const influences = new Set<number>();
    this.calculate(position, response, tags, this.direction, influences);
    return influences;
  }

  private calculate(
    position: Vec2,
    response: number,
    tags: readonly string[],
    globalDirection: Vec2,
    influences?: Set<number>,
  ): Vec2 {
    if (this.dirty) {
      this.index.clear();
      for (const field of this.fields.values())
        this.index.insert(field, field.position, field.radius);
      this.dirty = false;
    }
    const result = scale(globalDirection, this.strength);
    let attenuation = 1;
    let zeroFields = 0;
    const contributions: { id: number; x: number; y: number; attenuation: number }[] | undefined =
      influences ? [] : undefined;
    const nearby = this.index.at(position);
    if (nearby)
      for (const field of nearby) {
        if (field.affects && !field.affects.some((tag) => tags.includes(tag))) continue;
        const toward = subtract(field.position, position);
        const distance = Math.hypot(toward.x, toward.y);
        if (distance > field.radius) continue;
        let direction = field.mode === 'directional' ? field.direction : normalize(toward);
        if (field.mode === 'vortex') direction = { x: -direction.y, y: direction.x };
        const falloff =
          field.falloff === 'linear'
            ? 1 - distance / field.radius
            : field.falloff === 'inverseSquare'
              ? 1 / (1 + (distance / (field.radius * 0.2)) ** 2)
              : 1;
        const factor =
          field.mode === 'zero' ? 1 - Math.min(1, Math.abs(field.strength) * falloff) : 1;
        if (factor === 0) zeroFields++;
        else attenuation *= factor;
        const x = field.mode === 'zero' ? 0 : direction.x * field.strength * falloff;
        const y = field.mode === 'zero' ? 0 : direction.y * field.strength * falloff;
        result.x += x;
        result.y += y;
        contributions?.push({ id: field.id, x, y, attenuation: factor });
      }
    const acceleration = clampVector(
      scale(result, zeroFields ? 0 : response * attenuation),
      this.maxAcceleration,
    );
    if (influences && contributions)
      for (const contribution of contributions) {
        const remainingZeros = zeroFields - Number(contribution.attenuation === 0);
        const without = clampVector(
          scale(
            { x: result.x - contribution.x, y: result.y - contribution.y },
            remainingZeros ? 0 : (response * attenuation) / (contribution.attenuation || 1),
          ),
          this.maxAcceleration,
        );
        if (Math.hypot(without.x - acceleration.x, without.y - acceleration.y) >= 1e-8)
          influences.add(contribution.id);
      }
    return acceleration;
  }

  clear(): void {
    this.fields.clear();
    this.index.clear();
    this.dirty = false;
  }
}
