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

  sample(position: Vec2, response = 1): Vec2 {
    if (this.dirty) {
      this.index.clear();
      for (const field of this.fields.values())
        this.index.insert(field, field.position, field.radius);
      this.dirty = false;
    }
    const result = scale(this.direction, this.strength);
    let attenuation = 1;
    const nearby = this.index.at(position);
    if (nearby)
      for (const field of nearby) {
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
        if (field.mode === 'zero')
          attenuation *= 1 - Math.min(1, Math.abs(field.strength) * falloff);
        else {
          result.x += direction.x * field.strength * falloff;
          result.y += direction.y * field.strength * falloff;
        }
      }
    return clampVector(scale(result, response * attenuation), this.maxAcceleration);
  }

  clear(): void {
    this.fields.clear();
    this.index.clear();
    this.dirty = false;
  }
}
