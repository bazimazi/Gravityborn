import { abilities } from '../content/abilities';
import { finite, record } from '../core/save';
import { masteryMilestones } from '../content/mastery';
export interface MasteryProgress {
  casts: number;
  kills: number;
  elites: number;
  bosses: number;
  chain: number;
  wins: number;
  controlTargets: number;
  controlRooms: number;
  controlBosses: number;
  controlPeak: number;
}
export const freshMastery = (): MasteryProgress => ({
  casts: 0,
  kills: 0,
  elites: 0,
  bosses: 0,
  chain: 0,
  wins: 0,
  controlTargets: 0,
  controlRooms: 0,
  controlBosses: 0,
  controlPeak: 0,
});
export function masteryLevel(progress: MasteryProgress, id?: string): number {
  const milestones = masteryMilestones(id);
  const incomplete = milestones.findIndex((item) => (progress[item.metric] ?? 0) < item.target);
  return incomplete < 0 ? milestones.length : incomplete;
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
        key === 'chain' || key === 'controlPeak'
          ? Math.max(progress[key] ?? 0, value[key] ?? 0)
          : (progress[key] ?? 0) + (value[key] ?? 0);
  }
}
