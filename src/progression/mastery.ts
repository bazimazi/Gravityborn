import { abilities } from '../content/abilities';
import { finite, record } from '../core/save';
export interface MasteryProgress {
  casts: number;
  kills: number;
  elites: number;
  bosses: number;
  chain: number;
  wins: number;
}
export const freshMastery = (): MasteryProgress => ({
  casts: 0,
  kills: 0,
  elites: 0,
  bosses: 0,
  chain: 0,
  wins: 0,
});
export function masteryLevel(progress: MasteryProgress): number {
  if (progress.casts < 50) return 0;
  if (progress.kills < 100) return 1;
  if (progress.elites < 1) return 2;
  if (progress.chain < 10) return 3;
  if (progress.wins < 1) return 4;
  return 5;
}
export function readMastery(value: unknown): Record<string, MasteryProgress> {
  const output: Record<string, MasteryProgress> = {};
  for (const [id, item] of Object.entries(record(value ?? {}))) {
    if (!['well', 'flip', ...abilities.map((ability) => ability.id)].includes(id)) continue;
    const data = record(item);
    const progress = freshMastery();
    for (const key of Object.keys(progress) as (keyof MasteryProgress)[])
      progress[key] = Math.floor(finite(data[key] ?? 0, 0, 100000000));
    output[id] = progress;
  }
  return output;
}
export function mergeMastery(
  target: Record<string, MasteryProgress>,
  source: Record<string, MasteryProgress>,
): void {
  for (const [id, value] of Object.entries(source)) {
    const progress = (target[id] ??= freshMastery());
    for (const key of Object.keys(progress) as (keyof MasteryProgress)[])
      progress[key] =
        key === 'chain' ? Math.max(progress[key], value[key]) : progress[key] + value[key];
  }
}
