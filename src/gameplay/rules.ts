import Matter from 'matter-js';
import type { AbilityHost } from './abilities';
import type { Contract, Phenomenon } from '../content/phenomena';
import { Random } from '../core/random';
import type { GravityField } from '../physics/gravity';
import type { Entity } from '../physics/world';
import type { Vec2 } from '../core/vector';
import tuning from '../data/anomalies.json';
import balance from '../data/balance.json';

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
    if (this.host.gravity.fields.size >= balance.physics.maxFields - tuning.fieldReserve) return;
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
            (this.phenomenon === 'dense' ? tuning.denseMass : 1) *
            (this.contract === 'heavy' && entity.definition.faction === 'enemy'
              ? tuning.heavyContractMass
              : 1);
          if (mass !== 1)
            Matter.Body.setMass(entity.body, Math.min(tuning.maxMass, entity.body.mass * mass));
        }
        if (this.phenomenon === 'elastic') entity.body.restitution = tuning.elasticity;
        if (entity.definition.faction === 'enemy' && entity.kind !== 'projectile') {
          entity.health *= 1 + this.difficulty * tuning.difficultyHealth;
          entity.maxHealth = entity.health;
        }
      }
    if (!this.initialized) {
      if (this.phenomenon === 'reverse') this.host.gravity.setDirection({ x: 0, y: -1 });
      const initial =
        tuning.initialFields[this.phenomenon as keyof typeof tuning.initialFields] ?? [];
      for (const field of initial)
        this.field(
          field.mode as GravityField['mode'],
          field.position,
          field.strength,
          field.radius,
          field.duration,
          field.direction,
        );
      if (this.phenomenon === 'collision')
        for (const [index, position] of tuning.planets.positions.entries()) {
          const entity = this.host.world.spawn('rock', position);
          if (!entity) continue;
          Matter.Body.setMass(entity.body, tuning.planets.mass);
          entity.gravityScale = tuning.planets.response;
          this.host.world.impulse(entity, { x: (index % 2 ? -1 : 1) * tuning.planets.speed, y: 0 });
          const field = this.field(
            'radial',
            entity.body.position,
            tuning.planets.strength,
            tuning.planets.radius,
            tuning.planets.duration,
          );
          if (field) this.planets.push({ entity, field });
        }
      this.initialized = true;
    }
    for (const planet of this.planets)
      if (planet.entity.alive)
        this.host.gravity.moveField(planet.field, planet.entity.body.position);
    if (this.phenomenon === 'rotating')
      this.host.gravity.setDirection({
        x: Math.sin(this.host.time * tuning.rotationSpeed),
        y: Math.cos(this.host.time * tuning.rotationSpeed),
      });
    if (this.contract === 'unstable')
      this.host.gravity.strength =
        tuning.unstable.baseStrength +
        (Math.floor(this.host.time / tuning.unstable.interval) % tuning.unstable.stages) *
          tuning.unstable.stepStrength;
    if (this.host.time < this.next) return;
    this.next = this.host.time + tuning.interval;
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
      this.field(
        'radial',
        tuning.singularity.position,
        tuning.singularity.strength,
        tuning.singularity.radius,
        tuning.singularity.duration,
      );
    if (this.phenomenon === 'rain')
      this.field(
        'radial',
        {
          x: tuning.rain.minX + this.random.next() * tuning.rain.width,
          y: tuning.rain.minY + this.random.next() * tuning.rain.height,
        },
        tuning.rain.strength,
        tuning.rain.radius,
        tuning.rain.duration,
      );
  }
  impact(position: Vec2): void {
    if (this.contract !== 'pulse' || this.nextPulse > this.host.time) return;
    this.nextPulse = this.host.time + tuning.pulse.cooldown;
    this.field(
      'radial',
      position,
      tuning.pulse.strength,
      tuning.pulse.radius,
      tuning.pulse.duration,
    );
  }
}
