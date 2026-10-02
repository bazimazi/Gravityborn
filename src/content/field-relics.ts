import type { RelicDefinition } from './relics';

export const fieldRelics: RelicDefinition[] = [
  {
    id: 'cycle_dial',
    name: 'Cycle Dial',
    rarity: 'rare',
    tags: ['Field', 'Chaos'],
    description:
      'Pulsing fields complete their attraction/repulsion cycle twice as fast, but all Field powers last 25% less time.',
    modifiers: [
      { stat: 'fieldPeriod', operation: 'multiply', value: 0.5 },
      { stat: 'duration', operation: 'multiply', value: 0.75, tags: ['Field'] },
    ],
  },
  {
    id: 'long_watch',
    name: 'Long Watch',
    rarity: 'rare',
    tags: ['Field', 'Control'],
    description:
      'Pulsing field cycles take twice as long. Field powers last 50% longer but cost 20% more energy.',
    modifiers: [
      { stat: 'fieldPeriod', operation: 'multiply', value: 2 },
      { stat: 'duration', operation: 'multiply', value: 1.5, tags: ['Field'] },
      { stat: 'energyCost', operation: 'multiply', value: 1.2, tags: ['Field'] },
    ],
  },
  {
    id: 'reverse_bearing',
    name: 'Reverse Bearing',
    rarity: 'rare',
    tags: ['Field', 'Orbit'],
    description:
      'Orbiting field sources circle in the opposite direction. Orbital powers gain 20% force, changing both their sweep and their impact.',
    modifiers: [
      { stat: 'fieldOrbitSpeed', operation: 'multiply', value: -1 },
      { stat: 'strength', operation: 'multiply', value: 1.2, tags: ['Orbit'] },
    ],
  },
  {
    id: 'still_crown',
    name: 'Still Crown',
    rarity: 'rare',
    tags: ['Field', 'Control'],
    description:
      'Orbiting field sources hold their initial angle instead of circling. Gain 20 maximum energy to support the stationary pattern.',
    modifiers: [
      { stat: 'fieldOrbitSpeed', operation: 'override', value: 0 },
      { stat: 'maxEnergy', operation: 'add', value: 20 },
    ],
  },
  {
    id: 'tight_epicycle',
    name: 'Tight Epicycle',
    rarity: 'common',
    tags: ['Orbit', 'Field'],
    description:
      'Field sources sit 45% closer to their pattern center. Orbital fields reach 20% less far and cost 20% less energy.',
    modifiers: [
      { stat: 'fieldOffset', operation: 'multiply', value: 0.55 },
      { stat: 'radius', operation: 'multiply', value: 0.8, tags: ['Orbit', 'Field'] },
      { stat: 'energyCost', operation: 'multiply', value: 0.8, tags: ['Orbit', 'Field'] },
    ],
  },
  {
    id: 'wide_epicycle',
    name: 'Wide Epicycle',
    rarity: 'rare',
    tags: ['Orbit', 'Field'],
    description:
      'Pattern sources sit 75% farther from their center, but Field power strength falls by 30%. Trade overlap for coverage.',
    modifiers: [
      { stat: 'fieldOffset', operation: 'multiply', value: 1.75 },
      { stat: 'strength', operation: 'multiply', value: 0.7, tags: ['Field'] },
    ],
  },
  {
    id: 'vector_clock',
    name: 'Vector Clock',
    rarity: 'common',
    tags: ['Field', 'Velocity'],
    description:
      'Rotating directional fields sweep 80% faster. All Field powers have 15% longer cooldowns.',
    modifiers: [
      { stat: 'fieldDirectionSpeed', operation: 'multiply', value: 1.8 },
      { stat: 'cooldown', operation: 'multiply', value: 1.15, tags: ['Field'] },
    ],
  },
  {
    id: 'counter_clock',
    name: 'Counter Clock',
    rarity: 'rare',
    tags: ['Field', 'Chaos'],
    description:
      'Directional field sweeps reverse. Regenerate two extra energy per second, but lose 15 maximum integrity.',
    modifiers: [
      { stat: 'fieldDirectionSpeed', operation: 'multiply', value: -1 },
      { stat: 'energyRegen', operation: 'add', value: 2 },
      { stat: 'maxHealth', operation: 'add', value: -15 },
    ],
  },
  {
    id: 'oscillation_dividend',
    name: 'Oscillation Dividend',
    rarity: 'common',
    tags: ['Field', 'Chaos'],
    description:
      'Casting a Chaos power returns eight energy after payment, at most once every two seconds. You still need its full initial cost.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'energy', value: 8, cooldown: 2, tags: ['Chaos'] },
    ],
  },
  {
    id: 'phase_lace',
    name: 'Phase Lace',
    rarity: 'rare',
    tags: ['Void', 'Projectile'],
    description:
      'Casting a Void power reverses nearby moving projectiles, at most once every six seconds. Open a gravity-free pocket and return the approaching volley.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'returnShots', value: -1, cooldown: 6, tags: ['Void'] },
    ],
  },
  {
    id: 'gravitic_suture',
    name: 'Gravitic Suture',
    rarity: 'common',
    tags: ['Compression', 'Defense'],
    description:
      'Compression kills repair four integrity, at most twice per second. Compress groups to sustain your core; ordinary impacts need their own healing source.',
    triggers: [
      { trigger: 'OnKill', effect: 'heal', value: 4, cooldown: 0.5, tags: ['Compression'] },
    ],
  },
  {
    id: 'refraction_lattice',
    name: 'Refraction Lattice',
    rarity: 'legendary',
    tags: ['Field', 'Chaos'],
    description:
      'Repeat a Field cast after a brief delay, at most once every twelve seconds. Field powers cost 15% more energy; the echo still needs space in the shared field budget.',
    modifiers: [{ stat: 'energyCost', operation: 'multiply', value: 1.15, tags: ['Field'] }],
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'echo', value: 1, cooldown: 12, tags: ['Field'] },
    ],
  },
  {
    id: 'damping_lattice',
    name: 'Damping Lattice',
    rarity: 'rare',
    tags: ['Field', 'Defense'],
    description:
      'Casting a Field power halves nearby matter’s current velocity, at most once every four seconds. Slow incoming debris before your field takes hold.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'brake', value: 0.5, cooldown: 4, tags: ['Field'] },
    ],
  },
  {
    id: 'launch_wake',
    name: 'Launch Wake',
    rarity: 'rare',
    tags: ['Field', 'Orbit'],
    description:
      'Casting a Field power kicks nearby matter tangentially around your core, at most once every three seconds. Feed moving debris into the new field.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'orbitPulse', value: 4, cooldown: 3, tags: ['Field'] },
    ],
  },
  {
    id: 'carrier_recovery',
    name: 'Carrier Recovery',
    rarity: 'common',
    tags: ['Field', 'Gravity'],
    description:
      'Impact kills attributed to Field powers restore six energy, at most once per second. Keep the field as the final influence on your ammunition.',
    triggers: [{ trigger: 'OnKill', effect: 'energy', value: 6, cooldown: 1, tags: ['Field'] }],
  },
];
