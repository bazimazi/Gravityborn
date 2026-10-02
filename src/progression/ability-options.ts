import { abilityById, type AbilityDefinition } from '../content/abilities';

/** Gate acquisition, not casts or restoration of powers already owned. */
export function canDevelopAbility(
  ability: AbilityDefinition,
  levels: ReadonlyMap<string, number>,
): boolean {
  if (!ability.requiresConstruct || (levels.get(ability.id) ?? 0) > 0) return true;
  for (const [id, level] of levels) {
    if (level <= 0) continue;
    const source = abilityById.get(id);
    if (ability.requiresConstruct === 'planet' && source?.effect === 'planet') return true;
    if (source?.effect !== 'tether') continue;
    if (ability.requiresConstruct === 'tether') return true;
    if (ability.requiresConstruct === 'anchor' && source.parameters?.tetherTopology === 'anchor')
      return true;
  }
  return false;
}
