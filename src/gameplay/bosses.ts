import Matter from 'matter-js';
import { bossDefinitions, type BossKind } from '../content/bosses';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import type { Entity } from '../physics/world';
import type { AbilityHost } from './abilities';
import balance from '../data/balance.json';
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
}
export class BossSystem {
  private readonly states = new Map<number, BossState>();
  constructor(private readonly host: AbilityHost) {}
  get active():
    | { entity: Entity; name: string; phase: number; telegraph: number; aim?: Vec2 }
    | undefined {
    for (const [id, state] of this.states) {
      const entity = this.host.world.entities.get(id);
      if (entity)
        return {
          entity,
          name: bossDefinitions[entity.kind as BossKind].name,
          phase: state.phase,
          aim: state.aim,
          telegraph: Math.max(0, 1 - (state.next - this.host.time) / 1.1),
        };
    }
    return undefined;
  }
  update(entity: Entity): boolean {
    if (!(entity.kind in bossDefinitions)) return false;
    let state = this.states.get(entity.id);
    if (!state) {
      state = {
        next: this.host.time + 2,
        phase: 1,
        cycle: 0,
        satellites: [],
        walls: [],
        frozen: [],
      };
      this.states.set(entity.id, state);
    }
    state.phase =
      entity.health > (entity.maxHealth * 2) / 3 ? 1 : entity.health > entity.maxHealth / 3 ? 2 : 3;
    entity.telegraph = Math.max(0, 1 - (state.next - this.host.time) / 1.1);
    if (entity.telegraph > 0 && !state.aim) state.aim = { ...this.host.player.body.position };
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
    this.host.world.accelerate(entity, scale(toward, 0.00018));
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
      if (!field && this.host.gravity.fields.size < 48) {
        state.field = this.host.gravity.addField({
          source: `boss:${entity.id}`,
          mode: 'radial',
          position: entity.body.position,
          direction: toward,
          strength: 0.002,
          radius: 400,
          falloff: 'linear',
          remaining: 1,
        });
        field = this.host.gravity.fields.get(state.field);
      }
      if (field) {
        this.host.gravity.moveField(field.id, entity.body.position);
        field.remaining = 1;
        field.strength = 0.002 + state.phase * 0.0015;
        field.radius = 350 + state.phase * 80;
      }
    }
    if (this.host.time < state.next) return true;
    state.cycle++;
    state.next = this.host.time + 5 - state.phase * 0.7;
    const field = (
      mode: 'radial' | 'vortex',
      strength: number,
      radius: number,
      remaining: number,
    ): void => {
      if (this.host.gravity.fields.size < 48)
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
      field(state.phase === 3 ? 'vortex' : 'radial', -0.003, 280, 1.5);
    }
    if (entity.kind === 'planet_eater' && state.satellites.length < 3)
      for (let i = 0; i < state.phase; i++) {
        if (this.host.gravity.fields.size >= 48 || state.satellites.length >= 3) break;
        const angle = (state.cycle + i) * 2.1;
        const satellite = this.host.world.spawn('crate', {
          x: Math.max(100, Math.min(1100, entity.body.position.x + Math.cos(angle) * 120)),
          y: Math.max(100, Math.min(700, entity.body.position.y + Math.sin(angle) * 120)),
        });
        if (!satellite) break;
        satellite.health = 70;
        satellite.gravityScale = 0.1;
        this.host.world.impulse(satellite, { x: -Math.sin(angle) * 6, y: Math.cos(angle) * 6 });
        const id = this.host.gravity.addField({
          source: `boss:${entity.id}`,
          mode: 'radial',
          position: satellite.body.position,
          direction: toward,
          strength: 0.006,
          radius: 210,
          falloff: 'linear',
          remaining: 36000,
        });
        state.satellites.push({ entity: satellite, field: id });
      }
    if (entity.kind === 'architect') {
      const player = this.host.player.body.position;
      const horizontal = state.cycle % 2 === 0;
      this.host.world.addWall(
        Math.max(160, Math.min(1040, player.x + (horizontal ? 0 : 150))),
        Math.max(160, Math.min(640, player.y + (horizontal ? 150 : 0))),
        horizontal ? 220 : 25,
        horizontal ? 25 : 220,
      );
      state.walls.push({
        body: this.host.world.walls[this.host.world.walls.length - 1],
        expires: this.host.time + 6,
      });
      field('vortex', 0.003 * state.phase, 270, 2);
    }
    if (entity.kind === 'star' || entity.kind === 'singularity_boss') {
      const cause = this.host.createCause();
      const inward = entity.kind === 'singularity_boss';
      for (const target of this.host.world.entities.values()) {
        if (target === entity) continue;
        const delta = subtract(target.body.position, entity.body.position);
        if (length(delta) > 500) continue;
        this.host.world.impulse(
          target,
          scale(
            normalize(delta),
            ((inward ? -1 : 1) * (6 + state.phase * 2)) / Math.sqrt(target.body.mass),
          ),
        );
        if (target.kind !== 'player') this.host.markCause(target, cause);
      }
      field('radial', inward ? 0.004 : -0.006, 450, 1.2);
    }
    this.advancedAttack(entity, state);
    state.aim = undefined;
    return true;
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
      if (this.host.gravity.fields.size >= 48) return;
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
        (state.cycle % 2 ? 1 : -1) * tuning.magnetStrength * (1 + state.phase * 0.2),
        tuning.magnetRadius,
        2.5,
        ['metal'],
      );
      if (state.phase > 1) place(entity.body.position, 'vortex', 0.003, 220, 1.5, ['metal']);
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
      place(entity.body.position, 'zero', 1, 270, 1.2);
    }
    if (entity.kind === 'tidal') {
      const horizontal = state.cycle % 2 === 0;
      for (const sign of [-1, 1])
        place(
          { x: horizontal ? 600 + sign * 330 : 600, y: horizontal ? 400 : 400 + sign * 220 },
          'radial',
          sign * tuning.tidalStrength * (1 + state.phase * 0.2),
          tuning.tidalRadius,
          2.7,
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
      place(entity.body.position, 'radial', -0.005, 180, 1);
      if (state.phase === 3) place(entity.body.position, 'vortex', 0.003, 280, 1.5);
    }
    if (entity.kind === 'weaver') {
      const center = state.aim ?? this.host.player.body.position;
      for (let index = 0; index < state.phase + 1; index++) {
        const angle = (index * Math.PI * 2) / (state.phase + 1) + state.cycle;
        place(
          {
            x: Math.max(100, Math.min(1100, center.x + Math.cos(angle) * 180)),
            y: Math.max(100, Math.min(700, center.y + Math.sin(angle) * 180)),
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
