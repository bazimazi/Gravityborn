import Matter from 'matter-js';
import { bossDefinitions, type BossKind } from '../content/bosses';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import type { Entity } from '../physics/world';
import type { AbilityHost } from './abilities';
import balance from '../data/balance.json';
import behavior from '../data/boss-behavior.json';
import type { GravityField } from '../physics/gravity';

interface BossState {
  next: number;
  phase: number;
  cycle: number;
  field?: number;
  satellites: { entity: Entity; field: number }[];
  walls: { body: Matter.Body; expires: number }[];
  frozen: { entity: Entity; velocity: Vec2; until: number }[];
  aim?: Vec2;
  ambush?: { radius: number; mode: 'radial' | 'vortex' };
}
export class BossSystem {
  private readonly states = new Map<number, BossState>();
  constructor(private readonly host: AbilityHost) {}
  get active():
    | {
        entity: Entity;
        name: string;
        phase: number;
        telegraph: number;
        aim?: Vec2;
        ambush?: { radius: number; mode: 'radial' | 'vortex' };
      }
    | undefined {
    for (const [id, state] of this.states) {
      const entity = this.host.world.entities.get(id);
      if (entity)
        return {
          entity,
          name: bossDefinitions[entity.kind as BossKind].name,
          phase: state.phase,
          aim: state.aim,
          ambush: state.ambush,
          telegraph: Math.max(0, 1 - (state.next - this.host.time) / behavior.telegraph),
        };
    }
    return undefined;
  }
  update(entity: Entity): boolean {
    if (!(entity.kind in bossDefinitions)) return false;
    let state = this.states.get(entity.id);
    if (!state) {
      state = {
        next: this.host.time + behavior.initialDelay,
        phase: 1,
        cycle: 0,
        satellites: [],
        walls: [],
        frozen: [],
      };
      this.states.set(entity.id, state);
      this.host.events.emit('bossStarted', {
        entityId: entity.id,
        kind: entity.kind,
        position: { ...entity.body.position },
      });
    }
    state.phase =
      entity.health > (entity.maxHealth * 2) / 3 ? 1 : entity.health > entity.maxHealth / 3 ? 2 : 3;
    entity.telegraph = Math.max(0, 1 - (state.next - this.host.time) / behavior.telegraph);
    if (entity.telegraph > 0 && !state.aim && this.host.time < state.next) {
      state.aim = { ...this.host.player.body.position };
      state.ambush = this.ambush(state.phase);
    }
    for (let index = state.frozen.length - 1; index >= 0; index--) {
      const frozen = state.frozen[index];
      if (frozen.until > this.host.time && frozen.entity.alive) continue;
      if (frozen.entity.alive) {
        Matter.Body.setStatic(frozen.entity.body, false);
        Matter.Body.setVelocity(frozen.entity.body, scale(frozen.velocity, -1));
      }
      state.frozen.splice(index, 1);
    }
    const toward = normalize(subtract(this.host.player.body.position, entity.body.position));
    this.host.world.accelerate(entity, scale(toward, behavior.acceleration));
    for (const satellite of state.satellites) {
      if (satellite.entity.alive)
        this.host.gravity.moveField(satellite.field, satellite.entity.body.position);
      else this.host.gravity.removeField(satellite.field);
    }
    state.satellites = state.satellites.filter((satellite) => satellite.entity.alive);
    for (let index = state.walls.length - 1; index >= 0; index--)
      if (state.walls[index].expires <= this.host.time) {
        this.removeWall(state.walls[index].body);
        state.walls.splice(index, 1);
      }
    if (entity.kind === 'singularity_boss') {
      let field = state.field ? this.host.gravity.fields.get(state.field) : undefined;
      if (
        !field &&
        this.host.gravity.fields.size < balance.physics.maxFields - behavior.fieldReserve
      ) {
        state.field = this.host.gravity.addField({
          source: `boss:${entity.id}`,
          mode: 'radial',
          position: entity.body.position,
          direction: toward,
          strength: behavior.singularity.baseStrength,
          radius: behavior.singularity.baseRadius,
          falloff: 'linear',
          remaining: 1,
        });
        field = this.host.gravity.fields.get(state.field);
      }
      if (field) {
        this.host.gravity.moveField(field.id, entity.body.position);
        field.remaining = 1;
        field.strength =
          behavior.singularity.baseStrength + state.phase * behavior.singularity.phaseStrength;
        field.radius =
          behavior.singularity.baseRadius + state.phase * behavior.singularity.phaseRadius;
      }
    }
    if (this.host.time < state.next) return true;
    state.cycle++;
    state.next = this.host.time + behavior.cooldown - state.phase * behavior.phaseCooldownReduction;
    const field = (
      mode: 'radial' | 'vortex',
      strength: number,
      radius: number,
      remaining: number,
    ): void => {
      if (this.host.gravity.fields.size < balance.physics.maxFields - behavior.fieldReserve)
        this.host.gravity.addField({
          source: `boss:${entity.id}`,
          mode,
          position: { ...entity.body.position },
          direction: toward,
          strength,
          radius,
          falloff: 'linear',
          remaining,
        });
    };
    if (entity.kind === 'inverter') {
      const directions = [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
      ];
      this.host.gravity.setDirection(directions[state.cycle % 4]);
      this.host.events.emit('gravityChanged', {
        direction: this.host.gravity.direction,
        source: 'enemy',
      });
      field(
        state.phase === 3 ? 'vortex' : 'radial',
        behavior.inverter.strength,
        behavior.inverter.radius,
        behavior.inverter.duration,
      );
    }
    if (entity.kind === 'planet_eater' && state.satellites.length < behavior.satellites.limit)
      for (let i = 0; i < state.phase; i++) {
        if (
          this.host.gravity.fields.size >= balance.physics.maxFields - behavior.fieldReserve ||
          state.satellites.length >= behavior.satellites.limit
        )
          break;
        const angle = (state.cycle + i) * behavior.satellites.orbitStep;
        const satellite = this.host.world.spawn('crate', {
          x: Math.max(
            behavior.placement.minX,
            Math.min(
              behavior.placement.maxX,
              entity.body.position.x + Math.cos(angle) * behavior.satellites.distance,
            ),
          ),
          y: Math.max(
            behavior.placement.minY,
            Math.min(
              behavior.placement.maxY,
              entity.body.position.y + Math.sin(angle) * behavior.satellites.distance,
            ),
          ),
        });
        if (!satellite) break;
        satellite.health = satellite.maxHealth = behavior.satellites.health;
        satellite.gravityScale = behavior.satellites.response;
        this.host.world.impulse(satellite, {
          x: -Math.sin(angle) * behavior.satellites.impulse,
          y: Math.cos(angle) * behavior.satellites.impulse,
        });
        const id = this.host.gravity.addField({
          source: `boss:${entity.id}`,
          mode: 'radial',
          position: satellite.body.position,
          direction: toward,
          strength: behavior.satellites.strength,
          radius: behavior.satellites.radius,
          falloff: 'linear',
          remaining: behavior.placement.persistentDuration,
        });
        state.satellites.push({ entity: satellite, field: id });
      }
    if (entity.kind === 'architect') {
      const player = this.host.player.body.position;
      const horizontal = state.cycle % 2 === 0;
      this.host.world.addWall(
        Math.max(
          behavior.placement.wallMinX,
          Math.min(
            behavior.placement.wallMaxX,
            player.x + (horizontal ? 0 : behavior.architect.offset),
          ),
        ),
        Math.max(
          behavior.placement.wallMinY,
          Math.min(
            behavior.placement.wallMaxY,
            player.y + (horizontal ? behavior.architect.offset : 0),
          ),
        ),
        horizontal ? behavior.architect.length : behavior.architect.width,
        horizontal ? behavior.architect.width : behavior.architect.length,
      );
      state.walls.push({
        body: this.host.world.walls[this.host.world.walls.length - 1],
        expires: this.host.time + behavior.architect.duration,
      });
      field(
        'vortex',
        behavior.architect.strength * state.phase,
        behavior.architect.radius,
        behavior.architect.fieldDuration,
      );
    }
    if (entity.kind === 'star' || entity.kind === 'singularity_boss') {
      const cause = this.host.createCause();
      const inward = entity.kind === 'singularity_boss';
      for (const target of this.host.world.entities.values()) {
        if (target === entity) continue;
        const delta = subtract(target.body.position, entity.body.position);
        if (length(delta) > behavior.pulse.reach) continue;
        this.host.world.impulse(
          target,
          scale(
            normalize(delta),
            ((inward ? -1 : 1) *
              (behavior.pulse.impulse + state.phase * behavior.pulse.phaseImpulse)) /
              Math.sqrt(target.body.mass),
          ),
        );
        if (target.kind !== 'player') this.host.markCause(target, cause);
      }
      field(
        'radial',
        inward ? behavior.pulse.inwardStrength : behavior.pulse.outwardStrength,
        behavior.pulse.radius,
        behavior.pulse.duration,
      );
    }
    this.advancedAttack(entity, state);
    const ambush = state.ambush;
    // Only fire at a position that was actually telegraphed on an earlier update.
    if (
      ambush &&
      state.aim &&
      this.host.gravity.fields.size < balance.physics.maxFields - behavior.fieldReserve
    )
      this.host.gravity.addField({
        source: `boss:${entity.id}`,
        mode: ambush.mode,
        position: { ...state.aim },
        direction: { x: 0, y: 1 },
        strength:
          ambush.mode === 'vortex' ? behavior.ambush.vortexStrength : behavior.ambush.strength,
        radius: ambush.radius,
        remaining: behavior.ambush.duration,
        falloff: 'linear',
      });
    state.aim = undefined;
    state.ambush = undefined;
    return true;
  }
  private ambush(phase: number): { radius: number; mode: 'radial' | 'vortex' } | undefined {
    if (this.host.difficulty < behavior.ambush.difficulty || phase < behavior.ambush.minPhase)
      return undefined;
    return {
      radius: behavior.ambush.radius,
      mode:
        this.host.difficulty >= behavior.ambush.vortexDifficulty && phase === 3
          ? 'vortex'
          : 'radial',
    };
  }
  private advancedAttack(entity: Entity, state: BossState): void {
    const tuning = balance.bosses;
    const place = (
      position: Vec2,
      mode: GravityField['mode'],
      strength: number,
      radius: number,
      duration: number,
      affects?: string[],
    ) => {
      if (this.host.gravity.fields.size >= balance.physics.maxFields - behavior.fieldReserve)
        return;
      this.host.gravity.addField({
        source: `boss:${entity.id}`,
        mode,
        position: { ...position },
        direction: { x: 0, y: 1 },
        strength,
        radius,
        remaining: duration,
        falloff: 'linear',
        affects,
      });
    };
    if (entity.kind === 'magnetar') {
      place(
        entity.body.position,
        'radial',
        (state.cycle % 2 ? 1 : -1) *
          tuning.magnetStrength *
          (1 + state.phase * behavior.magnetar.phaseStrength),
        tuning.magnetRadius,
        behavior.magnetar.duration,
        ['metal'],
      );
      if (state.phase > 1)
        place(
          entity.body.position,
          'vortex',
          behavior.magnetar.vortexStrength,
          behavior.magnetar.vortexRadius,
          behavior.magnetar.vortexDuration,
          ['metal'],
        );
    }
    if (entity.kind === 'chronarch') {
      for (const target of this.host.world.entities.values()) {
        if (
          target === entity ||
          target.kind === 'player' ||
          target.body.isStatic ||
          (target.definition.faction === 'enemy' && target.kind !== 'projectile') ||
          target.kind === 'xp' ||
          target.kind === 'shard'
        )
          continue;
        if (length(subtract(target.body.position, entity.body.position)) > tuning.stasisRadius)
          continue;
        const velocity = { ...Matter.Body.getVelocity(target.body) };
        state.frozen.push({
          entity: target,
          velocity,
          until: this.host.time + tuning.stasisDuration,
        });
        Matter.Body.setStatic(target.body, true);
      }
      place(
        entity.body.position,
        'zero',
        1,
        behavior.chronarch.zeroRadius,
        behavior.chronarch.zeroDuration,
      );
    }
    if (entity.kind === 'tidal') {
      const horizontal = state.cycle % 2 === 0;
      for (const sign of [-1, 1])
        place(
          {
            x:
              behavior.placement.centerX +
              (horizontal ? sign * behavior.tidal.horizontalOffset : 0),
            y: behavior.placement.centerY + (horizontal ? 0 : sign * behavior.tidal.verticalOffset),
          },
          'radial',
          sign * tuning.tidalStrength * (1 + state.phase * behavior.tidal.phaseStrength),
          tuning.tidalRadius,
          behavior.tidal.duration,
        );
    }
    if (entity.kind === 'comet') {
      this.host.world.impulse(
        entity,
        scale(
          normalize(subtract(state.aim ?? this.host.player.body.position, entity.body.position)),
          tuning.cometImpulse,
        ),
      );
      place(
        entity.body.position,
        'radial',
        behavior.comet.wakeStrength,
        behavior.comet.wakeRadius,
        behavior.comet.wakeDuration,
      );
      if (state.phase === 3)
        place(
          entity.body.position,
          'vortex',
          behavior.comet.vortexStrength,
          behavior.comet.vortexRadius,
          behavior.comet.vortexDuration,
        );
    }
    if (entity.kind === 'weaver') {
      const center = state.aim ?? this.host.player.body.position;
      for (let index = 0; index < state.phase + 1; index++) {
        const angle = (index * Math.PI * 2) / (state.phase + 1) + state.cycle;
        place(
          {
            x: Math.max(
              behavior.placement.minX,
              Math.min(
                behavior.placement.maxX,
                center.x + Math.cos(angle) * behavior.weaver.offset,
              ),
            ),
            y: Math.max(
              behavior.placement.minY,
              Math.min(
                behavior.placement.maxY,
                center.y + Math.sin(angle) * behavior.weaver.offset,
              ),
            ),
          },
          index % 2 ? 'zero' : 'vortex',
          index % 2 ? 1 : tuning.voidStrength,
          tuning.voidRadius,
          tuning.voidDuration,
        );
      }
    }
  }
  onDeath(entity: Entity): void {
    const state = this.states.get(entity.id);
    if (!state) return;
    for (const field of this.host.gravity.fields.values())
      if (field.source === `boss:${entity.id}`) this.host.gravity.removeField(field.id);
    for (const wall of state.walls) this.removeWall(wall.body);
    for (const frozen of state.frozen)
      if (frozen.entity.alive) {
        Matter.Body.setStatic(frozen.entity.body, false);
        Matter.Body.setVelocity(frozen.entity.body, frozen.velocity);
      }
    this.states.delete(entity.id);
  }
  private removeWall(body: Matter.Body): void {
    Matter.Composite.remove(this.host.world.engine.world, body);
    const index = this.host.world.walls.indexOf(body);
    if (index >= 0) this.host.world.walls.splice(index, 1);
  }
}
