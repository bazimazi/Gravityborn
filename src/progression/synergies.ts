import { abilityById } from '../content/abilities';
import type { SynergyDefinition } from '../content/relics';

/** A learned descendant still satisfies its ancestor's build requirement. */
export function matchesSynergy(
  synergy: SynergyDefinition,
  powers: ReadonlySet<string>,
  buildTags: readonly string[] = [],
): boolean {
  if (!(synergy.requires?.length || synergy.requiresTags?.length)) return false;
  const hasFamily = (required: string): boolean => {
    const seen = new Set<string>();
    let id: string | undefined = required;
    while (id && !seen.has(id)) {
      if (powers.has(id)) return true;
      seen.add(id);
      id = abilityById.get(id)?.evolution;
    }
    return false;
  };
  const tags = new Set([
    ...buildTags,
    ...[...powers].flatMap((id) => abilityById.get(id)?.tags ?? []),
  ]);
  return (
    (synergy.requires ?? []).every(hasFamily) &&
    (synergy.requiresTags ?? []).every((tag) => tags.has(tag))
  );
}
