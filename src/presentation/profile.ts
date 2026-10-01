import { classes } from '../content/classes';
import { affixes, equipment, equipmentById, equipmentSlots } from '../content/equipment';
import { mutations, researchNodes } from '../content/research';
import { biomes } from '../content/rooms';
import type { Profile } from '../progression/profile';
import type { SaveState } from '../core/save';
import { modes } from '../content/modes';
import { contracts, difficulties, difficultyDescriptions } from '../content/phenomena';
import { codexView } from './codex';
import { diagnosticsView } from './diagnostics';
import { coreCosmetics } from '../content/cosmetics';
import { challenges } from '../content/challenges';

export function profileView(profile: Profile, state: SaveState, checkpoint: boolean): string {
  const regionAllowed = (index: number): boolean =>
    index === 0 ||
    (profile.skills.includes('navigation') &&
      (profile.skills.includes('survey') || profile.discoveries.includes(`biome:${index}`)));
  return `<div class="dialog-header"><h2 id="profile-title">The observatory</h2><button data-run-action="profile-close" aria-label="Close progression">×</button></div>
  <p class="run-stats mono">${profile.shards} GRAVITY SHARDS · ${profile.research} RESEARCH · ${profile.runs} RUNS · ${profile.wins} WINS</p>
  <p class="dialog-copy">Discoveries and class mastery survive death. Expeditions save at room boundaries; reloading returns to the last saved route. Loadout changes apply to the next expedition.</p>
  ${checkpoint ? '<button class="primary-button" data-run-action="resume">Resume saved route</button>' : ''}
  <details><summary>Core appearance & titles</summary><p class="dialog-copy">Earn shells, titles and memories by completing challenges. Appearance does not change physics or combat stats.</p>
  <label class="setting-row">Core shell <select id="cosmetic-select">${coreCosmetics.map((item) => `<option value="${item.id}" ${profile.cosmetic === item.id ? 'selected' : ''} ${item.challenge && !profile.challenges.includes(item.challenge) ? 'disabled' : ''}>${item.name}${item.challenge && !profile.challenges.includes(item.challenge) ? ` · complete ${challenges.find((challenge) => challenge.id === item.challenge)!.name}` : ''}</option>`).join('')}</select></label>
  <label class="setting-row">Title <select id="title-select"><option value="">Awakened</option>${challenges
    .filter((item) => item.title)
    .map(
      (item) =>
        `<option value="${item.id}" ${profile.title === item.id ? 'selected' : ''} ${profile.challenges.includes(item.id) ? '' : 'disabled'}>${item.title}${profile.challenges.includes(item.id) ? '' : ' · locked'}</option>`,
    )
    .join('')}</select></label></details>
  <label class="setting-row">Expedition seed <input id="run-seed" maxlength="64" placeholder="Random seed"></label>
  <label class="setting-row">Run mode <select id="run-mode">${modes.map((mode) => `<option value="${mode.id}" ${mode.id === 'standard' ? 'selected' : ''} ${mode.id === 'endless' && !profile.skills.includes('endless') ? 'disabled' : ''}>${mode.name}</option>`).join('')}</select></label>
  <label class="setting-row">Difficulty <select id="run-difficulty">${difficulties.map((name, index) => `<option value="${index}">${name}</option>`).join('')}</select></label>
  <p id="difficulty-description" class="dialog-copy">${difficultyDescriptions[0]} Daily and weekly challenges use Veteran rules.</p>
  <label class="setting-row">Risk / reward contract <select id="run-contract">${contracts.map((contract) => `<option value="${contract.id}">${contract.name}</option>`).join('')}</select></label>
  <p id="mode-description" class="dialog-copy">Standard Expedition: three regions. Daily and weekly challenges use the same seed, class, and rules for everyone, without permanent bonuses.</p>
  <p id="contract-description" class="dialog-copy">Standard rewards.</p>
  <label class="setting-row">Starting region <select id="run-region">${biomes.map((biome, index) => `<option value="${index}" ${regionAllowed(index) ? '' : 'disabled'}>${biome.name}${regionAllowed(index) ? '' : ' · locked'}</option>`).join('')}</select></label>
  <details open><summary>Gravityborn classes</summary><div class="class-grid">${classes.map((definition) => `<button class="run-card" data-class="${definition.id}" ${!profile.classes.includes(definition.id) && profile.shards < definition.cost ? 'disabled' : ''}><small>${profile.classes.includes(definition.id) ? (profile.selectedClass === definition.id ? 'SELECTED' : `MASTERY ${profile.mastery[definition.id] ?? 0}`) : `UNLOCK · ${definition.cost} SHARDS`}</small><strong>${definition.name}</strong><span>${definition.description}</span></button>`).join('')}</div></details>
  <details><summary>Equipment · six slots</summary><p class="dialog-copy">Equip three pieces from one family for its set bonus. Each piece has a trade-off. Upgrades improve its primary stat by 6% per level, up to level 5.</p>
  ${equipmentSlots
    .map(
      (slot) =>
        `<label class="setting-row">${slot.toUpperCase()}<select data-equip-slot="${slot}"><option value="">Empty</option>${Object.keys(
          profile.equipment,
        )
          .filter((id) => equipmentById.get(id)?.slot === slot)
          .map(
            (id) =>
              `<option value="${id}" ${profile.loadout[slot] === id ? 'selected' : ''}>${equipmentById.get(id)!.name} +${profile.equipment[id]}</option>`,
          )
          .join('')}</select></label>`,
    )
    .join('')}
  <div class="class-grid">${Object.entries(profile.equipment)
    .map(([id, level]) => {
      const item = equipmentById.get(id);
      return item
        ? `<div class="run-card"><strong>${item.name} +${level}</strong><span>${item.description}</span><button data-upgrade-equipment="${id}" ${level >= 5 || profile.research < level + 1 || item.rarity === 'legendary' ? 'disabled' : ''}>Upgrade · ${level + 1} research</button><label>Affix <select data-affix-for="${id}" ${!profile.skills.includes('affixes') ? 'disabled' : ''}><option value="">None</option>${affixes.map((affix) => `<option value="${affix.id}" ${profile.affixes[id] === affix.id ? 'selected' : ''}>${affix.name} · 3 research</option>`).join('')}</select></label></div>`
        : '';
    })
    .join('')}</div>
  <details><summary>Craft equipment · ${equipment.length} designs</summary><div class="class-grid">${equipment.map((item) => `<button class="run-card" data-craft="${item.id}" ${profile.equipment[item.id] || profile.shards < item.cost ? 'disabled' : ''}><small>${profile.equipment[item.id] ? 'OWNED' : `${item.cost} SHARDS · ${item.slot.toUpperCase()}`}</small><strong>${item.name}</strong><span>${item.description}</span></button>`).join('')}</div></details></details>
  <details><summary>Research · six progression trees</summary><div class="class-grid">${researchNodes.map((node) => `<button class="run-card" data-research="${node.id}" ${profile.skills.includes(node.id) || profile.research < node.cost || (node.requires && !profile.skills.includes(node.requires)) ? 'disabled' : ''}><small>${node.tree.toUpperCase()} · ${profile.skills.includes(node.id) ? 'LEARNED' : `${node.cost} RESEARCH`}</small><strong>${node.name}</strong><span>${node.description}${node.requires ? ` Requires ${researchNodes.find((candidate) => candidate.id === node.requires)!.name}.` : ''}</span></button>`).join('')}</div></details>
  <label class="setting-row">Physics mutation <select id="mutation-select" ${profile.skills.includes('mutations') ? '' : 'disabled'}><option value="">None</option>${mutations.map((mutation) => `<option value="${mutation.id}" ${profile.mutation === mutation.id ? 'selected' : ''}>${mutation.name}</option>`).join('')}</select></label><p class="dialog-copy">${mutations.find((mutation) => mutation.id === profile.mutation)?.description ?? 'Research Mutable Core to select one physics mutation.'}</p>
  ${codexView(profile)}
  ${diagnosticsView(profile.diagnostics)}
  <button class="primary-button" data-run-action="new">Start selected class</button>
  <div class="save-tools"><button class="text-button" data-run-action="export">Export save</button><label class="text-button">Import save <input id="import-save" type="file" accept="application/json" hidden></label><span class="mono">SAVE: ${state.toUpperCase()}</span></div>`;
}
