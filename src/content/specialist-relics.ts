import type { RelicDefinition } from './relics';

export const specialistRelics: RelicDefinition[] = [
  {
    id: 'crowd_cell',
    name: 'Crowd Cell',
    rarity: 'rare',
    tags: ['Gravity', 'Control'],
    description:
      'While at least three hostiles are within 240 units, recover four energy once per second. Stay near danger to sustain your powers.',
    triggers: [
      {
        trigger: 'Periodic',
        effect: 'energy',
        value: 4,
        cooldown: 1,
        conditions: [{ stat: 'nearbyEnemies', comparison: 'gte', value: 3 }],
      },
    ],
  },
  {
    id: 'patient_lens',
    name: 'Patient Lens',
    rarity: 'common',
    tags: ['Gravity', 'Compression'],
    description:
      'Gravity powers gain 40% force while core speed is below 1. Movement acceleration is always 15% lower.',
    modifiers: [
      {
        stat: 'strength',
        operation: 'multiply',
        value: 1.4,
        tags: ['Gravity'],
        conditions: [{ stat: 'speed', comparison: 'lt', value: 1 }],
      },
      { stat: 'movement', operation: 'multiply', value: 0.85 },
    ],
  },
  {
    id: 'orbital_rations',
    name: 'Orbital Rations',
    rarity: 'common',
    tags: ['Orbit', 'Defense'],
    description:
      'Orbital kills repair eight integrity, at most once per second. Keep the orbit dangerous to keep your core alive.',
    triggers: [{ trigger: 'OnKill', effect: 'heal', value: 8, cooldown: 1, tags: ['Orbit'] }],
  },
  {
    id: 'dawn_coil',
    name: 'Dawn Coil',
    rarity: 'rare',
    tags: ['Defense', 'Gravity'],
    description:
      'At 90% energy or more, gain a half-second shield at most once every twelve seconds. An empty reserve delays the next activation.',
    triggers: [
      {
        trigger: 'Periodic',
        effect: 'shield',
        value: 0.5,
        cooldown: 12,
        conditions: [{ stat: 'energyRatio', comparison: 'gte', value: 0.9 }],
      },
    ],
  },
  {
    id: 'backlash_cage',
    name: 'Backlash Cage',
    rarity: 'rare',
    tags: ['Gravity', 'Defense'],
    description:
      'Taking damage leaves a brief repulsion field at your position, at most once every three seconds. The field pushes nearby matter away.',
    triggers: [{ trigger: 'OnDamage', effect: 'personal', value: -0.006, cooldown: 3 }],
  },
  {
    id: 'momentum_memory',
    name: 'Momentum Memory',
    rarity: 'rare',
    tags: ['Velocity', 'Gravity'],
    description:
      'Collisions leave a three-second directional field aligned with current global gravity, at most once every two seconds. Your impact site becomes a launch zone.',
    triggers: [{ trigger: 'OnCollision', effect: 'afterimage', value: 0.004, cooldown: 2 }],
  },
  {
    id: 'tactical_orbit',
    name: 'Tactical Orbit',
    rarity: 'rare',
    tags: ['Orbit', 'Control'],
    description:
      'Casting a Control power leaves a brief vortex at your core’s position, at most once every four seconds. Combine a restraint with an orbital launch.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'orbit', value: 0.004, cooldown: 4, tags: ['Control'] },
    ],
  },
  {
    id: 'emergency_relay',
    name: 'Emergency Relay',
    rarity: 'common',
    tags: ['Machine', 'Defense'],
    description:
      'Taking damage restores 20 energy, at most once every six seconds. Turn a hit into the power needed for an escape.',
    triggers: [{ trigger: 'OnDamage', effect: 'energy', value: 20, cooldown: 6 }],
  },
  {
    id: 'momentum_reservoir',
    name: 'Momentum Reservoir',
    rarity: 'rare',
    tags: ['Mass', 'Velocity'],
    description:
      'Collisions while your core moves at speed 6 or faster store twelve charge, at most once per second. Fast movement fuels Stored Burst.',
    triggers: [
      {
        trigger: 'OnCollision',
        effect: 'store',
        value: 12,
        cooldown: 1,
        conditions: [{ stat: 'speed', comparison: 'gte', value: 6 }],
      },
    ],
  },
  {
    id: 'lean_burner',
    name: 'Lean Burner',
    rarity: 'rare',
    tags: ['Mass', 'Gravity'],
    description:
      'At 60 stored charge or more, powers cost 40% less energy. Spending your charge on a burst removes this discount.',
    modifiers: [
      {
        stat: 'energyCost',
        operation: 'multiply',
        value: 0.6,
        conditions: [{ stat: 'stored', comparison: 'gte', value: 60 }],
      },
    ],
  },
  {
    id: 'cold_start',
    name: 'Cold Start',
    rarity: 'common',
    tags: ['Machine', 'Gravity'],
    description:
      'Maximum energy increases by 60, but energy regeneration falls by four per second. Prepare a large opening sequence and plan your recharge.',
    modifiers: [
      { stat: 'maxEnergy', operation: 'add', value: 60 },
      { stat: 'energyRegen', operation: 'add', value: -4 },
    ],
  },
  {
    id: 'wide_horizon',
    name: 'Wide Horizon',
    rarity: 'rare',
    tags: ['Gravity', 'Well'],
    description:
      'Maintain two additional primary wells, but each primary well has 30% less force. Cover more positions with a distributed network.',
    modifiers: [
      { stat: 'maxWells', operation: 'add', value: 2 },
      { stat: 'strength', operation: 'multiply', value: 0.7, tags: ['Well'] },
    ],
  },
  {
    id: 'twin_gate',
    name: 'Twin Gate',
    rarity: 'legendary',
    tags: ['Gravity', 'Well', 'Control'],
    description:
      'Each primary-well cast creates a pair. Maintain one extra well, but primary-well cooldown is 50% longer. Duplicate pair effects do not create four wells per cast.',
    modifiers: [
      { stat: 'wellCopies', operation: 'override', value: 2 },
      { stat: 'maxWells', operation: 'add', value: 1 },
      { stat: 'cooldown', operation: 'multiply', value: 1.5, tags: ['Well'] },
    ],
  },
  {
    id: 'pinpoint_compactor',
    name: 'Pinpoint Compactor',
    rarity: 'rare',
    tags: ['Compression', 'Well'],
    description:
      'Primary wells deal two compression damage per half-second to hostiles near their centers, but their attraction radius shrinks by 30%.',
    modifiers: [
      { stat: 'wellCompression', operation: 'add', value: 2 },
      { stat: 'radius', operation: 'multiply', value: 0.7, tags: ['Well'] },
    ],
  },
  {
    id: 'artificer_seal',
    name: 'Artificer Seal',
    rarity: 'rare',
    tags: ['Machine', 'Control'],
    description:
      'Machine powers recharge 30% sooner, but maximum integrity falls by 15. Rebuild your field network quickly while protecting a fragile core.',
    modifiers: [
      { stat: 'cooldown', operation: 'multiply', value: 0.7, tags: ['Machine'] },
      { stat: 'maxHealth', operation: 'add', value: -15 },
    ],
  },
];
