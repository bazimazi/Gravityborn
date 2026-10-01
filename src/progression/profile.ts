import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';
import type { Expedition } from './expedition';
import { equipmentById, affixes } from '../content/equipment';
import { researchNodes, mutations } from '../content/research';
import { readMastery, mergeMastery, type MasteryProgress } from './mastery';
import { challenges } from '../content/challenges';
import { challengeProgress } from './challenges';
export interface Profile {
  shards: number;
  research: number;
  runs: number;
  wins: number;
  kills: number;
  classes: string[];
  selectedClass: string;
  claimed: string[];
  discoveries: string[];
  mastery: Record<string, number>;
  skills: string[];
  equipment: Record<string, number>;
  loadout: Record<string, string>;
  affixes: Record<string, string>;
  mutation: string;
  abilityMastery: Record<string, MasteryProgress>;
  metrics: Record<string, number>;
  challenges: string[];
}
export function newProfile(): Profile {
  return {
    shards: 0,
    research: 0,
    runs: 0,
    wins: 0,
    kills: 0,
    classes: ['manipulator'],
    selectedClass: 'manipulator',
    claimed: [],
    discoveries: [],
    mastery: {},
    skills: [],
    equipment: {},
    loadout: {},
    affixes: {},
    mutation: '',
    abilityMastery: {},
    metrics: {},
    challenges: [],
  };
}
export function readProfile(value: unknown): Profile {
  try {
    const data = record(value);
    const profile = newProfile();
    for (const key of ['shards', 'research', 'runs', 'wins', 'kills'] as const)
      profile[key] = Math.floor(finite(data[key], 0, 100000000));
    profile.classes = strings(data.classes, 8).filter((id) => classById.has(id));
    if (!profile.classes.includes('manipulator')) profile.classes.push('manipulator');
    if (typeof data.selectedClass === 'string' && profile.classes.includes(data.selectedClass))
      profile.selectedClass = data.selectedClass;
    profile.claimed = strings(data.claimed, 200);
    profile.discoveries = strings(data.discoveries, 1000);
    profile.skills = strings(data.skills ?? [], 100);
    profile.abilityMastery = readMastery(data.abilityMastery ?? {});
    profile.challenges = strings(data.challenges ?? [], Math.max(1000, challenges.length)).filter(
      (id) => challenges.some((challenge) => challenge.id === id),
    );
    for (const [id, value] of Object.entries(record(data.metrics ?? {})))
      if (id.length < 50) profile.metrics[id] = finite(value, 0, 100000000);
    for (const [id, amount] of Object.entries(record(data.mastery ?? {})))
      if (classById.has(id)) profile.mastery[id] = Math.floor(finite(amount, 0, 100000000));
    for (const [id, level] of Object.entries(record(data.equipment ?? {})))
      if (equipmentById.has(id)) profile.equipment[id] = Math.floor(finite(level, 1, 5));
    for (const [slot, id] of Object.entries(record(data.loadout ?? {})))
      if (typeof id === 'string' && equipmentById.get(id)?.slot === slot && profile.equipment[id])
        profile.loadout[slot] = id;
    for (const [id, affix] of Object.entries(record(data.affixes ?? {})))
      if (
        profile.equipment[id] &&
        typeof affix === 'string' &&
        affixes.some((item) => item.id === affix)
      )
        profile.affixes[id] = affix;
    if (
      typeof data.mutation === 'string' &&
      mutations.some((mutation) => mutation.id === data.mutation)
    )
      profile.mutation = data.mutation;
    return profile;
  } catch {
    return newProfile();
  }
}
export function unlockClass(profile: Profile, id: string): boolean {
  const definition = classById.get(id);
  if (!definition || profile.classes.includes(id) || profile.shards < definition.cost) return false;
  profile.shards -= definition.cost;
  profile.classes.push(id);
  return true;
}
export function settleRun(profile: Profile, run: Expedition): boolean {
  if (run.phase !== 'summary' || profile.claimed.includes(run.id)) return false;
  profile.claimed.push(run.id);
  profile.claimed = profile.claimed.slice(-200);
  profile.runs++;
  profile.wins += Number(run.won);
  profile.kills += run.kills;
  profile.shards += Math.max(1, run.rooms * 3 + Math.floor(run.kills / 2) + (run.won ? 25 : 0));
  profile.research += Math.floor(run.rooms / 2) + (run.won ? 5 : 0);
  profile.mastery[run.classId] = (profile.mastery[run.classId] ?? 0) + run.kills;
  mergeMastery(profile.abilityMastery, run.mastery);
  for (const [id, value] of Object.entries(run.metrics))
    profile.metrics[id] = (profile.metrics[id] ?? 0) + value;
  profile.metrics.kills = profile.kills;
  profile.metrics.chain = Math.max(profile.metrics.chain ?? 0, run.bestChain);
  for (const id of run.discoveries)
    if (!profile.discoveries.includes(id)) profile.discoveries.push(id);
  for (const id of [...run.build.relics, ...run.game.abilities.levels.keys()])
    if (!profile.discoveries.includes(id)) profile.discoveries.push(id);
  for (let biome = run.startBiome; biome <= run.biome; biome++)
    if (!profile.discoveries.includes(`biome:${biome}`)) profile.discoveries.push(`biome:${biome}`);
  for (const challenge of challenges)
    if (
      !profile.challenges.includes(challenge.id) &&
      challengeProgress(profile, challenge) >= challenge.target
    ) {
      profile.challenges.push(challenge.id);
      profile.shards += challenge.shards;
      profile.research += challenge.research;
      if (challenge.equipment && !profile.equipment[challenge.equipment])
        profile.equipment[challenge.equipment] = 1;
    }
  return true;
}
export function purchaseResearch(profile: Profile, id: string): boolean {
  const node = researchNodes.find((node) => node.id === id);
  if (
    !node ||
    profile.skills.includes(id) ||
    profile.research < node.cost ||
    (node.requires && !profile.skills.includes(node.requires))
  )
    return false;
  profile.research -= node.cost;
  profile.skills.push(id);
  return true;
}
export function craftEquipment(profile: Profile, id: string): boolean {
  const item = equipmentById.get(id);
  if (!item || profile.equipment[id] || profile.shards < item.cost) return false;
  profile.shards -= item.cost;
  profile.equipment[id] = 1;
  profile.loadout[item.slot] = id;
  return true;
}
export function upgradeEquipment(profile: Profile, id: string): boolean {
  const level = profile.equipment[id];
  if (equipmentById.get(id)?.rarity === 'legendary') return false;
  if (!level || level >= 5 || profile.research < level + 1) return false;
  profile.research -= level + 1;
  profile.equipment[id]++;
  return true;
}
export function reforgeEquipment(profile: Profile, id: string, affix: string): boolean {
  if (
    !profile.skills.includes('affixes') ||
    !profile.equipment[id] ||
    profile.research < 3 ||
    !affixes.some((item) => item.id === affix) ||
    profile.affixes[id] === affix
  )
    return false;
  profile.research -= 3;
  profile.affixes[id] = affix;
  return true;
}
