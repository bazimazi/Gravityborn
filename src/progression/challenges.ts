import type { ChallengeDefinition } from '../content/challenges';
import type { MasteryProgress } from './mastery';
export function challengeProgress(
  profile: { metrics: Record<string, number>; abilityMastery: Record<string, MasteryProgress> },
  challenge: ChallengeDefinition,
): number {
  return challenge.ability
    ? (profile.abilityMastery[challenge.ability]?.[challenge.metric as keyof MasteryProgress] ?? 0)
    : (profile.metrics[challenge.metric] ?? 0);
}
