import Matter from 'matter-js';
import { enemyDefinitions, type EliteModifier } from '../content/enemies';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import type { AbilityHost } from './abilities';
import type { Entity } from '../physics/world';
import type { GravityField } from '../physics/gravity';
import balance from '../data/balance.json';

interface EnemyHost extends AbilityHost {
  detonate(entity: Entity): void;
}
interface EnemyState {
  next: number;
  fields: Map<string, number>;
  phasing?: boolean;
  phaseResponse?: number;
  initialized: boolean;
  carrier?: Entity;
  target?: Entity;
  lastDirection: Vec2;
  previousResponse?: number;
}

/** Enemy decisions run before physics. Every field shares GravitySystem. */
export class EnemySystem {
  private readonly states = new Map<number, EnemyState>();
  constructor(private readonly host: EnemyHost) {}

  setElite(entity: Entity, modifier: EliteModifier): void {
    if (entity.elite) return;
    entity.elite = modifier;
    if (modifier === 'heavy') Matter.Body.setMass(entity.body, entity.body.mass * 5);
    if (modifier === 'inverted') entity.gravityScale = -1;
  }

  update(entity: Entity): boolean {
    const special = entity.kind in enemyDefinitions;
    if (!special && !entity.elite) return false;
    let state = this.states.get(entity.id);
    if (!state) {
      state = {
        next: this.host.time + 1.2,
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
    entity.telegraph = Math.max(0, 1 - (state.next - this.host.time) / 0.7);
    const field = (
      mode: GravityField['mode'],
      strength: number,
      radius: number,
      duration = 1,
      slot = 'aura',
    ): void => {
      const fieldId = state!.fields.get(slot);
      if (fieldId && this.host.gravity.fields.has(fieldId)) {
        const existing = this.host.gravity.fields.get(fieldId)!;
        this.host.gravity.moveField(existing.id, entity.body.position);
        existing.remaining = duration;
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
        x: inward.x * (radius > 200 ? 0.001 : -0.0003) - inward.y * 0.001,
        y: inward.y * (radius > 200 ? 0.001 : -0.0003) + inward.x * 0.001,
      });
    };
    if (entity.kind === 'anchor' || entity.elite === 'anchor') {
      Matter.Body.setStatic(entity.body, true);
      field('radial', 0.007, 320);
    } else if (entity.kind === 'orbiter' || entity.elite === 'orbital') orbit();
    else if (special)
      this.host.world.accelerate(entity, scale(toward, entity.kind === 'swarm' ? 0.001 : 0.0003));

    if (entity.kind === 'slime' && ready) {
      if (this.host.gravity.fields.size < 48)
        this.host.gravity.addField({
          source: `enemy:${entity.id}`,
          mode: 'radial',
          position: { ...this.host.player.body.position },
          direction: toward,
          strength: 0.004,
          radius: 150,
          falloff: 'linear',
          remaining: 2.5,
        });
      state.next = this.host.time + 4;
    }
    if (
      entity.kind === 'floater' &&
      (state.lastDirection.x !== this.host.gravity.direction.x ||
        state.lastDirection.y !== this.host.gravity.direction.y)
    ) {
      this.host.world.impulse(entity, scale(this.host.gravity.direction, 10));
      state.lastDirection = { ...this.host.gravity.direction };
    }
    if (entity.kind === 'bomber' && !state.initialized)
      state.carrier = this.host.world.spawn('barrel', {
        x: entity.body.position.x + 42,
        y: entity.body.position.y,
      });
    if (state.carrier?.alive) {
      const offset = subtract(entity.body.position, state.carrier.body.position);
      if (length(offset) < 100)
        this.host.world.accelerate(state.carrier, scale(normalize(offset), 0.0008));
    }
    if (entity.kind === 'bomber' && distance < 100 && ready) {
      this.host.detonate(entity);
      state.next = Infinity;
    }
    if (entity.kind === 'repulsor' && ready) {
      field('radial', -0.008, 280, 1.3, 'repulsion');
      state.next = this.host.time + 4;
    }
    if (entity.kind === 'phase') {
      const phasing = Math.floor(entity.life / 2) % 2 === 1;
      if (phasing && !state.phasing) {
        state.phaseResponse = entity.gravityScale;
        entity.gravityScale = 0;
      } else if (!phasing && state.phasing) entity.gravityScale = state.phaseResponse ?? 1;
      state.phasing = phasing;
      // Keep solid arena walls; only ignore other entities while phased.
      entity.body.collisionFilter.mask = phasing ? 1 : 0xffffffff;
      entity.telegraph = phasing ? 1 : 0;
    }
    if (entity.kind === 'singularity' || entity.elite === 'singularity')
      field('radial', 0.008, 330, 1, 'singularity');
    if ((entity.kind === 'mirror' || entity.elite === 'reflector') && ready) {
      const affected = [...this.host.gravity.fields.values()].find(
        (candidate) =>
          candidate.source.startsWith('ability:') &&
          length(subtract(candidate.position, entity.body.position)) < candidate.radius,
      );
      if (affected) {
        this.host.world.impulse(this.host.player, scale(toward, 7));
        state.next = this.host.time + 2.5;
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
          state.previousResponse = target.gravityScale;
          target.gravityScale *= -1.8;
        }
      }
      if (state.target?.alive)
        this.host.world.accelerate(
          entity,
          scale(normalize(subtract(state.target.body.position, entity.body.position)), 0.002),
        );
    }
    if (entity.kind === 'summoner' && ready) {
      const brood = [...this.host.world.entities.values()].filter(
        (candidate) => candidate.kind === 'swarm',
      ).length;
      if (brood < 16)
        for (let i = 0; i < Math.min(3, 16 - brood); i++)
          this.host.world.spawn('swarm', {
            x: entity.body.position.x + Math.cos(i * 2.1) * 40,
            y: entity.body.position.y + Math.sin(i * 2.1) * 40,
          });
      state.next = this.host.time + 6;
    }
    if (entity.elite === 'unstable' && entity.body.speed > 8) this.host.detonate(entity);
    if (entity.elite === 'vampire')
      for (const source of this.host.gravity.fields.values()) {
        if (
          !source.source.startsWith('enemy:') &&
          length(subtract(source.position, entity.body.position)) < 160
        ) {
          this.host.gravity.removeField(source.id);
          entity.health = Math.min(entity.maxHealth, entity.health + 12);
        }
      }
    state.initialized = true;
    // Cancel part of the acceleration the player's core would otherwise receive.
    if (entity.kind === 'leech' && distance < 280)
      this.host.world.accelerate(
        this.host.player,
        scale(
          this.host.gravity.sample(
            this.host.player.body.position,
            this.host.player.definition.gravityResponse,
          ),
          -0.8,
        ),
      );
    return special || entity.elite === 'anchor';
  }

  onDeath(entity: Entity): void {
    for (const source of this.host.gravity.fields.values())
      if (source.source === `enemy:${entity.id}`) this.host.gravity.removeField(source.id);
    const state = this.states.get(entity.id);
    if (state?.target?.alive && state.previousResponse !== undefined)
      state.target.gravityScale = state.previousResponse;
    if (state?.carrier?.alive)
      this.host.markCause(state.carrier, entity.chainId ?? this.host.createCause());
    this.states.delete(entity.id);
  }
}
