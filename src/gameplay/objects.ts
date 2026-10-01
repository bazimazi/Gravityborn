import type { AbilityHost } from './abilities';
import type { Entity } from '../physics/world';
import { length, subtract } from '../core/vector';
interface ObjectHost extends AbilityHost {
  detonate(entity: Entity): void;
  recoverEnergy(amount: number): void;
}
export class ObjectSystem {
  private readonly fields = new Map<number, number>();
  constructor(private readonly host: ObjectHost) {}
  update(entity: Entity): void {
    if (['crystal', 'generator', 'gravity_core', 'fragment', 'magnet'].includes(entity.kind)) {
      let id = this.fields.get(entity.id);
      if (!id && this.host.gravity.fields.size < 48) {
        id = this.host.gravity.addField({
          source: `object:${entity.id}`,
          mode: 'radial',
          position: entity.body.position,
          direction: { x: 0, y: 1 },
          strength: entity.kind === 'generator' ? 0.004 : entity.kind === 'magnet' ? 0.005 : 0.0025,
          radius: entity.kind === 'fragment' ? 260 : 190,
          falloff: 'linear',
          remaining: 1,
          affects: entity.kind === 'magnet' ? ['metal'] : undefined,
        });
        this.fields.set(entity.id, id);
      }
      if (id) {
        const field = this.host.gravity.fields.get(id);
        if (field) {
          this.host.gravity.moveField(id, entity.body.position);
          field.remaining = 1;
        } else this.fields.delete(entity.id);
      }
    }
    if (
      entity.kind === 'mine' &&
      entity.life > 1 &&
      [...this.host.world.entities.values()].some(
        (target) =>
          target !== entity &&
          target.definition.faction === 'enemy' &&
          target.kind !== 'projectile' &&
          length(subtract(target.body.position, entity.body.position)) < 65,
      )
    )
      this.host.detonate(entity);
  }
  onDeath(entity: Entity): void {
    const field = this.fields.get(entity.id);
    if (field) {
      this.host.gravity.removeField(field);
      this.fields.delete(entity.id);
    }
    if (
      entity.kind === 'energy_cell' &&
      length(subtract(entity.body.position, this.host.player.body.position)) < 240
    )
      this.host.recoverEnergy(35);
  }
}
