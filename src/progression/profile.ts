import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';
import type { Expedition } from './expedition';
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
    for (const [id, amount] of Object.entries(record(data.mastery ?? {})))
      if (classById.has(id)) profile.mastery[id] = Math.floor(finite(amount, 0, 100000000));
    for (const [id, level] of Object.entries(record(data.equipment ?? {})))
      if (id.length < 100) profile.equipment[id] = Math.floor(finite(level, 1, 20));
    for (const [slot, id] of Object.entries(record(data.loadout ?? {})))
      if (slot.length < 30 && typeof id === 'string' && id.length < 100) profile.loadout[slot] = id;
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
  for (const id of [...run.build.relics, ...run.game.abilities.levels.keys()])
    if (!profile.discoveries.includes(id)) profile.discoveries.push(id);
  return true;
}
