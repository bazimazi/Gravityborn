import type { AbilityHost } from './abilities';
import type { Entity } from '../physics/world';
import { length, subtract } from '../core/vector';
import tuning from '../data/object-behavior.json';
import balance from '../data/balance.json';
interface ObjectHost extends AbilityHost {
  detonate(entity: Entity): void;
  recoverEnergy(amount: number): void;
}
export class ObjectSystem {
  private readonly fields = new Map<number, number>();
  constructor(private readonly host: ObjectHost) {}
  update(entity: Entity): void {
    const definition = tuning.fields[entity.kind as keyof typeof tuning.fields];
    if (definition) {
      let id = this.fields.get(entity.id);
      if (!id && this.host.gravity.fields.size < balance.physics.maxFields - 2) {
        id = this.host.gravity.addField({
          source: `object:${entity.id}`,
          mode: 'radial',
          position: entity.body.position,
          direction: { x: 0, y: 1 },
          strength: definition.strength,
          radius: definition.radius,
          falloff: 'linear',
          remaining: 1,
          affects: definition.affects.length ? definition.affects : undefined,
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
      entity.life > tuning.mineArmTime &&
      [...this.host.world.entities.values()].some(
        (target) =>
          target !== entity &&
          target.definition.faction === 'enemy' &&
          target.kind !== 'projectile' &&
          length(subtract(target.body.position, entity.body.position)) < tuning.mineTriggerRadius,
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
      length(subtract(entity.body.position, this.host.player.body.position)) <
        tuning.energyCollectionRadius
    )
      this.host.recoverEnergy(tuning.energyRecovery);
  }
}
