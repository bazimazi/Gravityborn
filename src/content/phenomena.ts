export const phenomena = [
  { id: 'storm', name: 'Gravity Storm', description: 'Global gravity turns every two seconds.' },
  {
    id: 'collision',
    name: 'Planetary Collision',
    description: 'Two heavy gravity sources approach one another.',
  },
  {
    id: 'singularity',
    name: 'Transient Singularity',
    description: 'A strong attraction field repeatedly opens at the center.',
  },
  {
    id: 'rain',
    name: 'Gravity Rain',
    description: 'Short repulsive fields appear across the arena.',
  },
  { id: 'zero', name: 'Zero-G Zone', description: 'Gravity vanishes in a broad central region.' },
  { id: 'reverse', name: 'Reverse World', description: 'The chamber starts with upward gravity.' },
  {
    id: 'collapse',
    name: 'Orbital Collapse',
    description: 'Loose matter spirals around the arena center.',
  },
  { id: 'rift', name: 'Gravity Rift', description: 'Opposing directional fields divide the room.' },
  {
    id: 'dense',
    name: 'Dense Matter',
    description: 'Every non-player body has ten times its usual mass.',
  },
  {
    id: 'elastic',
    name: 'Elastic World',
    description: 'Matter rebounds with almost perfect elasticity.',
  },
  {
    id: 'rotating',
    name: 'Rotating Universe',
    description: 'The global gravity vector turns continuously.',
  },
] as const;
export type Phenomenon = (typeof phenomena)[number]['id'];
export const contracts = [
  { id: 'none', name: 'No contract', description: 'Standard rewards.', reward: 1 },
  {
    id: 'unstable',
    name: 'Unstable Charter',
    description: 'Gravity strength changes every 10 seconds. +50% room currency.',
    reward: 1.5,
  },
  {
    id: 'locked',
    name: 'Anchored Charter',
    description:
      'Gravity direction controls, Reversal and Rotation powers are disabled. +100% room currency.',
    reward: 2,
  },
  {
    id: 'heavy',
    name: 'Titan Charter',
    description: 'Hostiles have five times their usual mass. +200% room currency.',
    reward: 3,
  },
  {
    id: 'pulse',
    name: 'Resonant Charter',
    description:
      'Hard collisions create repulsive fields, limited to one pulse every half second. +300% room currency.',
    reward: 4,
  },
] as const;
export type Contract = (typeof contracts)[number]['id'];
export const difficulties = [
  'Normal',
  'Veteran',
  'Expert',
  'Master',
  'Chaos',
  'Singularity',
  'Infinite',
] as const;
export const difficultyDescriptions = [
  'Standard enemy strength and chamber rewards.',
  'Stronger enemies and larger encounters.',
  'Stronger enemies and guaranteed elite modifiers.',
  'Elite modifiers and additional laser hazards.',
  'Elites, lasers and a gravity anomaly in every chamber. Chamber shard and XP rewards are 90%.',
  'Chaos rules with stronger elites and telegraphed boss repulsion traps from phase 2. Chamber shard and XP rewards are 80%.',
  'Singularity rules; phase 3 boss traps become vortices. Chamber shard and XP rewards are 70%.',
] as const;
