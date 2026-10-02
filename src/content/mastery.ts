import { abilityById } from './abilities';
import type { MasteryProgress } from '../progression/mastery';

interface MasteryMilestone {
  id: string;
  name: string;
  metric: keyof MasteryProgress;
  target: number;
  description: string;
}
const combat: MasteryMilestone[] = [
  { id: 'practice', name: 'Practice', metric: 'casts', target: 50, description: 'Cast 50 times.' },
  { id: 'force', name: 'Force', metric: 'kills', target: 100, description: 'Cause 100 kills.' },
  {
    id: 'breaker',
    name: 'Breaker',
    metric: 'elites',
    target: 1,
    description: 'Defeat an elite with this power.',
  },
  {
    id: 'cascade',
    name: 'Cascade',
    metric: 'chain',
    target: 10,
    description: 'Cause a kill in a chain of at least 10 effects.',
  },
  {
    id: 'master',
    name: 'Master',
    metric: 'wins',
    target: 1,
    description: 'Win with at least half of all kills attributed to this power.',
  },
];
const control: MasteryMilestone[] = [
  combat[0],
  {
    id: 'force',
    name: 'Intervention',
    metric: 'controlTargets',
    target: 100,
    description:
      'Change 100 targets while hostiles remain: sever live links or stop spinning bodies.',
  },
  {
    id: 'breaker',
    name: 'Guardian Control',
    metric: 'controlBosses',
    target: 1,
    description:
      'Affect a target with this power while a guardian is alive, then clear its chamber.',
  },
  {
    id: 'cascade',
    name: 'Precision',
    metric: 'controlPeak',
    target: 3,
    description:
      'Affect at least three links or spinning bodies in one cast while hostiles remain.',
  },
  {
    id: 'master',
    name: 'Master',
    metric: 'wins',
    target: 1,
    description:
      'Win an expedition after clearing at least three combat chambers in which this power affected a target.',
  },
];
export function masteryMilestones(id?: string): readonly MasteryMilestone[] {
  return abilityById.get(id ?? '')?.mastery === 'control' ? control : combat;
}
