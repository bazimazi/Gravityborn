import { abilities } from '../content/abilities';
import { entityDefinitions } from '../content/enemies';
import { bossDefinitions, bossDescriptions, type BossKind } from '../content/bosses';
import { relics } from '../content/relics';
import { equipment } from '../content/equipment';
import { phenomena } from '../content/phenomena';
import { planets, story, secretLore } from '../content/story';
import { challenges } from '../content/challenges';
import { coreCosmetics, challengeMemories } from '../content/cosmetics';
import { challengeProgress } from '../progression/challenges';
import { freshMastery, masteryLevel } from '../progression/mastery';
import type { Profile } from '../progression/profile';
import { materialDescriptions } from '../content/objects';
import { eliteCompatibility, type VariantKind } from '../content/variants';
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
          text: `Mass ${definition.mass}; integrity ${definition.health}; gravity response ${definition.gravityResponse}. Tags: ${definition.tags.join(', ')}. Elite variants: ${eliteCompatibility[id as VariantKind]?.join(', ') ?? 'none'}.`,
          known: known(`enemy:${id}`),
        })),
    },
    {
      name: 'Bosses',
      entries: Object.entries(bossDefinitions).map(([id, definition]) => ({
        id: `boss:${id}`,
        name: definition.name,
        text: `Three phases. ${bossDescriptions[id as BossKind]}`,
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
        text: `${item.description} Slot: ${item.slot}; family: ${item.set}. Tags: ${item.tags.join(', ')}.`,
        known: Boolean(profile.equipment[item.id]),
      })),
    },
    {
      name: 'Planets',
      entries: planets.map((planet) => ({
        id: planet.id,
        name: planet.name,
        text: `${planet.biome}. Relative mass ${planet.mass}; radius ${planet.radius} km; gravity index ${planet.gravity}. Atmosphere: ${planet.atmosphere}. ${planet.property}. Resource: ${planet.resource}. Hostiles: ${planet.enemies
          .map((id) => {
            const entity = entityDefinitions[id];
            return 'name' in entity ? entity.name : id;
          })
          .join(
            ', ',
          )}. Common anomalies: ${planet.anomalies.map((id) => phenomena.find((entry) => entry.id === id)!.name).join(', ')}. Guardian: ${planet.boss}.`,
        known: known(planet.id),
      })),
    },
    {
      name: 'Materials',
      entries: materialDescriptions.map((material) => ({ ...material, known: true })),
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
      name: 'Hidden Archives',
      entries: secretLore.map((entry, index) => ({
        ...entry,
        id: `lore:secret:${index}`,
        known: known(`lore:secret:${index}`),
      })),
    },
    {
      name: 'Challenges',
      entries: challenges.map((challenge) => ({
        id: challenge.id,
        name: challenge.name,
        text: `${challenge.description} Progress: ${Math.min(challenge.target, Math.floor(challengeProgress(profile, challenge)))} / ${challenge.target}. Reward: ${challenge.shards} shards and ${challenge.research} research.${challenge.title ? ` Title: ${challenge.title}.` : ''}${coreCosmetics
          .filter((item) => item.challenge === challenge.id)
          .map((item) => ` Shell: ${item.name}.`)
          .join(
            '',
          )}${challengeMemories.some((item) => item.challenge === challenge.id) ? ' A recovered memory.' : ''}${profile.challenges.includes(challenge.id) ? ' Completed.' : ''}`,
        known: true,
      })),
    },
  ];
  sections.push({
    name: 'Challenge Memories',
    entries: challengeMemories.map((memory) => ({
      id: `memory:${memory.challenge}`,
      name: memory.name,
      text: memory.text,
      known: profile.challenges.includes(memory.challenge),
    })),
  });
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
