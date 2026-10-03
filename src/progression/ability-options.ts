import { abilities, abilityById, type AbilityDefinition } from '../content/abilities';

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

/** The power a level-up would grant; locked and exhausted choices have no result. */
export function nextAbilityUpgrade(
  id: string,
  levels: ReadonlyMap<string, number>,
): AbilityDefinition | undefined {
  const ability = abilityById.get(id);
  if (!ability || !canDevelopAbility(ability, levels)) return;
  const current = levels.get(id) ?? 0;
  if (current >= ability.maxLevel) {
    if (!ability.evolution || levels.has(ability.evolution)) return;
    const evolved = abilityById.get(ability.evolution);
    return evolved && canDevelopAbility(evolved, levels) ? evolved : undefined;
  }
  if (!current && abilities.some((parent) => parent.evolution === id)) return;
  return ability;
}
