import Matter from 'matter-js';
import type { AbilityHost } from './abilities';
import type { Contract, Phenomenon } from '../content/phenomena';
import { Random } from '../core/random';
import type { GravityField } from '../physics/gravity';
import type { Entity } from '../physics/world';
import type { Vec2 } from '../core/vector';

export class RuleSystem {
  phenomenon: Phenomenon | '' = '';
  contract: Contract = 'none';
  difficulty = 0;
  private random = new Random('rules');
  private initialized = false;
  private next = 0;
  private nextPulse = 0;
  private readonly seen = new Set<number>();
  private readonly planets: { entity: Entity; field: number }[] = [];
  constructor(private readonly host: AbilityHost) {}
  get directionLocked(): boolean {
    return this.contract === 'locked';
  }
  configure(
    seed: string,
    phenomenon: Phenomenon | '',
    contract: Contract,
    difficulty: number,
  ): void {
    this.random = new Random(`${seed}:rules`);
    this.phenomenon = phenomenon;
    this.contract = contract;
    this.difficulty = difficulty;
  }
  private field(
    mode: GravityField['mode'],
    position: Vec2,
    strength: number,
    radius: number,
    remaining: number,
    direction = { x: 0, y: 1 },
  ): number | undefined {
    if (this.host.gravity.fields.size >= 48) return;
    return this.host.gravity.addField({
      source: 'phenomenon',
      mode,
      position,
      direction,
      strength,
      radius,
      remaining,
      falloff: mode === 'zero' ? 'constant' : 'linear',
    });
  }
  tick(): void {
    for (const entity of this.host.world.entities.values())
      if (!this.seen.has(entity.id)) {
        this.seen.add(entity.id);
        if (!entity.body.isStatic && entity.kind !== 'player') {
          const mass =
            (this.phenomenon === 'dense' ? 10 : 1) *
            (this.contract === 'heavy' && entity.definition.faction === 'enemy' ? 5 : 1);
          if (mass !== 1) Matter.Body.setMass(entity.body, Math.min(500, entity.body.mass * mass));
        }
        if (this.phenomenon === 'elastic') entity.body.restitution = 0.98;
        if (entity.definition.faction === 'enemy' && entity.kind !== 'projectile') {
          entity.health *= 1 + this.difficulty * 0.12;
          entity.maxHealth = entity.health;
        }
      }
    if (!this.initialized) {
      if (this.phenomenon === 'reverse') this.host.gravity.setDirection({ x: 0, y: -1 });
      if (this.phenomenon === 'zero') this.field('zero', { x: 600, y: 400 }, 1, 350, 36000);
      if (this.phenomenon === 'collapse')
        this.field('vortex', { x: 600, y: 400 }, 0.006, 450, 36000);
      if (this.phenomenon === 'rift') {
        this.field('directional', { x: 400, y: 400 }, 0.004, 280, 36000, { x: 0, y: -1 });
        this.field('directional', { x: 800, y: 400 }, 0.004, 280, 36000, { x: 0, y: 1 });
      }
      if (this.phenomenon === 'collision')
        for (const x of [350, 850]) {
          const entity = this.host.world.spawn('rock', { x, y: 400 });
          if (!entity) continue;
          Matter.Body.setMass(entity.body, 35);
          entity.gravityScale = 0.1;
          this.host.world.impulse(entity, { x: x < 600 ? 2 : -2, y: 0 });
          const field = this.field('radial', entity.body.position, 0.006, 260, 36000);
          if (field) this.planets.push({ entity, field });
        }
      this.initialized = true;
    }
    for (const planet of this.planets)
      if (planet.entity.alive)
        this.host.gravity.moveField(planet.field, planet.entity.body.position);
    if (this.phenomenon === 'rotating')
      this.host.gravity.setDirection({
        x: Math.sin(this.host.time * 0.6),
        y: Math.cos(this.host.time * 0.6),
      });
    if (this.contract === 'unstable')
      this.host.gravity.strength = 0.0007 + (Math.floor(this.host.time / 10) % 3) * 0.00055;
    if (this.host.time < this.next) return;
    this.next = this.host.time + 2;
    if (this.phenomenon === 'storm')
      this.host.gravity.setDirection(
        this.random.pick([
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 0, y: -1 },
          { x: -1, y: 0 },
        ]),
      );
    if (this.phenomenon === 'singularity')
      this.field('radial', { x: 600, y: 400 }, 0.009, 350, 1.4);
    if (this.phenomenon === 'rain')
      this.field(
        'radial',
        { x: 180 + this.random.next() * 840, y: 140 + this.random.next() * 520 },
        -0.008,
        180,
        1.2,
      );
  }
  impact(position: Vec2): void {
    if (this.contract !== 'pulse' || this.nextPulse > this.host.time) return;
    this.nextPulse = this.host.time + 0.5;
    this.field('radial', position, -0.009, 180, 0.5);
  }
}
