import { classes } from './classes';
import type { Phenomenon } from './phenomena';
export const modes = [
  { id: 'quick', name: 'Quick Run', regions: 1, description: 'One region and its guardian.' },
  {
    id: 'standard',
    name: 'Standard Expedition',
    regions: 3,
    description: 'A three-region journey.',
  },
  {
    id: 'long',
    name: 'Long Expedition',
    regions: 5,
    description: 'Five regions with one persistent build.',
  },
  {
    id: 'campaign',
    name: 'Story Expedition',
    regions: 8,
    description: 'Travel through all eight regions and five story acts.',
  },
  {
    id: 'endless',
    name: 'Endless Frontier',
    regions: Infinity,
    description: 'Regions repeat with escalating physics rules.',
  },
  {
    id: 'challenge',
    name: 'Anomaly Challenge',
    regions: 1,
    description: 'One region under an intense rotating gravity field.',
  },
  {
    id: 'boss_rush',
    name: 'Boss Rush',
    regions: 1,
    description: 'Five guardians in sequence, with upgrades between encounters.',
  },
  {
    id: 'gauntlet',
    name: 'Elite Gauntlet',
    regions: 1,
    description: 'Six elite chambers followed by a guardian.',
  },
  {
    id: 'daily',
    name: 'Daily Gravity Challenge',
    regions: 1,
    description: 'A fixed seed and class, with no permanent loadout bonuses.',
  },
  {
    id: 'weekly',
    name: 'Weekly Anomaly',
    regions: 1,
    description: 'A fixed weekly gravity rule and starting build.',
  },
] as const;
export type RunMode = (typeof modes)[number]['id'];
export function rotatingChallenge(
  mode: 'daily' | 'weekly',
  date = new Date(),
): { seed: string; classId: string; phenomenon: Phenomenon } {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (mode === 'weekly') day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const number = Math.floor(day.getTime() / 86400000);
  const index = mode === 'weekly' ? Math.floor(number / 7) : number;
  return {
    seed: `${mode}:${day.toISOString().slice(0, 10)}`,
    classId: classes[((index % classes.length) + classes.length) % classes.length].id,
    phenomenon: (['rotating', 'dense', 'elastic', 'zero'] as const)[((index % 4) + 4) % 4],
  };
}
