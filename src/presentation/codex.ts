import { abilities } from '../content/abilities';
import { entityDefinitions } from '../content/enemies';
import { bossDefinitions } from '../content/bosses';
import { relics } from '../content/relics';
import { equipment } from '../content/equipment';
import { phenomena } from '../content/phenomena';
import { planets, story } from '../content/story';
import { challenges } from '../content/challenges';
import { freshMastery, masteryLevel } from '../progression/mastery';
import type { Profile } from '../progression/profile';
interface Entry {
  id: string;
  name: string;
  text: string;
  known: boolean;
}
export function codexView(profile: Profile): string {
  const known = (id: string): boolean =>
    profile.discoveries.includes(id) ||
    profile.discoveries.includes(id.split(':').slice(1).join(':'));
  const sections: { name: string; entries: Entry[] }[] = [
    {
      name: 'Abilities',
      entries: abilities.map((ability) => ({
        id: `ability:${ability.id}`,
        name: ability.name,
        text: `${ability.description} Tags: ${ability.tags.join(', ')}. Energy ${ability.energy}; cooldown ${ability.cooldown}s.`,
        known: known(`ability:${ability.id}`) || ['pulse', 'slingshot'].includes(ability.id),
      })),
    },
    {
      name: 'Enemies',
      entries: Object.entries(entityDefinitions)
        .filter(
          ([id, definition]) =>
            definition.faction === 'enemy' && id !== 'projectile' && !(id in bossDefinitions),
        )
        .map(([id, definition]) => ({
          id: `enemy:${id}`,
          name: 'name' in definition ? definition.name : id,
          text: `Mass ${definition.mass}; integrity ${definition.health}; gravity response ${definition.gravityResponse}. Tags: ${definition.tags.join(', ')}.`,
          known: known(`enemy:${id}`),
        })),
    },
    {
      name: 'Bosses',
      entries: Object.entries(bossDefinitions).map(([id, definition]) => ({
        id: `boss:${id}`,
        name: definition.name,
        text: `Three phases. ${id === 'inverter' ? 'Changes global gravity and emits repulsive fields.' : id === 'planet_eater' ? 'Creates moving, destructible gravity sources.' : id === 'architect' ? 'Builds temporary walls near your path and localized vortices.' : id === 'star' ? 'Emits outward waves that launch loose matter.' : 'Pulls the arena toward a growing singularity.'}`,
        known: known(`boss:${id}`),
      })),
    },
    {
      name: 'Relics',
      entries: relics.map((relic) => ({
        id: `relic:${relic.id}`,
        name: relic.name,
        text: `${relic.description} Rarity: ${relic.rarity}.`,
        known: known(`relic:${relic.id}`),
      })),
    },
    {
      name: 'Equipment',
      entries: equipment.map((item) => ({
        id: `equipment:${item.id}`,
        name: item.name,
        text: `${item.description} Slot: ${item.slot}; family: ${item.set}.`,
        known: Boolean(profile.equipment[item.id]),
      })),
    },
    {
      name: 'Planets',
      entries: planets.map((planet) => ({
        id: planet.id,
        name: planet.name,
        text: `${planet.biome}. Relative mass ${planet.mass}; radius ${planet.radius} km; gravity index ${planet.gravity}. Atmosphere: ${planet.atmosphere}. ${planet.property}. Resource: ${planet.resource}. Guardian: ${planet.boss}.`,
        known: known(planet.id),
      })),
    },
    {
      name: 'Materials',
      entries: [
        {
          id: 'metal',
          name: 'Metal',
          text: 'Crates, barrels, and drones carry substantial mass. Dense objects make effective impact weapons.',
          known: true,
        },
        {
          id: 'stone',
          name: 'Stone',
          text: 'Heavy rocks survive impacts and transfer their momentum into enemies.',
          known: true,
        },
        {
          id: 'plasma',
          name: 'Plasma',
          text: 'Hostile projectiles have mass and respond strongly to fields. Redirect them before impact.',
          known: true,
        },
        {
          id: 'energy',
          name: 'Core energy',
          text: 'Your core resists part of the global gravity vector. Powers consume energy that recovers over time.',
          known: true,
        },
      ],
    },
    {
      name: 'Gravity Phenomena',
      entries: phenomena.map((phenomenon) => ({
        id: `phenomenon:${phenomenon.id}`,
        name: phenomenon.name,
        text: phenomenon.description,
        known: known(`phenomenon:${phenomenon.id}`),
      })),
    },
    {
      name: 'Lore & Discoveries',
      entries: story.map((chapter, index) => ({
        id: `lore:${index}`,
        name: `Act ${chapter.act} · ${chapter.title}`,
        text: `${chapter.intro} ${chapter.memory}`,
        known: known(`lore:${index}`),
      })),
    },
    {
      name: 'Challenges',
      entries: challenges.map((challenge) => ({
        id: challenge.id,
        name: challenge.name,
        text: `${challenge.description} Progress: ${Math.min(challenge.target, Math.floor(profile.metrics[challenge.metric] ?? 0))} / ${challenge.target}. Reward: ${challenge.shards} shards and ${challenge.research} research.${profile.challenges.includes(challenge.id) ? ' Completed.' : ''}`,
        known: true,
      })),
    },
  ];
  const escape = (text: string): string =>
    text.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  return `<details><summary>Codex & collection</summary><p class="dialog-copy">Discoveries are recorded when an expedition ends, including a defeat. Challenge rewards unlock equipment and research.</p>${sections.map((section) => `<details><summary>${section.name} · ${section.entries.filter((entry) => entry.known).length} / ${section.entries.length}</summary><div class="codex-grid">${section.entries.map((entry) => `<article class="codex-entry ${entry.known ? '' : 'undiscovered'}"><h3>${entry.known ? escape(entry.name) : 'Undiscovered'}</h3><p>${entry.known ? escape(entry.text) : 'Explore further to record this discovery.'}</p></article>`).join('')}</div></details>`).join('')}</details>
  <details><summary>Ability mastery</summary><p class="dialog-copy">Five milestones for each power: cast 50 times, cause 100 kills, defeat an elite, create a 10-effect chain, and win with at least half your kills attributed to that power.</p><div class="codex-grid">${[
    { id: 'well', name: 'Gravity Well' },
    { id: 'flip', name: 'Gravity Flip' },
    ...abilities,
  ]
    .map((ability) => {
      const progress = profile.abilityMastery[ability.id] ?? freshMastery();
      return `<article class="codex-entry"><h3>${ability.name} · ${masteryLevel(progress)} / 5</h3><p>${progress.casts} casts · ${progress.kills} kills · ${progress.elites} elites · ${progress.chain} best chain · ${progress.wins} mastery victories</p></article>`;
    })
    .join('')}</div></details>`;
}
