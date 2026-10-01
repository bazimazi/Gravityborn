import type { Game } from '../gameplay/game';
import { relicById } from '../content/relics';
import { conditionsMatch } from '../progression/modifiers';

export interface StatusBadge {
  label: string;
  description: string;
}
export function statusBadges(game: Game): StatusBadge[] {
  if (!['playing', 'paused'].includes(game.state)) return [];
  const badges: StatusBadge[] = [];
  if (game.player.invulnerability > 0)
    badges.push({
      label:
        game.player.invulnerability > 60
          ? 'Training shield'
          : `Shield ${game.player.invulnerability.toFixed(1)}s`,
      description: 'Your core is temporarily protected from damage.',
    });
  if (game.abilities.stored >= 1)
    badges.push({
      label: `Stored ${Math.floor(game.abilities.stored)}`,
      description: 'Stored charge strengthens Stored Burst and is spent when it fires.',
    });
  const modifiers = game.abilities.modifiers;
  const rush = modifiers.remaining('temporary:chain-rush', game.time);
  if (rush > 0)
    badges.push({
      label: `Chain rush ${rush.toFixed(1)}s`,
      description: `Regenerate ${modifiers.values.get('temporary:chain-rush')!.value} extra energy per second after a long player-caused chain.`,
    });
  const context = game.abilities.context();
  const active = new Set<string>();
  for (const rule of [...modifiers.values.values(), ...modifiers.rules.values()]) {
    if (!rule.conditions || !conditionsMatch(rule.conditions, context)) continue;
    const [source, id] = rule.id.split(':');
    if (source === 'relic' && relicById.has(id)) active.add(id);
  }
  for (const id of active) {
    const relic = relicById.get(id)!;
    badges.push({ label: relic.name, description: `Condition met. ${relic.description}` });
  }
  return badges;
}
