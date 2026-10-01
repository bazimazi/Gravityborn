import tuning from '../data/endless.json' with { type: 'json' };
import type { Phenomenon } from './phenomena';

export { tuning as endlessTuning };
export function endlessPhenomena(stage: number, primary: Phenomenon | ''): Phenomenon[] {
  const active = new Set<Phenomenon>(primary ? [primary] : []);
  for (const tier of tuning.tiers) {
    if (stage < tier.stage) break;
    for (const id of tier.add) active.add(id as Phenomenon);
    if (tier.direction) {
      for (const id of ['rotating', 'reverse', 'storm'] as const) active.delete(id);
      active.add(tier.direction as Phenomenon);
    }
  }
  return [...active];
}
