import Matter from 'matter-js';
import { abilityById } from '../content/abilities';
import type { EventBus } from '../core/events';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import balance from '../data/balance.json';
import { entityDefinitions } from '../content/enemies';
import type { GravityField, GravitySystem } from '../physics/gravity';
import type { Entity, PhysicsWorld } from '../physics/world';
import { ModifierSet, type ModifierContext } from '../progression/modifiers';

export interface AbilityHost {
  world: PhysicsWorld;
  gravity: GravitySystem;
  player: Entity;
  time: number;
  readonly directionLocked: boolean;
  readonly difficulty: number;
  readonly room: { width: number; height: number };
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
  velocity?: Vec2;
  collapse?: {
    radius: number;
    position: Vec2;
    multiplier: number;
    damageType: string;
    affects?: string[];
  };
}
interface Status {
  entity: Entity;
  generation: number;
  until: number;
  kind: 'lock' | 'theft' | 'transfer';
  factor?: string;
}
export interface AbilitySnapshot {
  levels: Record<string, number>;
  energy: number;
  stored: number;
  cooldowns: Record<string, number>;
}

export class AbilitySystem {
  readonly modifiers = new ModifierSet(() => this.context());
  readonly levels = new Map<string, number>([['pulse', 1]]);
  readonly cooldowns = new Map<string, number>();
  energy = 100;
  stored = 0;
  private readonly bindings: Binding[] = [];
  private readonly statuses: Status[] = [];
  private readonly resistance = new Map<number, { until: number; generation: number }>();
  private readonly constructs: { entity: Entity; expires: number }[] = [];
  private rotation?: { original: Vec2; start: number; duration: number; chain: number };

  constructor(private readonly host: AbilityHost) {}
  context(): ModifierContext {
    const { player, world } = this.host;
    // Resource ceilings are unconditional: no recursive or self-changing thresholds.
    const maxHealth = this.modifiers.evaluate('maxHealth', player.definition.health, [], {});
    const maxEnergy = this.modifiers.evaluate('maxEnergy', 100, [], {});
    let nearbyEnemies = 0;
    const radius = balance.abilities.conditionRadius;
    for (const entity of world.entities.values())
      if (
        entity.alive &&
        entity.definition.faction === 'enemy' &&
        entity.kind !== 'projectile' &&
        length(subtract(entity.body.position, player.body.position)) <= radius
      )
        nearbyEnemies++;
    return {
      healthRatio: Math.max(0, Math.min(1, player.health / maxHealth)),
      energyRatio: Math.max(0, Math.min(1, this.energy / maxEnergy)),
      speed: length(Matter.Body.getVelocity(player.body)),
      nearbyEnemies,
      stored: this.stored,
    };
  }
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
        this.host.events.emit('abilityUpgraded', {
          id: definition.evolution,
          level: 1,
          previousLevel: 0,
          evolvedFrom: id,
        });
        return definition.evolution;
      }
      return null;
    }
    this.levels.set(id, current + 1);
    this.host.events.emit('abilityUpgraded', { id, level: current + 1, previousLevel: current });
    return id;
  }

  cast(id: string, target: Vec2, repeated = false): boolean {
    const definition = abilityById.get(id);
    const level = this.levels.get(id);
    if (
      !definition ||
      !level ||
      (this.host.directionLocked && ['reverse', 'rotate'].includes(definition.effect)) ||
      (!repeated && (this.cooldowns.get(id) ?? 0) > 0) ||
      !Number.isFinite(target.x + target.y)
    )
      return false;
    const context = this.context();
    const cost = Math.max(
      0,
      this.modifiers.evaluate('energyCost', definition.energy, definition.tags, context),
    );
    const tuning = balance.abilities;
    const parameters = definition.parameters ?? {};
    const planets = definition.effect === 'planet' ? (parameters.planetCount ?? 1) : 0;
    const bodies = planets + Number(definition.effect === 'deploy');
    const fieldSlots = planets
      ? planets * 2
      : ['field', 'collapse', 'reflect', 'deploy'].includes(definition.effect)
        ? 1
        : 0;
    if (
      (!repeated && cost > this.energy) ||
      this.host.gravity.fields.size + fieldSlots > balance.physics.maxFields ||
      this.host.world.entities.size + bodies > balance.physics.maxBodies
    )
      return false;
    const point =
      definition.target === 'player' ? { ...this.host.player.body.position } : { ...target };
    const placements = Array.from({ length: bodies }, (_, index) => ({
      x: point.x + (planets ? (index - (planets - 1) / 2) * tuning.planetOffset * 2 : 0),
      y: point.y,
    }));
    const bodyRadius = entityDefinitions[planets ? 'rock' : 'gravity_machine'].radius;
    if (
      placements.some(
        (position) =>
          position.x < bodyRadius ||
          position.y < bodyRadius ||
          position.x > this.host.room.width - bodyRadius ||
          position.y > this.host.room.height - bodyRadius ||
          !this.host.world.circleClear(position, bodyRadius),
      )
    )
      return false;
    const factor = 1 + (level - 1) * tuning.levelStrength;
    const radius = this.modifiers.evaluate(
      'radius',
      definition.radius * Math.sqrt(factor),
      definition.tags,
      context,
    );
    const strength = this.modifiers.evaluate(
      'strength',
      definition.strength * factor,
      definition.tags,
      context,
    );
    const duration = this.modifiers.evaluate(
      'duration',
      definition.duration,
      definition.tags,
      context,
    );
    const targets = this.near(point, radius, parameters.affects);
    const victim =
      definition.effect === 'theft'
        ? targets.find(
            (entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile',
          )
        : undefined;
    if (
      definition.effect === 'theft' &&
      (!victim ||
        this.statuses.some((status) => status.entity === victim && status.kind === 'theft'))
    )
      return false;
    const transferable = ['transfer', 'chain'].includes(definition.effect)
      ? targets
          .filter(
            (entity) =>
              !entity.body.isStatic &&
              Math.abs(entity.gravityScale * entity.definition.gravityResponse) > 0.0001 &&
              ![...entity.gravityFactors.keys()].some((key) => key.startsWith('transfer:')),
          )
          .slice(
            0,
            definition.effect === 'transfer' ? 2 : (parameters.chainTargets ?? tuning.chainTargets),
          )
      : [];
    if (['transfer', 'chain'].includes(definition.effect) && transferable.length < 2) return false;
    const chain = this.host.createCause(id);
    const transferResponse = (entity: Entity, response: number): void => {
      const factor = `transfer:${chain}`;
      entity.gravityFactors.set(
        factor,
        response / (entity.gravityScale * entity.definition.gravityResponse),
      );
      this.statuses.push({
        entity,
        generation: entity.generation,
        kind: 'transfer',
        factor,
        until: this.host.time + duration,
      });
      this.host.markCause(entity, chain);
      if (entity.kind === 'projectile') entity.redirected = true;
    };
    const impulse = (entity: Entity, direction: Vec2, power: number): void => {
      if (entity.body.isStatic) return;
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
        falloff: parameters.falloff ?? (mode === 'zero' ? 'constant' : 'linear'),
        affects: parameters.affects,
        remaining: duration,
      });
      this.bindings.push({
        field: fieldId,
        entity: follow,
        chain,
        expires: this.host.time + duration,
        velocity:
          parameters.travelSpeed === undefined
            ? undefined
            : scale(
                normalize(subtract(target, this.host.player.body.position)),
                parameters.travelSpeed,
              ),
      });
      return fieldId;
    };
    switch (definition.effect) {
      case 'field':
        field(
          definition.mode!,
          point,
          strength,
          definition.target === 'player' && parameters.travelSpeed === undefined
            ? this.host.player
            : undefined,
        );
        break;
      case 'impulse':
      case 'burst': {
        const extra = definition.effect === 'burst' ? this.stored * tuning.burstStoredRatio : 0;
        for (const entity of targets) {
          if (parameters.momentumScale !== undefined && !entity.body.isStatic)
            Matter.Body.setVelocity(
              entity.body,
              scale(Matter.Body.getVelocity(entity.body), parameters.momentumScale),
            );
          impulse(
            entity,
            normalize(subtract(entity.body.position, point)),
            (strength + extra) *
              (1 -
                length(subtract(entity.body.position, point)) /
                  (radius * tuning.impulseFalloffRadius)),
          );
        }
        if (definition.effect === 'burst') this.stored = 0;
        break;
      }
      case 'lock':
        for (const entity of targets) {
          const resistance = this.resistance.get(entity.id);
          if (
            (resistance?.generation === entity.generation && resistance.until > this.host.time) ||
            entity.body.isStatic
          )
            continue;
          this.statuses.push({
            entity,
            generation: entity.generation,
            until: this.host.time + duration,
            kind: 'lock',
          });
          Matter.Body.setStatic(entity.body, true);
          this.host.markCause(entity, chain);
        }
        break;
      case 'dash': {
        this.host.markCause(this.host.player, chain);
        const sourceBonus = [...this.host.gravity.fields.values()].some(
          (source) => length(subtract(source.position, this.host.player.body.position)) < radius,
        )
          ? tuning.dashSourceMultiplier
          : 1;
        this.host.world.impulse(
          this.host.player,
          scale(
            normalize(subtract(target, this.host.player.body.position)),
            strength * sourceBonus,
          ),
        );
        this.host.player.invulnerability = Math.max(
          this.host.player.invulnerability,
          tuning.dashInvulnerability,
        );
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
          generation: victim.generation,
          until: this.host.time + duration,
          kind: 'theft',
        });
        victim.gravityFactors.set(
          'theft',
          Math.max(
            tuning.theftMinimumResponse,
            definition.strength ** (strength / definition.strength),
          ),
        );
        this.stored = Math.min(
          tuning.storedMaximum,
          this.stored + victim.body.mass * tuning.theftMassCharge,
        );
        this.host.markCause(victim, chain);
        break;
      }
      case 'transfer': {
        const [a, b] = transferable;
        const aResponse = a.gravityScale * a.definition.gravityResponse;
        const bResponse = b.gravityScale * b.definition.gravityResponse;
        transferResponse(a, bResponse);
        transferResponse(b, aResponse);
        const velocity = Matter.Body.getVelocity(a.body);
        Matter.Body.setVelocity(a.body, Matter.Body.getVelocity(b.body));
        Matter.Body.setVelocity(b.body, velocity);
        break;
      }
      case 'beam': {
        const direction = normalize(subtract(target, this.host.player.body.position));
        for (const entity of this.host.world.entities.values()) {
          if (
            entity.kind === 'player' ||
            (parameters.affects &&
              !parameters.affects.some(
                (tag) => tag === entity.definition.material || entity.definition.tags.includes(tag),
              ))
          )
            continue;
          const delta = subtract(entity.body.position, this.host.player.body.position);
          const forward = delta.x * direction.x + delta.y * direction.y;
          const sideways = Math.abs(delta.x * direction.y - delta.y * direction.x);
          if (
            forward > 0 &&
            forward < radius &&
            sideways < tuning.beamWidth + entity.definition.radius
          )
            impulse(entity, direction, strength);
        }
        break;
      }
      case 'collapse': {
        field('radial', point, strength);
        this.bindings[this.bindings.length - 1].collapse = {
          radius: radius * tuning.collapseRadiusRatio,
          position: point,
          multiplier: parameters.collapseMultiplier ?? 1,
          damageType: parameters.collapseDamageType ?? 'Compression',
          affects: parameters.affects,
        };
        break;
      }
      case 'planet': {
        const count = planets;
        for (let index = 0; index < count; index++) {
          const planet = this.host.world.spawn('rock', placements[index]);
          if (!planet) continue;
          planet.gravityScale = tuning.planetGravityScale;
          this.host.markCause(planet, chain);
          this.constructs.push({ entity: planet, expires: this.host.time + duration });
          this.host.world.impulse(planet, { x: 0, y: (index % 2 ? -1 : 1) * tuning.planetImpulse });
          field('radial', planet.body.position, strength, planet);
          field('vortex', planet.body.position, strength * tuning.planetVortexRatio, planet);
        }
        break;
      }
      case 'deploy': {
        const machine = this.host.world.spawn('gravity_machine', point)!;
        this.host.markCause(machine, chain);
        this.constructs.push({ entity: machine, expires: this.host.time + duration });
        field(definition.mode!, machine.body.position, strength, machine);
        break;
      }
      case 'chain': {
        let source = { ...this.host.player.body.position };
        const responses = transferable.map(
          (entity) => entity.gravityScale * entity.definition.gravityResponse,
        );
        for (const [index, entity] of transferable.entries()) {
          transferResponse(entity, responses[(index + responses.length - 1) % responses.length]);
          impulse(
            entity,
            normalize(subtract(entity.body.position, source)),
            strength * Math.max(0, 1 - index * tuning.chainFalloff),
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
          if (
            entity.kind === 'projectile' &&
            !entity.body.isStatic &&
            entity.definition.gravityResponse * entity.gravityScale !== 0
          ) {
            entity.redirected = true;
            this.host.markCause(entity, chain);
          }
        break;
    }
    if (!repeated) this.energy -= cost;
    if (!repeated)
      this.cooldowns.set(
        id,
        Math.max(
          0.25,
          this.modifiers.evaluate('cooldown', definition.cooldown, definition.tags, context),
        ),
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
    this.modifiers.tick(this.host.time);
    this.energy = Math.min(
      this.maxEnergy,
      this.energy + this.modifiers.evaluate('energyRegen', balance.abilities.energyRegen) * dt,
    );
    for (const [id, remaining] of this.cooldowns)
      this.cooldowns.set(id, Math.max(0, remaining - dt));
    for (let index = this.statuses.length - 1; index >= 0; index--) {
      const status = this.statuses[index];
      if (status.generation !== status.entity.generation) {
        this.statuses.splice(index, 1);
        continue;
      }
      if (status.until > this.host.time && status.entity.alive) continue;
      if (status.kind === 'lock') {
        Matter.Body.setStatic(status.entity.body, false);
        this.resistance.set(status.entity.id, {
          until: this.host.time + balance.abilities.lockResistance,
          generation: status.generation,
        });
      } else status.entity.gravityFactors.delete(status.factor ?? 'theft');
      this.statuses.splice(index, 1);
    }
    for (let index = this.bindings.length - 1; index >= 0; index--) {
      const binding = this.bindings[index];
      if (binding.expires <= this.host.time || (binding.entity && !binding.entity.alive)) {
        if (binding.collapse) {
          const targets = this.near(
            binding.collapse.position,
            binding.collapse.radius,
            binding.collapse.affects,
          );
          for (const entity of targets)
            this.host.applyDamage(
              entity,
              targets.length *
                Math.sqrt(entity.body.mass) *
                balance.abilities.collapseDamage *
                binding.collapse.multiplier,
              binding.chain,
              binding.collapse.damageType,
            );
        }
        this.host.gravity.removeField(binding.field);
        this.bindings.splice(index, 1);
        continue;
      }
      if (binding.entity) this.host.gravity.moveField(binding.field, binding.entity.body.position);
      const field = this.host.gravity.fields.get(binding.field);
      if (field && binding.velocity)
        this.host.gravity.moveField(binding.field, {
          x: field.position.x + binding.velocity.x * dt,
          y: field.position.y + binding.velocity.y * dt,
        });
      if (field)
        for (const entity of this.near(field.position, field.radius, field.affects)) {
          if (entity.body.isStatic || entity.definition.gravityResponse * entity.gravityScale === 0)
            continue;
          this.host.markCause(entity, binding.chain);
          if (entity.kind === 'projectile') entity.redirected = true;
        }
    }
    for (let index = this.constructs.length - 1; index >= 0; index--)
      if (
        this.constructs[index].expires <= this.host.time ||
        !this.constructs[index].entity.alive
      ) {
        this.host.world.remove(this.constructs[index].entity);
        this.constructs.splice(index, 1);
      }
    if (this.rotation) {
      const progress = Math.min(1, (this.host.time - this.rotation.start) / this.rotation.duration);
      const angle = progress * Math.PI * 2;
      const original = this.rotation.original;
      const previous = this.host.gravity.direction;
      this.host.gravity.setDirection({
        x: original.x * Math.cos(angle) - original.y * Math.sin(angle),
        y: original.x * Math.sin(angle) + original.y * Math.cos(angle),
      });
      for (const entity of this.host.world.entities.values())
        if (!entity.body.isStatic) {
          const response = entity.definition.gravityResponse * entity.gravityScale;
          const tags = [entity.definition.material, ...entity.definition.tags];
          const before = this.host.gravity.sample(entity.body.position, response, tags, previous);
          const after = this.host.gravity.sample(entity.body.position, response, tags);
          if (length(subtract(after, before)) < 1e-8) continue;
          this.host.markCause(entity, this.rotation.chain);
        }
      if (progress === 1) {
        this.host.gravity.setDirection(original);
        this.rotation = undefined;
      }
    }
    for (const [id, expiry] of this.resistance)
      if (
        expiry.until < this.host.time ||
        this.host.world.entities.get(id)?.generation !== expiry.generation
      )
        this.resistance.delete(id);
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
        this.levels.set(
          id,
          Math.max(1, Math.min(abilityById.get(id)!.maxLevel, Math.floor(level))),
        );
    this.energy = Math.max(0, Math.min(this.maxEnergy, snapshot.energy));
    this.stored = Math.max(0, Math.min(100, snapshot.stored));
    for (const [id, cooldown] of Object.entries(snapshot.cooldowns))
      if (abilityById.has(id) && Number.isFinite(cooldown))
        this.cooldowns.set(id, Math.max(0, cooldown));
  }

  private near(position: Vec2, radius: number, affects?: string[]): Entity[] {
    return [...this.host.world.entities.values()]
      .filter(
        (entity) =>
          entity.kind !== 'player' &&
          entity.alive &&
          (!affects ||
            affects.some(
              (tag) => tag === entity.definition.material || entity.definition.tags.includes(tag),
            )) &&
          length(subtract(entity.body.position, position)) < radius,
      )
      .sort(
        (a, b) =>
          length(subtract(a.body.position, position)) - length(subtract(b.body.position, position)),
      );
  }
}
