import Matter from 'matter-js';
import { enemyDefinitions, type EliteModifier } from '../content/enemies';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import type { AbilityHost } from './abilities';
import type { Entity } from '../physics/world';
import type { GravityField } from '../physics/gravity';
import balance from '../data/balance.json';
import tuning from '../data/enemy-behavior.json';

interface EnemyHost extends AbilityHost {
  detonate(entity: Entity): void;
}
interface EnemyState {
  next: number;
  fields: Map<string, number>;
  initialized: boolean;
  carrier?: Entity;
  target?: Entity;
  targetGeneration?: number;
  lastDirection: Vec2;
}

/** Enemy decisions run before physics. Every field shares GravitySystem. */
export class EnemySystem {
  private readonly states = new Map<number, EnemyState>();
  constructor(private readonly host: EnemyHost) {}

  setElite(entity: Entity, modifier: EliteModifier): void {
    if (entity.elite) return;
    entity.elite = modifier;
    if (modifier === 'heavy')
      this.host.world.setMass(entity, entity.massBase * tuning.heavyMultiplier);
    if (modifier === 'inverted') entity.gravityScale = -1;
    this.host.events.emit('eliteSpawned', {
      entityId: entity.id,
      kind: entity.kind,
      modifier,
      position: { ...entity.body.position },
    });
  }

  update(entity: Entity): boolean {
    const special = entity.kind in enemyDefinitions;
    if (!special && !entity.elite) return false;
    let state = this.states.get(entity.id);
    if (!state) {
      state = {
        next: this.host.time + tuning.initialDelay,
        initialized: false,
        fields: new Map(),
        lastDirection: { ...this.host.gravity.direction },
      };
      this.states.set(entity.id, state);
    }
    const delta = subtract(this.host.player.body.position, entity.body.position);
    const toward = normalize(delta);
    const distance = length(delta);
    const ready = this.host.time >= state.next;
    entity.telegraph = Math.max(0, 1 - (state.next - this.host.time) / tuning.telegraph);
    if (
      ['railgunner', 'lancer'].includes(entity.kind) &&
      entity.telegraph > 0 &&
      !ready &&
      !entity.attackAim
    )
      entity.attackAim = { ...this.host.player.body.position };
    const field = (
      mode: GravityField['mode'],
      strength: number,
      radius: number,
      duration = 1,
      slot = 'aura',
      affects?: string[],
    ): void => {
      const fieldId = state!.fields.get(slot);
      if (fieldId && this.host.gravity.fields.has(fieldId)) {
        const existing = this.host.gravity.fields.get(fieldId)!;
        this.host.gravity.moveField(existing.id, entity.body.position);
        existing.remaining = duration;
        existing.strength = strength;
        existing.direction = { ...toward };
        return;
      }
      if (this.host.gravity.fields.size >= balance.physics.maxFields - 2) return;
      state!.fields.set(
        slot,
        this.host.gravity.addField({
          source: `enemy:${entity.id}`,
          mode,
          position: entity.body.position,
          direction: toward,
          strength,
          radius,
          falloff: 'linear',
          remaining: duration,
          affects,
        }),
      );
    };
    const orbit = (): void => {
      const source = [...this.host.gravity.fields.values()].find(
        (candidate) => candidate.source !== `enemy:${entity.id}`,
      );
      const center = source?.position ?? this.host.player.body.position;
      const inward = normalize(subtract(center, entity.body.position));
      const radius = length(subtract(center, entity.body.position));
      this.host.world.accelerate(entity, {
        x:
          inward.x * (radius > tuning.orbit.radius ? tuning.orbit.inward : tuning.orbit.outward) -
          inward.y * tuning.orbit.tangent,
        y:
          inward.y * (radius > tuning.orbit.radius ? tuning.orbit.inward : tuning.orbit.outward) +
          inward.x * tuning.orbit.tangent,
      });
    };
    if (entity.kind === 'anchor' || entity.elite === 'anchor') {
      Matter.Body.setStatic(entity.body, true);
      field('radial', tuning.anchor.strength, tuning.anchor.radius);
    } else if (entity.kind === 'orbiter' || entity.elite === 'orbital') orbit();
    else if (special)
      this.host.world.accelerate(
        entity,
        scale(toward, entity.kind === 'swarm' ? tuning.swarmAcceleration : tuning.acceleration),
      );

    if (entity.kind === 'slime' && ready) {
      if (this.host.gravity.fields.size < balance.physics.maxFields - 2)
        this.host.gravity.addField({
          source: `enemy:${entity.id}`,
          mode: 'radial',
          position: { ...this.host.player.body.position },
          direction: toward,
          strength: tuning.slime.strength,
          radius: tuning.slime.radius,
          falloff: 'linear',
          remaining: tuning.slime.duration,
        });
      state.next = this.host.time + tuning.slime.cooldown;
    }
    if (entity.kind === 'null_shepherd')
      field('zero', tuning.nullShepherd.strength, tuning.nullShepherd.radius, 1, 'damping');
    if (entity.kind === 'flux_mite')
      entity.gravityFactors.set('flux', Math.floor(entity.life / tuning.fluxPeriod) % 2 ? -1 : 1);
    if (entity.kind === 'magnetic_sentinel')
      field(
        'radial',
        tuning.magneticSentinel.strength *
          (Math.floor(entity.life / tuning.magneticSentinel.period) % 2 ? -1 : 1),
        tuning.magneticSentinel.radius,
        1,
        'magnetic',
        ['metal'],
      );
    if (entity.kind === 'lancer' && ready) {
      if (!entity.attackAim) state.next = this.host.time + tuning.telegraph;
      else {
        this.host.world.impulse(
          entity,
          scale(normalize(subtract(entity.attackAim, entity.body.position)), tuning.lancer.impulse),
        );
        this.host.markCause(entity, this.host.createCause('enemy'));
        entity.attackAim = undefined;
        state.next = this.host.time + tuning.lancer.cooldown;
      }
    }
    if (entity.kind === 'momentum_broker') {
      if (entity.telegraph > 0 && !ready && !state.target) {
        state.target = [...this.host.world.entities.values()]
          .filter(
            (candidate) =>
              candidate.alive &&
              !candidate.body.isStatic &&
              candidate.definition.faction === 'neutral' &&
              !['xp', 'shard'].includes(candidate.kind) &&
              length(subtract(candidate.body.position, entity.body.position)) <
                tuning.momentumBroker.radius,
          )
          .sort(
            (a, b) =>
              length(subtract(a.body.position, entity.body.position)) -
              length(subtract(b.body.position, entity.body.position)),
          )[0];
        state.targetGeneration = state.target?.generation;
      }
      const target = state.target;
      const valid =
        target?.alive &&
        target.generation === state.targetGeneration &&
        !target.body.isStatic &&
        !entity.body.isStatic &&
        length(subtract(target.body.position, entity.body.position)) < tuning.momentumBroker.radius;
      entity.attackAim = valid ? { ...target.body.position } : undefined;
      if (ready) {
        if (valid) {
          const velocity = { ...entity.body.velocity };
          Matter.Sleeping.set(entity.body, false);
          Matter.Sleeping.set(target.body, false);
          Matter.Body.setVelocity(entity.body, target.body.velocity);
          Matter.Body.setVelocity(target.body, velocity);
          const chain = this.host.createCause('enemy');
          this.host.markCause(entity, chain);
          this.host.markCause(target, chain);
        }
        state.target = undefined;
        state.targetGeneration = undefined;
        entity.attackAim = undefined;
        state.next = this.host.time + tuning.momentumBroker.cooldown;
      }
    }
    if (entity.kind === 'cratewright' && ready) {
      const plates = [...this.host.world.entities.values()].filter(
        (candidate) =>
          candidate.alive && candidate.kind === 'metal_plate' && candidate.ownerId === entity.id,
      );
      const position = {
        x: entity.body.position.x + toward.x * tuning.cratewright.offset,
        y: entity.body.position.y + toward.y * tuning.cratewright.offset,
      };
      if (
        plates.length < tuning.cratewright.limit &&
        position.x > 65 &&
        position.y > 65 &&
        position.x < this.host.room.width - 65 &&
        position.y < this.host.room.height - 65 &&
        this.host.world.circleClear(position, 42) &&
        [...this.host.world.entities.values()].every(
          (candidate) =>
            !candidate.alive ||
            length(subtract(candidate.body.position, position)) > 42 + candidate.definition.radius,
        )
      ) {
        const plate = this.host.world.spawn('metal_plate', position);
        if (plate) {
          plate.ownerId = entity.id;
          Matter.Body.setAngle(plate.body, Math.atan2(toward.y, toward.x) + Math.PI / 2);
        }
      }
      state.next = this.host.time + tuning.cratewright.cooldown;
    }
    if (entity.kind === 'railgunner') {
      if (distance < tuning.railgunner.range)
        this.host.world.accelerate(entity, scale(toward, -2 * tuning.acceleration));
      if (ready) {
        if (!entity.attackAim) state.next = this.host.time + tuning.telegraph;
        else {
          const ammo = [...this.host.world.entities.values()]
            .filter(
              (candidate) =>
                candidate.alive &&
                !candidate.body.isStatic &&
                candidate.definition.faction === 'neutral' &&
                !['xp', 'shard'].includes(candidate.kind) &&
                length(subtract(candidate.body.position, entity.body.position)) <
                  tuning.railgunner.ammoRadius,
            )
            .sort(
              (a, b) =>
                length(subtract(a.body.position, entity.body.position)) -
                length(subtract(b.body.position, entity.body.position)),
            )[0];
          if (ammo) {
            this.host.world.impulse(
              ammo,
              scale(
                normalize(subtract(entity.attackAim, ammo.body.position)),
                tuning.railgunner.impulse / Math.sqrt(ammo.body.mass),
              ),
            );
            this.host.markCause(ammo, this.host.createCause('enemy'));
          }
          entity.attackAim = undefined;
          state.next = this.host.time + tuning.railgunner.cooldown;
        }
      }
    }
    if (entity.kind === 'salvager' && ready) {
      const scrap = [...this.host.world.entities.values()]
        .filter(
          (candidate) =>
            candidate.alive &&
            !candidate.body.isStatic &&
            candidate.definition.faction === 'neutral' &&
            candidate.definition.breakable &&
            length(subtract(candidate.body.position, entity.body.position)) <
              tuning.salvager.radius,
        )
        .sort(
          (a, b) =>
            length(subtract(a.body.position, entity.body.position)) -
            length(subtract(b.body.position, entity.body.position)),
        )[0];
      if (scrap) {
        this.host.applyDamage(
          scrap,
          tuning.salvager.damage,
          this.host.createCause('enemy'),
          'Crush',
        );
        if (!scrap.alive && entity.alive)
          entity.health = Math.min(entity.maxHealth, entity.health + tuning.salvager.repair);
      }
      state.next = this.host.time + tuning.salvager.cooldown;
    }
    if (
      entity.kind === 'floater' &&
      (state.lastDirection.x !== this.host.gravity.direction.x ||
        state.lastDirection.y !== this.host.gravity.direction.y)
    ) {
      this.host.world.impulse(entity, scale(this.host.gravity.direction, tuning.floaterImpulse));
      state.lastDirection = { ...this.host.gravity.direction };
    }
    if (entity.kind === 'bomber' && !state.initialized)
      state.carrier = this.host.world.spawn('barrel', {
        x: entity.body.position.x + tuning.bomber.offset,
        y: entity.body.position.y,
      });
    if (state.carrier?.alive) {
      const offset = subtract(entity.body.position, state.carrier.body.position);
      if (length(offset) < tuning.bomber.tetherRadius)
        this.host.world.accelerate(
          state.carrier,
          scale(normalize(offset), tuning.bomber.tetherAcceleration),
        );
    }
    if (entity.kind === 'bomber' && distance < tuning.bomber.triggerRadius && ready) {
      this.host.detonate(entity);
      state.next = Infinity;
    }
    if (entity.kind === 'repulsor' && ready) {
      field(
        'radial',
        tuning.repulsor.strength,
        tuning.repulsor.radius,
        tuning.repulsor.duration,
        'repulsion',
      );
      state.next = this.host.time + tuning.repulsor.cooldown;
    }
    if (entity.kind === 'phase') {
      const phasing = Math.floor(entity.life / tuning.phasePeriod) % 2 === 1;
      if (phasing) entity.gravityFactors.set('phase', 0);
      else entity.gravityFactors.delete('phase');
      // Keep solid arena walls; only ignore other entities while phased.
      entity.body.collisionFilter.mask = phasing ? 1 : 0xffffffff;
      entity.telegraph = phasing ? 1 : 0;
    }
    if (entity.kind === 'singularity' || entity.elite === 'singularity')
      field('radial', tuning.singularity.strength, tuning.singularity.radius, 1, 'singularity');
    if ((entity.kind === 'mirror' || entity.elite === 'reflector') && ready) {
      const affected = [...this.host.gravity.fields.values()].find(
        (candidate) =>
          candidate.source.startsWith('ability:') &&
          length(subtract(candidate.position, entity.body.position)) < candidate.radius,
      );
      if (affected) {
        this.host.world.impulse(this.host.player, scale(toward, tuning.mirror.impulse));
        state.next = this.host.time + tuning.mirror.cooldown;
      }
    }
    if (entity.kind === 'parasite') {
      if (!state.target?.alive) {
        const target = [...this.host.world.entities.values()].find(
          (candidate) =>
            candidate !== entity &&
            candidate.kind !== 'parasite' &&
            candidate.kind !== 'projectile' &&
            candidate.definition.faction === 'enemy',
        );
        if (target) {
          state.target = target;
          target.gravityFactors.set(`parasite:${entity.id}`, tuning.parasite.response);
        }
      }
      if (state.target?.alive)
        this.host.world.accelerate(
          entity,
          scale(
            normalize(subtract(state.target.body.position, entity.body.position)),
            tuning.parasite.acceleration,
          ),
        );
    }
    if (entity.kind === 'summoner' && ready) {
      const brood = [...this.host.world.entities.values()].filter(
        (candidate) => candidate.kind === 'swarm',
      ).length;
      if (brood < tuning.summoner.limit)
        for (let i = 0; i < Math.min(tuning.summoner.count, tuning.summoner.limit - brood); i++)
          this.host.world.spawn('swarm', {
            x:
              entity.body.position.x +
              Math.cos((i * Math.PI * 2) / tuning.summoner.count) * tuning.summoner.offset,
            y:
              entity.body.position.y +
              Math.sin((i * Math.PI * 2) / tuning.summoner.count) * tuning.summoner.offset,
          });
      state.next = this.host.time + tuning.summoner.cooldown;
    }
    if (entity.elite === 'unstable' && entity.body.speed > tuning.unstableSpeed)
      this.host.detonate(entity);
    if (entity.elite === 'vampire')
      for (const source of this.host.gravity.fields.values()) {
        if (
          !source.source.startsWith('enemy:') &&
          length(subtract(source.position, entity.body.position)) < tuning.vampire.radius
        ) {
          this.host.gravity.removeField(source.id);
          entity.health = Math.min(entity.maxHealth, entity.health + tuning.vampire.repair);
        }
      }
    state.initialized = true;
    // Cancel part of the acceleration the player's core would otherwise receive.
    if (entity.kind === 'leech' && distance < tuning.leech.radius)
      this.host.world.accelerate(
        this.host.player,
        scale(
          this.host.gravity.sample(
            this.host.player.body.position,
            this.host.player.definition.gravityResponse,
          ),
          tuning.leech.cancellation,
        ),
      );
    return special || entity.elite === 'anchor';
  }

  onDeath(entity: Entity): void {
    if (entity.kind === 'splitter') {
      const brood = [...this.host.world.entities.values()].filter(
        (candidate) => candidate.alive && candidate.kind === 'swarm',
      ).length;
      for (let i = 0; i < Math.min(tuning.splitter.count, tuning.summoner.limit - brood); i++) {
        const position = {
          x: Math.max(
            65,
            Math.min(
              this.host.room.width - 65,
              entity.body.position.x + (i ? 1 : -1) * tuning.splitter.offset,
            ),
          ),
          y: Math.max(65, Math.min(this.host.room.height - 65, entity.body.position.y)),
        };
        if (!this.host.world.circleClear(position, 11)) continue;
        const child = this.host.world.spawn('swarm', position);
        if (child) child.invulnerability = balance.enemies.spawnProtection;
      }
    }
    for (const source of this.host.gravity.fields.values())
      if (source.source === `enemy:${entity.id}`) this.host.gravity.removeField(source.id);
    const state = this.states.get(entity.id);
    if (state?.target?.alive) state.target.gravityFactors.delete(`parasite:${entity.id}`);
    if (state?.carrier?.alive)
      this.host.markCause(state.carrier, entity.chainId ?? this.host.createCause());
    this.states.delete(entity.id);
  }
}
