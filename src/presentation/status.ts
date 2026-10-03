import type { Game } from '../gameplay/game';
import { relicById } from '../content/relics';
import { conditionsMatch } from '../progression/modifiers';
import { phenomena } from '../content/phenomena';
import { abilityById } from '../content/abilities';

export interface StatusBadge {
  label: string;
  description: string;
}
export function statusBadges(game: Game): StatusBadge[] {
  if (!['playing', 'paused'].includes(game.state)) return [];
  const badges: StatusBadge[] = [];
  if (game.rules.endlessStage > 0)
    badges.push({
      label: `Frontier ${game.rules.endlessStage}`,
      description:
        'Endless chambers add gravity rules at stages 10, 20, 30, 40, 50, 100, 200 and 500.',
    });
  for (const id of game.rules.activePhenomena) {
    const definition = phenomena.find((item) => item.id === id)!;
    badges.push({ label: definition.name, description: definition.description });
  }
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
  for (const effect of game.abilities.activePlayerEffects()) {
    const power = abilityById.get(effect.id)!;
    badges.push({
      label: `${power.name} ${effect.remaining.toFixed(1)}s`,
      description: `Temporary effect on your core. ${power.description}`,
    });
  }
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
