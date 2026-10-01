import Matter from 'matter-js';
import { conducts, flammable, materialProperties } from '../content/materials';
import type { Entity } from '../physics/world';
import type { AbilityHost } from './abilities';
import type { Vec2 } from '../core/vector';
import balance from '../data/balance.json';

interface MaterialHost extends AbilityHost {
  applyDamage(entity: Entity, amount: number, cause: number, type?: string, depth?: number): void;
}
interface Burning {
  until: number;
  next: number;
  contact: number;
  chain: number;
  depth: number;
}
interface Discharge {
  position: Vec2;
  radius: number;
  chain: number;
  depth: number;
}
const tuning = balance.materials;

/** Reactions follow physical bodies and retain the initiating player's chain. */
export class MaterialSystem {
  private readonly burning = new Map<number, Burning>();
  private readonly discharges: Discharge[] = [];
  constructor(private readonly host: MaterialHost) {}

  isBurning(entity: Entity): boolean {
    return this.burning.has(entity.id);
  }

  ignite(entity: Entity, chain: number | null, depth: number): void {
    if (
      !entity.alive ||
      !flammable(entity) ||
      this.burning.has(entity.id) ||
      depth > balance.combat.maxChainDepth
    )
      return;
    this.burning.set(entity.id, {
      until: this.host.time + tuning.burnDuration,
      next: this.host.time + tuning.burnInterval,
      contact: 0,
      chain: chain ?? this.host.createCause('environment'),
      depth,
    });
    this.host.events.emit('materialReaction', {
      kind: 'ignite',
      position: { ...entity.body.position },
    });
  }

  collide(a: Entity, b: Entity): void {
    for (const [source, target] of [
      [a, b],
      [b, a],
    ]) {
      const fire = this.burning.get(source.id);
      if (!fire || fire.depth >= balance.combat.maxChainDepth) continue;
      if (materialProperties[target.definition.material]?.extinguishes) {
        this.burning.delete(source.id);
        this.host.events.emit('materialReaction', {
          kind: 'quench',
          position: { ...source.body.position },
        });
        this.host.applyDamage(target, tuning.meltDamage, fire.chain, 'Thermal', fire.depth + 1);
      } else if (fire.contact <= this.host.time) {
        fire.contact = this.host.time + tuning.burnInterval;
        this.ignite(target, fire.chain, fire.depth + 1);
        this.host.applyDamage(target, tuning.contactDamage, fire.chain, 'Thermal', fire.depth + 1);
      }
    }
  }

  onDeath(entity: Entity): void {
    this.burning.delete(entity.id);
    if (
      !['energy_cell', 'generator'].includes(entity.kind) ||
      entity.chainDepth >= balance.combat.maxChainDepth ||
      this.discharges.length >= tuning.maxArcs
    )
      return;
    this.discharges.push({
      position: { ...entity.body.position },
      radius: tuning.dischargeRadius,
      chain: entity.chainId ?? this.host.createCause('environment'),
      depth: entity.chainDepth + 1,
    });
  }

  tick(): void {
    for (const [id, fire] of this.burning) {
      const entity = this.host.world.entities.get(id);
      if (!entity?.alive || fire.until <= this.host.time) {
        this.burning.delete(id);
        continue;
      }
      if (fire.next <= this.host.time) {
        fire.next = this.host.time + tuning.burnInterval;
        this.host.applyDamage(entity, tuning.burnDamage, fire.chain, 'Thermal', fire.depth);
      }
    }
    // One breadth-first traversal per pulse; insulating gaps and walls interrupt it.
    let budget = tuning.maxArcs;
    while (this.discharges.length && budget > 0) {
      const pulse = this.discharges.shift()!;
      const visited = new Set<number>();
      const frontier = [pulse];
      while (frontier.length && budget > 0) {
        const current = frontier.shift()!;
        if (current.depth > balance.combat.maxChainDepth) continue;
        for (const target of [...this.host.world.entities.values()]) {
          if (
            !target.alive ||
            visited.has(target.id) ||
            !conducts(target) ||
            Math.hypot(
              target.body.position.x - current.position.x,
              target.body.position.y - current.position.y,
            ) >
              current.radius + target.definition.radius ||
            Matter.Query.ray(this.host.world.walls, current.position, target.body.position).length
          )
            continue;
          visited.add(target.id);
          budget--;
          const position = { ...target.body.position };
          this.host.events.emit('materialReaction', {
            kind: 'arc',
            position,
            from: { ...current.position },
          });
          this.host.applyDamage(
            target,
            tuning.arcDamage,
            current.chain,
            'Conductive',
            current.depth,
          );
          frontier.push({
            ...current,
            position,
            radius: target.definition.radius + tuning.arcGap,
            depth: current.depth + 1,
          });
          if (budget <= 0) break;
        }
      }
    }
    // Never defer an unbounded cascading work queue into later frames.
    if (budget <= 0) this.discharges.length = 0;
  }
}
