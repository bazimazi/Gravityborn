import type { Expedition } from '../progression/expedition';
import { biomes } from '../content/rooms';
import { relicById } from '../content/relics';
import { encounters } from '../content/events';
import { story } from '../content/story';
import { canBuy, shopDescription } from '../progression/shop';
import { wellEvolutions } from '../content/well';
import { abilityById } from '../content/abilities';
import type { UpgradeChoice } from '../progression/build';

const escape = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
export function upgradeMetadata(run: Expedition, choice: UpgradeChoice): string {
  const ability = abilityById.get(choice.target);
  const current =
    choice.kind === 'well'
      ? run.build.wellLevel
      : choice.kind === 'ability'
        ? (run.game.abilities.levels.get(choice.target) ?? 0)
        : run.build.passives.filter((id) => id === choice.target).length;
  const evolved =
    ability && current >= ability.maxLevel ? abilityById.get(ability.evolution ?? '') : undefined;
  const definition = evolved ?? ability;
  const relic = choice.kind === 'relic' ? relicById.get(choice.target) : undefined;
  const rarity =
    relic?.rarity ?? definition?.rarity ?? (choice.kind === 'well' ? 'rare' : 'common');
  const tags =
    relic?.tags ??
    definition?.tags ??
    (choice.kind === 'well' ? ['Gravity', 'Control', 'Well'] : ['Core']);
  const level =
    choice.kind === 'relic'
      ? 'NEW RELIC'
      : evolved
        ? `LEVEL ${current} · EVOLVES`
        : `LEVEL ${current} → ${current + 1}`;
  return `<small>${rarity.toUpperCase()} · ${level}</small><span class="upgrade-tags">${tags.map(escape).join(' · ')}</span>`;
}
export function expeditionView(run: Expedition): string {
  const stats = `<p class="run-stats mono">${escape(biomes[run.biome].name)} · LEVEL ${run.build.level} · ${run.build.currency} SHARDS · ${Math.ceil(run.game.player.health)} / ${run.game.maxHealth} INTEGRITY</p><p class="well-evolution">${wellEvolutions[run.build.wellLevel - 1].name}</p>`;
  let content = '';
  if (run.build.pending > 0 && run.phase !== 'summary')
    content = `<h2>Choose your next power</h2><p>Level ${run.build.level} · ${run.build.pending} upgrade${run.build.pending === 1 ? '' : 's'} available</p><div class="run-choices">${run.build
      .offer()
      .map(
        (choice) =>
          `<button class="run-card" data-upgrade="${choice.id}"><small>${choice.kind.toUpperCase()}</small><strong>${escape(choice.name)}</strong><span>${escape(choice.description)}</span>${upgradeMetadata(run, choice)}</button>`,
      )
      .join(
        '',
      )}</div><button class="text-button" data-run-action="reroll" ${run.build.rerolls ? '' : 'disabled'}>Reroll · ${run.build.rerolls} remaining</button>`;
  else if (run.phase === 'map')
    content = `<h2>Choose your route</h2><div class="story-card"><strong>ACT ${escape(story[run.biome].act)} · ${escape(story[run.biome].title)}</strong>${escape(story[run.biome].intro)}</div><p>Choose an illuminated chamber to continue. Every route reaches the region's guardian.</p><div class="run-map" aria-label="Expedition map">${Array.from(
      { length: Math.max(...run.map.map((node) => node.row)) + 1 },
      (_, row) =>
        `<div class="map-row"><span class="mono">${row + 1}</span>${run.map
          .filter((node) => node.row === row && run.isRevealed(node))
          .map(
            (node) =>
              `<button data-room="${node.id}" class="map-node ${node.visited ? 'visited' : ''}" ${run.available.some((candidate) => candidate.id === node.id) ? '' : 'disabled'}>${node.visited ? '✓ ' : ''}${node.type.toUpperCase()}</button>`,
          )
          .join('')}</div>`,
    ).join('')}</div>`;
  else if (run.phase === 'shop')
    content = `<h2>The salvage trader</h2><p>${escape(run.message)}</p><div class="run-choices">${run.shop
      .map((item) => {
        const description = shopDescription(item.id)!;
        return `<button class="run-card" data-buy="${item.id}" ${canBuy(run.build, item) ? '' : 'disabled'}><small>${item.sold ? 'PURCHASED' : `${item.price} SHARDS`}</small><strong>${escape(description.name)}</strong><span>${escape(description.description)}</span></button>`;
      })
      .join(
        '',
      )}</div><button class="primary-button" data-run-action="leave-shop">Continue onward</button>`;
  else if (run.phase === 'event') {
    const encounter = encounters.find((encounter) => encounter.id === run.eventId)!;
    content = `<h2>${escape(encounter.name)}</h2><p>${escape(encounter.text)}</p><div class="run-choices">${encounter.choices.map((choice) => `<button class="run-card" data-event="${choice.id}" ${run.canResolveEvent(choice.id) ? '' : 'disabled'}><strong>${escape(choice.name)}</strong><span>${escape(choice.description)}</span></button>`).join('')}</div>`;
  } else if (run.phase === 'reward')
    content = `<h2>Chamber secured</h2><p>${escape(run.message)}</p><button class="primary-button" data-run-action="advance">Continue expedition →</button>`;
  else if (run.phase === 'summary')
    content = `<h2>${run.won ? 'Expedition complete' : 'The core went dark'}</h2><p>${escape(run.message)}</p><p>${run.rooms} rooms explored · ${run.kills} hostiles defeated · ${Math.floor(run.elapsed / 60)}m ${Math.floor(run.elapsed % 60)}s</p><p class="mono">SEED ${escape(run.seed)}</p><button class="primary-button" data-run-action="new">New expedition</button><button class="text-button" data-run-action="lab">Return to laboratory</button>`;
  return `<div class="run-content">${stats}${content}<details class="run-build"><summary>Your build · ${run.build.relics.length} relics</summary><p>${run.build.relics.map((id) => escape(relicById.get(id)!.name)).join(' · ') || 'No relics yet'}</p>${run.build.synergyDefinitions.map((item) => `<p><strong>${escape(item.name)}</strong> · ${escape(item.description)}</p>`).join('')}</details></div>`;
}
