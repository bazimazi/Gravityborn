import type { RelicDefinition } from './relics';

export const kineticRelics: RelicDefinition[] = [
  {
    id: 'flywheel',
    name: 'Flywheel',
    rarity: 'rare',
    tags: ['Orbit', 'Velocity'],
    description:
      'Gravity changes kick nearby matter tangentially around your core, at most once every two seconds. Energy regeneration falls by two per second.',
    modifiers: [{ stat: 'energyRegen', operation: 'add', value: -2 }],
    triggers: [{ trigger: 'OnGravityChange', effect: 'orbitPulse', value: 8, cooldown: 2 }],
  },
  {
    id: 'emergency_brake',
    name: 'Emergency Brake',
    rarity: 'rare',
    tags: ['Velocity', 'Defense'],
    description:
      'Taking damage removes 80% of nearby matter’s velocity, at most once every five seconds. A hit gives you a brief chance to redirect the debris.',
    triggers: [{ trigger: 'OnDamage', effect: 'brake', value: 0.2, cooldown: 5 }],
  },
  {
    id: 'return_receipt',
    name: 'Return Receipt',
    rarity: 'rare',
    tags: ['Projectile', 'Collision'],
    description:
      'Collisions reverse nearby moving projectiles at their current speed, at most once every three seconds. Returned shots can hit their owners.',
    triggers: [{ trigger: 'OnCollision', effect: 'returnShots', value: -1, cooldown: 3 }],
  },
  {
    id: 'stable_orbit',
    name: 'Stable Orbit',
    rarity: 'legendary',
    tags: ['Orbit', 'Defense'],
    description:
      'At 60% energy or more, add a small tangential kick to nearby matter every 1.5 seconds. Keep a reserve to maintain the moving screen.',
    triggers: [
      {
        trigger: 'Periodic',
        effect: 'orbitPulse',
        value: 3,
        cooldown: 1.5,
        conditions: [{ stat: 'energyRatio', comparison: 'gte', value: 0.6 }],
      },
    ],
  },
  {
    id: 'moon_fragment',
    name: 'Moon Fragment',
    rarity: 'rare',
    tags: ['Orbit', 'Impact'],
    description:
      'Orbital kills launch nearby matter tangentially around your core, at most once per second. One orbital impact can begin the next.',
    triggers: [{ trigger: 'OnKill', effect: 'orbitPulse', value: 6, cooldown: 1, tags: ['Orbit'] }],
  },
  {
    id: 'planetary_core',
    name: 'Planetary Core',
    rarity: 'legendary',
    tags: ['Mass', 'Orbit'],
    description:
      'Mass effects last 50% longer and collision damage rises by 30%, but movement acceleration falls by 15%. Build a heavy, lasting system.',
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 1.5, tags: ['Mass'] },
      { stat: 'impactDamage', operation: 'multiply', value: 1.3 },
      { stat: 'movement', operation: 'multiply', value: 0.85 },
    ],
  },
  {
    id: 'inertial_fuse',
    name: 'Inertial Fuse',
    rarity: 'common',
    tags: ['Mass', 'Defense'],
    description:
      'Casting a Mass power grants a 0.6-second shield, at most once every six seconds. Change density before committing to a risky impact.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'shield', value: 0.6, cooldown: 6, tags: ['Mass'] },
    ],
  },
  {
    id: 'heavy_dividend',
    name: 'Heavy Dividend',
    rarity: 'common',
    tags: ['Mass', 'Gravity'],
    description:
      'Kills attributed to Mass powers restore fifteen energy, at most once every two seconds. Cash in the impact before another force takes ownership.',
    triggers: [{ trigger: 'OnKill', effect: 'energy', value: 15, cooldown: 2, tags: ['Mass'] }],
  },
  {
    id: 'buoyant_capacitor',
    name: 'Buoyant Capacitor',
    rarity: 'rare',
    tags: ['Mass', 'Gravity', 'Movement'],
    description:
      'Your core responds to gravity at minus 60% and weighs 40% less. Gain 35 maximum energy; plan movement around falling against the room.',
    modifiers: [
      { stat: 'gravityResponse', operation: 'multiply', value: -0.6 },
      { stat: 'mass', operation: 'multiply', value: 0.6 },
      { stat: 'maxEnergy', operation: 'add', value: 35 },
    ],
  },
  {
    id: 'recoil_gyroscope',
    name: 'Recoil Gyroscope',
    rarity: 'rare',
    tags: ['Orbit', 'Movement'],
    description:
      'Casting a Movement power kicks nearby matter counterclockwise around your core, at most once every four seconds. Your escape sweeps a path through the room.',
    triggers: [
      {
        trigger: 'OnAbilityCast',
        effect: 'orbitPulse',
        value: -8,
        cooldown: 4,
        tags: ['Movement'],
      },
    ],
  },
];
