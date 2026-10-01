import { abilities } from './abilities';
export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  shards: number;
  research: number;
  equipment?: string;
  ability?: string;
  title?: string;
}
export const challenges: ChallengeDefinition[] = [
  {
    id: 'first_hundred',
    title: 'Forcewright',
    name: 'Matter Remembers',
    description: 'Defeat 100 enemies through physical impacts.',
    metric: 'impactKills',
    target: 100,
    shards: 30,
    research: 4,
  },
  {
    id: 'chain_twenty',
    title: 'Cascadeborn',
    name: 'The Impossible Cascade',
    description: 'Create a causal chain with 20 distinct effects.',
    metric: 'chain',
    target: 20,
    shards: 50,
    research: 6,
    equipment: 'event_horizon',
  },
  {
    id: 'return_fire',
    title: 'Paradox Courier',
    name: 'Return to Sender',
    description: 'Defeat 25 enemies with redirected projectiles.',
    metric: 'redirected',
    target: 25,
    shards: 30,
    research: 4,
  },
  {
    id: 'guardian',
    title: 'Worldbreaker',
    name: 'Worldbreaker',
    description: 'Defeat five guardians.',
    metric: 'bosses',
    target: 5,
    shards: 40,
    research: 5,
  },
  {
    id: 'weightless',
    title: 'Unbound',
    name: 'Between Falling',
    description: 'Spend five cumulative minutes inside zero gravity during completed rooms.',
    metric: 'zeroSeconds',
    target: 300,
    shards: 25,
    research: 4,
  },
  {
    id: 'elite_hunter',
    title: 'Rule Breaker',
    name: 'Rule Breaker',
    description: 'Defeat ten elites.',
    metric: 'elites',
    target: 10,
    shards: 25,
    research: 4,
  },
  {
    id: 'well_guardian',
    title: 'Centerkeeper',
    name: 'A Center of Your Own',
    description: 'Defeat a guardian with a chain originating from a gravity well.',
    metric: 'wellBosses',
    target: 1,
    shards: 40,
    research: 5,
    equipment: 'phoenix_reactor',
  },
  {
    id: 'orbital_victory',
    title: 'Little Cosmos',
    name: 'Small Solar System',
    description: 'Win an expedition with at least 75% of your kills attributed to orbital powers.',
    metric: 'orbitalWins',
    target: 1,
    shards: 50,
    research: 6,
  },
];
const milestones = [
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
for (const ability of [
  { id: 'well', name: 'Gravity Well' },
  { id: 'flip', name: 'Gravity Flip' },
  ...abilities,
])
  for (const milestone of milestones)
    challenges.push({
      id: `${ability.id}_${milestone.id}`,
      name: `${ability.name}: ${milestone.name}`,
      description: milestone.description,
      ability: ability.id,
      metric: milestone.metric,
      target: milestone.target,
      shards: 3,
      research: 1,
    });
