import type { Expedition } from '../progression/expedition';
import { biomes } from '../content/rooms';
import { relicById } from '../content/relics';

const escape = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
export function expeditionView(run: Expedition): string {
  const stats = `<p class="run-stats mono">${escape(biomes[run.biome].name)} · LEVEL ${run.build.level} · ${run.build.currency} SHARDS · ${Math.ceil(run.game.player.health)} / ${run.game.maxHealth} INTEGRITY</p>`;
  let content = '';
  if (run.build.pending > 0 && run.phase !== 'summary')
    content = `<h2>Choose your next power</h2><p>Level ${run.build.level} · ${run.build.pending} upgrade${run.build.pending === 1 ? '' : 's'} available</p><div class="run-choices">${run.build
      .offer()
      .map(
        (choice) =>
          `<button class="run-card" data-upgrade="${choice.id}"><small>${choice.kind.toUpperCase()}</small><strong>${escape(choice.name)}</strong><span>${escape(choice.description)}</span></button>`,
      )
      .join('')}</div>`;
  else if (run.phase === 'map')
    content = `<h2>Choose your route</h2><p>Choose an illuminated chamber to continue. Every route reaches the region's guardian.</p><div class="run-map" aria-label="Expedition map">${Array.from(
      { length: 7 },
      (_, row) =>
        `<div class="map-row"><span class="mono">${row + 1}</span>${run.map
          .filter((node) => node.row === row)
          .map(
            (node) =>
              `<button data-room="${node.id}" class="map-node ${node.visited ? 'visited' : ''}" ${run.available.some((candidate) => candidate.id === node.id) ? '' : 'disabled'}>${node.visited ? '✓ ' : ''}${node.type.toUpperCase()}</button>`,
          )
          .join('')}</div>`,
    ).join('')}</div>`;
  else if (run.phase === 'shop')
    content = `<h2>The salvage trader</h2><p>${escape(run.message)}</p><div class="run-choices">${run.shop
      .map((item) => {
        const relic = relicById.get(item.id)!;
        return `<button class="run-card" data-buy="${item.id}" ${item.sold || run.build.currency < item.price ? 'disabled' : ''}><small>${item.sold ? 'OWNED' : `${item.price} SHARDS`}</small><strong>${escape(relic.name)}</strong><span>${escape(relic.description)}</span></button>`;
      })
      .join(
        '',
      )}</div><button class="primary-button" data-run-action="leave-shop">Continue onward</button>`;
  else if (run.phase === 'event')
    content = `<h2>The fractured core</h2><p>${escape(run.message)}</p><div class="run-choices"><button class="run-card" data-event="risk" ${run.game.player.health <= 25 ? 'disabled' : ''}><strong>Overload the core</strong><span>Lose 25 integrity. Gain a rare or legendary relic.</span></button><button class="run-card" data-event="repair"><strong>Salvage its shell</strong><span>Restore 18 integrity.</span></button><button class="run-card" data-event="leave"><strong>Leave it intact</strong><span>Continue without changing your core.</span></button></div>`;
  else if (run.phase === 'reward')
    content = `<h2>Chamber secured</h2><p>${escape(run.message)}</p><button class="primary-button" data-run-action="advance">Continue expedition →</button>`;
  else if (run.phase === 'summary')
    content = `<h2>${run.won ? 'Expedition complete' : 'The core went dark'}</h2><p>${escape(run.message)}</p><p>${run.rooms} rooms explored · ${run.kills} hostiles defeated · ${Math.floor(run.elapsed / 60)}m ${Math.floor(run.elapsed % 60)}s</p><p class="mono">SEED ${escape(run.seed)}</p><button class="primary-button" data-run-action="new">New expedition</button><button class="text-button" data-run-action="lab">Return to laboratory</button>`;
  return `<div class="run-content">${stats}${content}<details class="run-build"><summary>Your build · ${run.build.relics.length} relics</summary><p>${run.build.relics.map((id) => escape(relicById.get(id)!.name)).join(' · ') || 'No relics yet'}</p><p>${run.build.activeSynergies.map(escape).join(' · ')}</p></details></div>`;
}
