import type { Entity } from '../physics/world';

export const materialProperties: Record<string, { conductive: boolean; extinguishes: boolean }> = {
  metal: { conductive: true, extinguishes: false },
  plasma: { conductive: true, extinguishes: false },
  ice: { conductive: false, extinguishes: true },
};
export function conducts(entity: Entity): boolean {
  return (
    !entity.definition.tags.includes('Resource') &&
    (materialProperties[entity.definition.material]?.conductive ?? false)
  );
}
export function flammable(entity: Entity): boolean {
  return entity.definition.tags.includes('Flammable');
}
