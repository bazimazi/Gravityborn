import Matter from 'matter-js';
import { abilityById } from '../content/abilities';
import type { EventBus } from '../core/events';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import balance from '../data/balance.json';
import { entityDefinitions } from '../content/enemies';
import type { GravityField, GravitySystem } from '../physics/gravity';
import type { Entity, PhysicsWorld } from '../physics/world';
import { ModifierSet, type ModifierContext } from '../progression/modifiers';
import { fieldMotionAt, type FieldMotion } from './field-motion';
import type { SurfaceProperty } from '../core/surface';

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
  generation?: number;
  chain: number;
  expires: number;
  velocity?: Vec2;
  motion?: FieldMotion;
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
  kind: 'lock' | 'theft' | 'transfer' | 'response' | 'mass' | 'surface';
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
  private readonly constructs: { entity: Entity; expires: number; planet?: boolean }[] = [];
  readonly tethers: {
    body: Matter.Constraint;
    a: Entity;
    b?: Entity;
    anchor?: Vec2;
    start: number;
    startLength: number;
    endLength: number;
    generations: number[];
    expires: number;
    chain: number;
  }[] = [];
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
    if (
      definition.effect === 'steer' &&
      length(subtract(target, this.host.player.body.position)) < 1e-8
    )
      return false;
    const cost = Math.max(
      0,
      this.modifiers.evaluate('energyCost', definition.energy, definition.tags, context),
    );
    const tuning = balance.abilities;
    const parameters = { ...definition.parameters };
    for (const [key, stat] of [
      ['fieldOffset', 'fieldOffset'],
      ['orbitSpeed', 'fieldOrbitSpeed'],
      ['directionSpeed', 'fieldDirectionSpeed'],
      ['strengthPeriod', 'fieldPeriod'],
    ] as const)
      if (parameters[key] !== undefined)
        parameters[key] = this.modifiers.evaluate(stat, parameters[key]!, definition.tags, context);
    const planets = definition.effect === 'planet' ? (parameters.planetCount ?? 1) : 0;
    const bodies = planets + Number(definition.effect === 'deploy');
    const fieldSlots = planets
      ? planets * 2
      : definition.effect === 'field'
        ? (parameters.fieldCount ?? 1)
        : ['collapse', 'reflect', 'deploy'].includes(definition.effect)
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
      definition.effect === 'vector_turn'
        ? definition.strength
        : definition.effect === 'mass' && definition.strength < 1
          ? definition.strength / factor
          : definition.strength * factor,
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
    const attachment = parameters.attach
      ? targets.find((entity) => !entity.body.isStatic && !['xp', 'shard'].includes(entity.kind))
      : undefined;
    if (parameters.attach && !attachment) return false;
    const splitSource =
      definition.effect === 'split'
        ? this.constructs
            .filter(
              (construct) =>
                construct.planet &&
                construct.entity.alive &&
                !construct.entity.body.isStatic &&
                construct.expires > this.host.time &&
                targets.includes(construct.entity),
            )
            .sort(
              (a, b) =>
                length(subtract(a.entity.body.position, point)) -
                length(subtract(b.entity.body.position, point)),
            )[0]
        : undefined;
    const splitPositions = splitSource
      ? [-1, 1].map((sign) => ({
          x: splitSource.entity.body.position.x + sign * tuning.planetSplitOffset,
          y: splitSource.entity.body.position.y,
        }))
      : [];
    if (definition.effect === 'split') {
      const source = splitSource?.entity;
      const rawMass = source
        ? [...source.massFactors.values()].reduce((mass, factor) => mass * factor, source.massBase)
        : 0;
      const parentFields = this.bindings.filter(
        (binding) =>
          binding.entity === splitSource?.entity && this.host.gravity.fields.has(binding.field),
      ).length;
      const childRadius = entityDefinitions.fragment.radius;
      if (
        !splitSource ||
        source!.body.mass < 0.02 ||
        Math.abs(rawMass - source!.body.mass) > 1e-8 ||
        this.host.world.entities.size + 1 > balance.physics.maxBodies ||
        this.host.gravity.fields.size - parentFields + 4 > balance.physics.maxFields ||
        splitPositions.some(
          (position) =>
            position.x < childRadius ||
            position.y < childRadius ||
            position.x > this.host.room.width - childRadius ||
            position.y > this.host.room.height - childRadius ||
            !this.host.world.circleClear(position, childRadius),
        )
      )
        return false;
    }
    const responseTargets = ['response', 'mass', 'surface'].includes(definition.effect)
      ? (parameters.selfOnly ? [this.host.player] : targets).filter(
          (entity) => !entity.body.isStatic,
        )
      : [];
    if (['response', 'mass', 'surface'].includes(definition.effect) && !responseTargets.length)
      return false;
    const topology = parameters.tetherTopology ?? 'chain';
    if (definition.effect === 'tether') {
      if (parameters.tetherPlayer && this.host.player.body.isStatic) return false;
      parameters.chainTargets = Math.max(
        topology === 'anchor' ? 1 : topology === 'ring' ? 3 : 2,
        Math.floor(
          this.modifiers.evaluate(
            'tetherTargets',
            parameters.chainTargets ?? 2,
            definition.tags,
            context,
          ),
        ),
      );
      parameters.tetherLength = this.modifiers.evaluate(
        'tetherLength',
        parameters.tetherLength ?? 70,
        definition.tags,
        context,
      );
      if (parameters.tetherEndLength !== undefined)
        parameters.tetherEndLength = this.modifiers.evaluate(
          'tetherLength',
          parameters.tetherEndLength,
          definition.tags,
          context,
        );
      parameters.tetherDamping = this.modifiers.evaluate(
        'tetherDamping',
        parameters.tetherDamping ?? 0.05,
        definition.tags,
        context,
      );
    }
    const tetherTargets =
      definition.effect === 'tether'
        ? [
            ...(parameters.tetherPlayer && !this.host.player.body.isStatic
              ? [this.host.player]
              : []),
            ...targets.filter(
              (entity) => !entity.body.isStatic && entity.kind !== 'xp' && entity.kind !== 'shard',
            ),
          ].slice(0, parameters.chainTargets ?? 2)
        : [];
    const tetherPairs: { a: Entity; b?: Entity; anchor?: Vec2 }[] = [];
    if (definition.effect === 'tether') {
      if (topology === 'anchor') {
        if (
          point.x < 3 ||
          point.y < 3 ||
          point.x > this.host.room.width - 3 ||
          point.y > this.host.room.height - 3 ||
          !this.host.world.circleClear(point, 3) ||
          (parameters.tetherPlayer &&
            length(subtract(point, this.host.player.body.position)) > radius)
        )
          return false;
        for (const a of tetherTargets) tetherPairs.push({ a, anchor: { ...point } });
      } else {
        for (let i = 1; i < tetherTargets.length; i++)
          tetherPairs.push({
            a: tetherTargets[topology === 'star' ? 0 : i - 1],
            b: tetherTargets[i],
          });
        if (topology === 'ring' && tetherTargets.length >= 3)
          tetherPairs.push({ a: tetherTargets[tetherTargets.length - 1], b: tetherTargets[0] });
      }
    }
    if (
      definition.effect === 'tether' &&
      (tetherTargets.length < (topology === 'anchor' ? 1 : topology === 'ring' ? 3 : 2) ||
        this.tethers.length + tetherPairs.length > balance.physics.maxTethers)
    )
      return false;
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
    const impulse = (
      entity: Entity,
      direction: Vec2,
      power: number,
      momentumScale?: number,
    ): void => {
      if (entity.body.isStatic) return;
      const before = Matter.Body.getVelocity(entity.body);
      if (momentumScale !== undefined)
        Matter.Body.setVelocity(entity.body, scale(before, momentumScale));
      this.host.world.impulse(entity, scale(direction, power / Math.sqrt(entity.body.mass)));
      if (length(subtract(Matter.Body.getVelocity(entity.body), before)) >= 1e-8) {
        this.host.markCause(entity, chain);
        if (entity.kind === 'projectile') entity.redirected = true;
      }
    };
    const field = (
      mode: GravityField['mode'],
      center: Vec2,
      power: number,
      follow?: Entity,
      lifespan = duration,
      phase = 0,
    ): number => {
      const aim = normalize(subtract(target, this.host.player.body.position));
      const direction = length(aim) ? aim : { x: 1, y: 0 };
      const motion: FieldMotion | undefined =
        definition.effect === 'field' &&
        [
          parameters.fieldOffset,
          parameters.orbitSpeed,
          parameters.directionSpeed,
          parameters.radiusStart,
          parameters.radiusEnd,
          parameters.strengthPeriod,
          parameters.returning,
        ].some((value) => value !== undefined)
          ? {
              origin: { ...center },
              direction,
              radius,
              strength: power,
              start: this.host.time,
              duration: lifespan,
              phase,
              parameters,
            }
          : undefined;
      const initial = motion
        ? fieldMotionAt(motion, this.host.time, follow?.body.position)
        : undefined;
      const fieldId = this.host.gravity.addField({
        source: `ability:${id}`,
        mode,
        direction: initial?.direction ?? direction,
        position: initial?.position ?? center,
        strength: initial?.strength ?? power,
        radius: initial?.radius ?? radius,
        falloff: parameters.falloff ?? (mode === 'zero' ? 'constant' : 'linear'),
        affects: parameters.affects,
        remaining: lifespan,
      });
      this.bindings.push({
        field: fieldId,
        entity: follow,
        generation: follow?.generation,
        motion,
        chain,
        expires: this.host.time + lifespan,
        velocity:
          parameters.travelSpeed === undefined || motion
            ? undefined
            : scale(
                normalize(subtract(target, this.host.player.body.position)),
                parameters.travelSpeed,
              ),
      });
      return fieldId;
    };
    switch (definition.effect) {
      case 'split': {
        const parent = splitSource!.entity;
        const lifespan = Math.min(duration, splitSource!.expires - this.host.time);
        const velocity = Matter.Body.getVelocity(parent.body);
        const inheritedStatuses = this.statuses.filter(
          (status) =>
            status.entity === parent &&
            status.generation === parent.generation &&
            status.kind !== 'lock',
        );
        this.host.world.remove(parent);
        this.constructs.splice(this.constructs.indexOf(splitSource!), 1);
        for (let index = this.bindings.length - 1; index >= 0; index--)
          if (this.bindings[index].entity === parent) {
            this.host.gravity.removeField(this.bindings[index].field);
            this.bindings.splice(index, 1);
          }
        for (const [index, position] of splitPositions.entries()) {
          const child = this.host.world.spawn('fragment', position)!;
          child.gravityScale =
            (parent.gravityBase * parent.definition.gravityResponse) /
            child.definition.gravityResponse;
          child.gravityFactors = new Map(parent.gravityFactors);
          child.massFactors = new Map(parent.massFactors);
          child.surfaceBase = { ...parent.surfaceBase };
          child.surfaceOverrides = new Map(parent.surfaceOverrides);
          this.host.world.refreshSurface(child);
          this.host.world.setMass(child, parent.massBase / 2);
          for (const status of inheritedStatuses)
            this.statuses.push({ ...status, entity: child, generation: child.generation });
          Matter.Body.setVelocity(child.body, velocity);
          this.host.world.impulse(child, {
            x: ((index ? 1 : -1) * tuning.planetSplitImpulse) / Math.sqrt(child.body.mass),
            y: 0,
          });
          this.host.markCause(child, chain);
          this.constructs.push({ entity: child, expires: this.host.time + lifespan, planet: true });
          field('radial', child.body.position, strength, child, lifespan);
          field(
            'vortex',
            child.body.position,
            strength * tuning.planetVortexRatio,
            child,
            lifespan,
          );
        }
        break;
      }
      case 'surface': {
        const key = `surface:${id}`;
        const coating = { ...parameters.surface };
        for (const property of Object.keys(coating) as SurfaceProperty[])
          coating[property] = this.modifiers.evaluate(
            `surface_${property}`,
            coating[property]!,
            definition.tags,
            context,
          );
        for (const entity of responseTargets) {
          const previous = this.statuses.find(
            (status) =>
              status.entity === entity &&
              status.generation === entity.generation &&
              status.factor === key,
          );
          if (previous) previous.until = this.host.time + duration;
          else
            this.statuses.push({
              entity,
              generation: entity.generation,
              until: this.host.time + duration,
              kind: 'surface',
              factor: key,
            });
          const properties = Object.keys(coating) as SurfaceProperty[];
          const changed = properties.some(
            (property) => entity.body[property] !== coating[property],
          );
          // Refreshing a coating makes it the latest owner of only its authored properties.
          entity.surfaceOverrides.delete(key);
          entity.surfaceOverrides.set(key, coating);
          this.host.world.refreshSurface(entity);
          if (changed) this.host.markCause(entity, chain);
        }
        break;
      }
      case 'mass': {
        const key = `mass:${id}`;
        for (const entity of responseTargets) {
          const previous = this.statuses.find(
            (status) =>
              status.entity === entity &&
              status.generation === entity.generation &&
              status.factor === key,
          );
          if (previous) previous.until = this.host.time + duration;
          else
            this.statuses.push({
              entity,
              generation: entity.generation,
              until: this.host.time + duration,
              kind: 'mass',
              factor: key,
            });
          const before = entity.body.mass;
          entity.massFactors.set(key, Math.max(0.01, Math.min(8, strength)));
          this.host.world.refreshMass(entity);
          if (Math.abs(before - entity.body.mass) >= 1e-8) this.host.markCause(entity, chain);
        }
        break;
      }
      case 'orbit_impulse':
        for (const entity of targets) {
          const radial = normalize(subtract(entity.body.position, point));
          impulse(entity, { x: -radial.y, y: radial.x }, strength, parameters.momentumScale);
        }
        break;
      case 'vector_turn':
      case 'steer':
        for (const entity of targets) {
          if (entity.body.isStatic) continue;
          const before = Matter.Body.getVelocity(entity.body);
          const direction =
            definition.effect === 'steer'
              ? normalize(subtract(target, this.host.player.body.position))
              : undefined;
          const after = direction
            ? scale(direction, length(before))
            : {
                x: before.x * Math.cos(strength) - before.y * Math.sin(strength),
                y: before.x * Math.sin(strength) + before.y * Math.cos(strength),
              };
          if (length(subtract(after, before)) < 1e-8) continue;
          Matter.Sleeping.set(entity.body, false);
          Matter.Body.setVelocity(entity.body, after);
          this.host.markCause(entity, chain);
          if (entity.kind === 'projectile') entity.redirected = true;
        }
        break;
      case 'response': {
        const key = `response:${id}`;
        for (const entity of responseTargets) {
          const previous = this.statuses.find(
            (status) =>
              status.entity === entity &&
              status.generation === entity.generation &&
              status.factor === key,
          );
          if (previous) previous.until = this.host.time + duration;
          else
            this.statuses.push({
              entity,
              generation: entity.generation,
              until: this.host.time + duration,
              kind: 'response',
              factor: key,
            });
          const tags = [entity.definition.material, ...entity.definition.tags];
          const before = this.host.gravity.sample(
            entity.body.position,
            entity.definition.gravityResponse * entity.gravityScale,
            tags,
          );
          entity.gravityFactors.set(key, Math.max(-4, Math.min(4, strength)));
          const after = this.host.gravity.sample(
            entity.body.position,
            entity.definition.gravityResponse * entity.gravityScale,
            tags,
          );
          if (length(subtract(after, before)) >= 1e-8) {
            this.host.markCause(entity, chain);
            if (entity.kind === 'projectile') entity.redirected = true;
          }
        }
        break;
      }
      case 'tether':
        for (const { a, b, anchor } of tetherPairs) {
          const body = Matter.Constraint.create({
            bodyA: a.body,
            bodyB: b?.body,
            pointB: anchor,
            length: parameters.tetherLength,
            stiffness: Math.max(0.001, Math.min(0.1, strength)),
            damping: parameters.tetherDamping ?? 0.05,
            label: `ability:${id}`,
          });
          Matter.Composite.add(this.host.world.engine.world, body);
          this.tethers.push({
            body,
            a,
            b,
            anchor,
            start: this.host.time,
            startLength: body.length,
            endLength: parameters.tetherEndLength ?? body.length,
            generations: [a.generation, b?.generation ?? 0],
            expires: this.host.time + duration,
            chain,
          });
        }
        break;
      case 'field':
        for (let index = 0; index < (parameters.fieldCount ?? 1); index++)
          field(
            definition.mode!,
            attachment?.body.position ?? point,
            strength * (parameters.alternatePolarity && index % 2 ? -1 : 1),
            attachment ??
              (definition.target === 'player' && parameters.travelSpeed === undefined
                ? this.host.player
                : undefined),
            duration,
            (index * Math.PI * 2) / (parameters.fieldCount ?? 1),
          );
        break;
      case 'impulse':
      case 'burst': {
        const extra = definition.effect === 'burst' ? this.stored * tuning.burstStoredRatio : 0;
        for (const entity of targets) {
          impulse(
            entity,
            normalize(subtract(entity.body.position, point)),
            (strength + extra) *
              (1 -
                length(subtract(entity.body.position, point)) /
                  (radius * tuning.impulseFalloffRadius)),
            parameters.momentumScale,
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
          this.constructs.push({
            entity: planet,
            expires: this.host.time + duration,
            planet: true,
          });
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
      case 'reflect': {
        const fieldId = field('vortex', point, strength, this.host.player);
        for (const entity of targets)
          if (
            entity.kind === 'projectile' &&
            !entity.body.isStatic &&
            this.host.gravity
              .influencingFields(
                entity.body.position,
                entity.definition.gravityResponse * entity.gravityScale,
                [entity.definition.material, ...entity.definition.tags],
              )
              .has(fieldId)
          ) {
            entity.redirected = true;
            this.host.markCause(entity, chain);
          }
        break;
      }
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
    for (let index = this.tethers.length - 1; index >= 0; index--) {
      const tether = this.tethers[index];
      if (
        tether.expires <= this.host.time ||
        !tether.a.alive ||
        (tether.b && !tether.b.alive) ||
        tether.a.generation !== tether.generations[0] ||
        (tether.b && tether.b.generation !== tether.generations[1]) ||
        tether.a.body !== tether.body.bodyA ||
        tether.b?.body !== tether.body.bodyB
      ) {
        Matter.Composite.remove(this.host.world.engine.world, tether.body);
        this.tethers.splice(index, 1);
        continue;
      }
      const progress = Math.max(
        0,
        Math.min(1, (this.host.time - tether.start) / (tether.expires - tether.start)),
      );
      tether.body.length = tether.startLength + (tether.endLength - tether.startLength) * progress;
      const distance = length(
        subtract(tether.a.body.position, tether.b?.body.position ?? tether.anchor!),
      );
      if (Math.abs(distance - tether.body.length) > 0.1)
        for (const entity of [tether.a, tether.b])
          if (entity && !entity.body.isStatic) {
            this.host.markCause(entity, tether.chain);
            if (entity.kind === 'projectile') entity.redirected = true;
          }
    }
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
        this.host.world.refreshMass(status.entity);
        this.host.world.refreshSurface(status.entity);
        this.resistance.set(status.entity.id, {
          until: this.host.time + balance.abilities.lockResistance,
          generation: status.generation,
        });
      } else if (status.kind === 'surface') {
        status.entity.surfaceOverrides.delete(status.factor!);
        this.host.world.refreshSurface(status.entity);
      } else if (status.kind === 'mass') {
        status.entity.massFactors.delete(status.factor!);
        this.host.world.refreshMass(status.entity);
      } else status.entity.gravityFactors.delete(status.factor ?? 'theft');
      this.statuses.splice(index, 1);
    }
    for (let index = this.bindings.length - 1; index >= 0; index--) {
      const binding = this.bindings[index];
      if (
        binding.expires <= this.host.time ||
        (binding.entity &&
          (!binding.entity.alive || binding.entity.generation !== binding.generation))
      ) {
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
      if (field && binding.motion) {
        const value = fieldMotionAt(binding.motion, this.host.time, binding.entity?.body.position);
        field.radius = value.radius;
        field.strength = value.strength;
        field.direction = value.direction;
        this.host.gravity.moveField(binding.field, value.position);
      }
      if (field && binding.velocity)
        this.host.gravity.moveField(binding.field, {
          x: field.position.x + binding.velocity.x * dt,
          y: field.position.y + binding.velocity.y * dt,
        });
    }
    if (this.bindings.length)
      for (const entity of this.host.world.entities.values()) {
        if (entity === this.host.player || entity.body.isStatic) continue;
        const response = entity.definition.gravityResponse * entity.gravityScale;
        if (response === 0) continue;
        const influences = this.host.gravity.influencingFields(entity.body.position, response, [
          entity.definition.material,
          ...entity.definition.tags,
        ]);
        // Newest effective cast keeps ownership when multiple powers influence one body.
        for (const binding of this.bindings)
          if (influences.has(binding.field)) {
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
