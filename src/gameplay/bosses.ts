import Matter from 'matter-js';
import { bossDefinitions, type BossKind } from '../content/bosses';
import { length, normalize, scale, subtract } from '../core/vector';
import type { Entity } from '../physics/world';
import type { AbilityHost } from './abilities';

interface BossState {
  next: number;
  phase: number;
  cycle: number;
  field?: number;
  satellites: { entity: Entity; field: number }[];
  walls: { body: Matter.Body; expires: number }[];
}
export class BossSystem {
  private readonly states = new Map<number, BossState>();
  constructor(private readonly host: AbilityHost) {}
  get active(): { entity: Entity; name: string; phase: number; telegraph: number } | undefined {
    for (const [id, state] of this.states) {
      const entity = this.host.world.entities.get(id);
      if (entity)
        return {
          entity,
          name: bossDefinitions[entity.kind as BossKind].name,
          phase: state.phase,
          telegraph: Math.max(0, 1 - (state.next - this.host.time) / 1.1),
        };
    }
    return undefined;
  }
  update(entity: Entity): boolean {
    if (!(entity.kind in bossDefinitions)) return false;
    let state = this.states.get(entity.id);
    if (!state) {
      state = { next: this.host.time + 2, phase: 1, cycle: 0, satellites: [], walls: [] };
      this.states.set(entity.id, state);
    }
    state.phase =
      entity.health > (entity.maxHealth * 2) / 3 ? 1 : entity.health > entity.maxHealth / 3 ? 2 : 3;
    entity.telegraph = Math.max(0, 1 - (state.next - this.host.time) / 1.1);
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
      this.host.events.emit('gravityChanged', { direction: this.host.gravity.direction });
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
    return true;
  }
  onDeath(entity: Entity): void {
    const state = this.states.get(entity.id);
    if (!state) return;
    for (const field of this.host.gravity.fields.values())
      if (field.source === `boss:${entity.id}`) this.host.gravity.removeField(field.id);
    for (const wall of state.walls) this.removeWall(wall.body);
    this.states.delete(entity.id);
  }
  private removeWall(body: Matter.Body): void {
    Matter.Composite.remove(this.host.world.engine.world, body);
    const index = this.host.world.walls.indexOf(body);
    if (index >= 0) this.host.world.walls.splice(index, 1);
  }
}
