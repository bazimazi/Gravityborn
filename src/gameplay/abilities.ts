import Matter from 'matter-js';
import { abilityById } from '../content/abilities';
import type { EventBus } from '../core/events';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import balance from '../data/balance.json';
import type { GravityField, GravitySystem } from '../physics/gravity';
import type { Entity, PhysicsWorld } from '../physics/world';
import { ModifierSet } from '../progression/modifiers';

export interface AbilityHost {
  world: PhysicsWorld;
  gravity: GravitySystem;
  player: Entity;
  time: number;
  events: EventBus;
  createCause(source?: string): number;
  markCause(entity: Entity, id: number, depth?: number): void;
  applyDamage(entity: Entity, amount: number, cause: number, type?: string): void;
  flip(direction: Vec2): boolean;
}
interface Binding {
  field: number;
  entity?: Entity;
  chain: number;
  expires: number;
  collapse?: { radius: number; position: Vec2; multiplier: number };
}
interface Status {
  entity: Entity;
  until: number;
  kind: 'lock' | 'theft';
  original: number;
}
export interface AbilitySnapshot {
  levels: Record<string, number>;
  energy: number;
  stored: number;
  cooldowns: Record<string, number>;
}

export class AbilitySystem {
  readonly modifiers = new ModifierSet();
  readonly levels = new Map<string, number>([['pulse', 1]]);
  readonly cooldowns = new Map<string, number>();
  energy = 100;
  stored = 0;
  private readonly bindings: Binding[] = [];
  private readonly statuses: Status[] = [];
  private readonly resistance = new Map<number, number>();
  private readonly planets: { entity: Entity; expires: number }[] = [];
  private rotation?: { original: Vec2; start: number; duration: number; chain: number };

  constructor(private readonly host: AbilityHost) {}
  get maxEnergy(): number {
    return this.modifiers.evaluate('maxEnergy', 100);
  }
  learn(id: string): string | null {
    const definition = abilityById.get(id);
    if (!definition) return null;
    const current = this.levels.get(id) ?? 0;
    if (current >= definition.maxLevel) {
      if (definition.evolution && !this.levels.has(definition.evolution)) {
        this.levels.set(definition.evolution, 1);
        return definition.evolution;
      }
      return null;
    }
    this.levels.set(id, current + 1);
    return id;
  }

  cast(id: string, target: Vec2, repeated = false): boolean {
    const definition = abilityById.get(id);
    const level = this.levels.get(id);
    if (
      !definition ||
      !level ||
      (!repeated && (this.cooldowns.get(id) ?? 0) > 0) ||
      !Number.isFinite(target.x + target.y)
    )
      return false;
    const cost = Math.max(
      0,
      this.modifiers.evaluate('energyCost', definition.energy, definition.tags),
    );
    if (
      (!repeated && cost > this.energy) ||
      this.host.gravity.fields.size > balance.physics.maxFields - 4
    )
      return false;
    const point =
      definition.target === 'player' ? { ...this.host.player.body.position } : { ...target };
    const factor = 1 + (level - 1) * 0.25;
    const radius = this.modifiers.evaluate(
      'radius',
      definition.radius * Math.sqrt(factor),
      definition.tags,
    );
    const strength = this.modifiers.evaluate(
      'strength',
      definition.strength * factor,
      definition.tags,
    );
    const duration = this.modifiers.evaluate('duration', definition.duration, definition.tags);
    const chain = this.host.createCause(id);
    const targets = this.near(point, radius);
    const impulse = (entity: Entity, direction: Vec2, power: number): void => {
      this.host.markCause(entity, chain);
      if (entity.kind === 'projectile') entity.redirected = true;
      this.host.world.impulse(entity, scale(direction, power / Math.sqrt(entity.body.mass)));
    };
    const field = (
      mode: GravityField['mode'],
      center: Vec2,
      power: number,
      follow?: Entity,
    ): number => {
      const fieldId = this.host.gravity.addField({
        source: `ability:${id}`,
        mode,
        direction: normalize(subtract(target, this.host.player.body.position)),
        position: center,
        strength: power,
        radius,
        falloff: mode === 'zero' ? 'constant' : 'linear',
        remaining: duration,
      });
      this.bindings.push({
        field: fieldId,
        entity: follow,
        chain,
        expires: this.host.time + duration,
      });
      return fieldId;
    };
    switch (definition.effect) {
      case 'field':
        field(
          definition.mode!,
          point,
          strength,
          definition.target === 'player' ? this.host.player : undefined,
        );
        break;
      case 'impulse':
      case 'burst': {
        const extra = definition.effect === 'burst' ? this.stored * 0.12 : 0;
        for (const entity of targets) {
          if (id === 'nova')
            Matter.Body.setVelocity(entity.body, scale(entity.body.velocity, -0.5));
          impulse(
            entity,
            normalize(subtract(entity.body.position, point)),
            (strength + extra) *
              (1 - length(subtract(entity.body.position, point)) / (radius * 1.3)),
          );
        }
        if (definition.effect === 'burst') this.stored = 0;
        break;
      }
      case 'lock':
        for (const entity of targets) {
          if ((this.resistance.get(entity.id) ?? 0) > this.host.time || entity.body.isStatic)
            continue;
          this.statuses.push({
            entity,
            until: this.host.time + duration,
            kind: 'lock',
            original: 0,
          });
          Matter.Body.setStatic(entity.body, true);
          this.host.markCause(entity, chain);
        }
        break;
      case 'dash': {
        const sourceBonus = [...this.host.gravity.fields.values()].some(
          (source) => length(subtract(source.position, this.host.player.body.position)) < radius,
        )
          ? 1.4
          : 1;
        this.host.world.impulse(
          this.host.player,
          scale(
            normalize(subtract(target, this.host.player.body.position)),
            strength * sourceBonus,
          ),
        );
        this.host.player.invulnerability = Math.max(this.host.player.invulnerability, 0.2);
        break;
      }
      case 'theft': {
        const victim = targets.find(
          (entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile',
        );
        if (
          !victim ||
          this.statuses.some((status) => status.entity === victim && status.kind === 'theft')
        )
          return false;
        this.statuses.push({
          entity: victim,
          until: this.host.time + duration,
          kind: 'theft',
          original: victim.gravityScale,
        });
        victim.gravityScale *= Math.max(
          0.02,
          definition.strength ** (strength / definition.strength),
        );
        this.stored = Math.min(100, this.stored + victim.body.mass * 8);
        this.host.markCause(victim, chain);
        break;
      }
      case 'transfer': {
        if (targets.length < 2) return false;
        const [a, b] = targets;
        const velocity = Matter.Body.getVelocity(a.body);
        Matter.Body.setVelocity(a.body, Matter.Body.getVelocity(b.body));
        Matter.Body.setVelocity(b.body, velocity);
        for (const entity of [a, b]) {
          this.host.markCause(entity, chain);
          if (entity.kind === 'projectile') entity.redirected = true;
        }
        break;
      }
      case 'beam': {
        const direction = normalize(subtract(target, this.host.player.body.position));
        for (const entity of this.host.world.entities.values()) {
          if (entity.kind === 'player') continue;
          const delta = subtract(entity.body.position, this.host.player.body.position);
          const forward = delta.x * direction.x + delta.y * direction.y;
          const sideways = Math.abs(delta.x * direction.y - delta.y * direction.x);
          if (forward > 0 && forward < radius && sideways < 32 + entity.definition.radius)
            impulse(entity, direction, strength);
        }
        break;
      }
      case 'collapse': {
        field('radial', point, strength);
        this.bindings[this.bindings.length - 1].collapse = {
          radius: radius * 0.38,
          position: point,
          multiplier: id === 'black_hole' ? 1.8 : 1,
        };
        break;
      }
      case 'planet': {
        const count = id === 'binary' ? 2 : 1;
        for (let index = 0; index < count; index++) {
          const planet = this.host.world.spawn('rock', {
            x: point.x + (count > 1 ? (index ? 45 : -45) : 0),
            y: point.y,
          });
          if (!planet) continue;
          planet.gravityScale = 0.1;
          this.host.markCause(planet, chain);
          this.planets.push({ entity: planet, expires: this.host.time + duration });
          this.host.world.impulse(planet, { x: 0, y: index ? -5 : 5 });
          field('radial', planet.body.position, strength, planet);
          field('vortex', planet.body.position, strength * 0.45, planet);
        }
        break;
      }
      case 'chain': {
        let source = { ...this.host.player.body.position };
        for (const [index, entity] of targets.slice(0, 5).entries()) {
          impulse(
            entity,
            normalize(subtract(entity.body.position, source)),
            strength * (1 - index * 0.12),
          );
          source = entity.body.position;
        }
        break;
      }
      case 'reverse':
        this.host.flip(scale(this.host.gravity.direction, -1));
        for (const entity of targets) impulse(entity, this.host.gravity.direction, strength);
        break;
      case 'rotate':
        this.rotation = {
          original: { ...this.host.gravity.direction },
          start: this.host.time,
          duration,
          chain,
        };
        break;
      case 'reflect':
        field('vortex', point, strength, this.host.player);
        for (const entity of targets)
          if (entity.kind === 'projectile') {
            entity.redirected = true;
            this.host.markCause(entity, chain);
          }
        break;
    }
    for (const entity of targets) this.host.markCause(entity, chain);
    if (!repeated) this.energy -= cost;
    if (!repeated)
      this.cooldowns.set(
        id,
        Math.max(0.25, this.modifiers.evaluate('cooldown', definition.cooldown, definition.tags)),
      );
    this.host.events.emit('abilityUsed', {
      id,
      tags: repeated ? [...definition.tags, 'Echo'] : definition.tags,
      position: point,
      level,
    });
    return true;
  }

  tick(dt: number): void {
    this.energy = Math.min(
      this.maxEnergy,
      this.energy + this.modifiers.evaluate('energyRegen', 8) * dt,
    );
    for (const [id, remaining] of this.cooldowns)
      this.cooldowns.set(id, Math.max(0, remaining - dt));
    for (let index = this.statuses.length - 1; index >= 0; index--) {
      const status = this.statuses[index];
      if (status.until > this.host.time && status.entity.alive) continue;
      if (status.kind === 'lock') {
        Matter.Body.setStatic(status.entity.body, false);
        this.resistance.set(status.entity.id, this.host.time + 4);
      } else status.entity.gravityScale = status.original;
      this.statuses.splice(index, 1);
    }
    for (let index = this.bindings.length - 1; index >= 0; index--) {
      const binding = this.bindings[index];
      if (binding.expires <= this.host.time || (binding.entity && !binding.entity.alive)) {
        if (binding.collapse) {
          const targets = this.near(binding.collapse.position, binding.collapse.radius);
          for (const entity of targets)
            this.host.applyDamage(
              entity,
              targets.length * Math.sqrt(entity.body.mass) * 12 * binding.collapse.multiplier,
              binding.chain,
              binding.collapse.multiplier > 1 ? 'Void' : 'Compression',
            );
        }
        this.host.gravity.removeField(binding.field);
        this.bindings.splice(index, 1);
        continue;
      }
      if (binding.entity) this.host.gravity.moveField(binding.field, binding.entity.body.position);
      const field = this.host.gravity.fields.get(binding.field);
      if (field)
        for (const entity of this.near(field.position, field.radius)) {
          this.host.markCause(entity, binding.chain);
          if (entity.kind === 'projectile') entity.redirected = true;
        }
    }
    for (let index = this.planets.length - 1; index >= 0; index--)
      if (this.planets[index].expires <= this.host.time) {
        this.host.world.remove(this.planets[index].entity);
        this.planets.splice(index, 1);
      }
    if (this.rotation) {
      const progress = Math.min(1, (this.host.time - this.rotation.start) / this.rotation.duration);
      const angle = progress * Math.PI * 2;
      const original = this.rotation.original;
      this.host.gravity.setDirection({
        x: original.x * Math.cos(angle) - original.y * Math.sin(angle),
        y: original.x * Math.sin(angle) + original.y * Math.cos(angle),
      });
      for (const entity of this.host.world.entities.values())
        this.host.markCause(entity, this.rotation.chain);
      if (progress === 1) {
        this.host.gravity.setDirection(original);
        this.rotation = undefined;
      }
    }
    for (const [id, expiry] of this.resistance)
      if (expiry < this.host.time) this.resistance.delete(id);
  }

  snapshot(): AbilitySnapshot {
    return {
      levels: Object.fromEntries(this.levels),
      energy: this.energy,
      stored: this.stored,
      cooldowns: Object.fromEntries(this.cooldowns),
    };
  }
  restore(snapshot: AbilitySnapshot): void {
    this.levels.clear();
    this.cooldowns.clear();
    for (const [id, level] of Object.entries(snapshot.levels))
      if (abilityById.has(id) && Number.isFinite(level))
        this.levels.set(id, Math.max(1, Math.min(3, Math.floor(level))));
    this.energy = Math.max(0, Math.min(this.maxEnergy, snapshot.energy));
    this.stored = Math.max(0, Math.min(100, snapshot.stored));
    for (const [id, cooldown] of Object.entries(snapshot.cooldowns))
      if (abilityById.has(id) && Number.isFinite(cooldown))
        this.cooldowns.set(id, Math.max(0, cooldown));
  }

  private near(position: Vec2, radius: number): Entity[] {
    return [...this.host.world.entities.values()]
      .filter(
        (entity) =>
          entity.kind !== 'player' &&
          entity.alive &&
          length(subtract(entity.body.position, position)) < radius,
      )
      .sort(
        (a, b) =>
          length(subtract(a.body.position, position)) - length(subtract(b.body.position, position)),
      );
  }
}
