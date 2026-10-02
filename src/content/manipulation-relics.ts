import type { RelicDefinition } from './relics';

export const manipulationRelics: RelicDefinition[] = [
  {
    id: 'torsion_spring',
    name: 'Torsion Spring',
    rarity: 'rare',
    tags: ['Spin', 'Impact'],
    description:
      'Spin impulses gain 50% angular velocity but cost 20% more energy. The angular speed cap still applies, and Gyroscopic Brake remains a full stop.',
    modifiers: [
      { stat: 'strength', operation: 'multiply', value: 1.5, tags: ['Spin'] },
      { stat: 'energyCost', operation: 'multiply', value: 1.2, tags: ['Spin'] },
    ],
  },
  {
    id: 'reverse_gyro',
    name: 'Reverse Gyro',
    rarity: 'rare',
    tags: ['Spin', 'Chaos'],
    description:
      'Spin powers reverse existing rotation before adding their angular impulse. Gyroscopic Brake still stops rotation because its retention starts at zero.',
    modifiers: [{ stat: 'angularRetention', operation: 'multiply', value: -1 }],
  },
  {
    id: 'redline_bearings',
    name: 'Redline Bearings',
    rarity: 'common',
    tags: ['Spin', 'Movement'],
    description:
      'At core speed six or faster, Spin powers cost 40% less energy. Keep moving while shaping the rotation of your ammunition.',
    modifiers: [
      {
        stat: 'energyCost',
        operation: 'multiply',
        value: 0.6,
        tags: ['Spin'],
        conditions: [{ stat: 'speed', comparison: 'gte', value: 6 }],
      },
    ],
  },
  {
    id: 'inward_compass',
    name: 'Inward Compass',
    rarity: 'rare',
    tags: ['Radial', 'Control'],
    description:
      'Radial Redirect turns moving bodies toward its center instead of away. Speeds stay unchanged, so converge a volley onto one point.',
    modifiers: [
      { stat: 'strength', operation: 'multiply', value: -1, tags: ['Radial', 'Velocity'] },
    ],
  },
  {
    id: 'cutaway_shield',
    name: 'Cutaway Shield',
    rarity: 'common',
    tags: ['Cut', 'Defense'],
    description:
      'Cut the Lines grants a 0.8-second shield, at most once every four seconds. Release a swinging network and survive the escape.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'shield', value: 0.8, cooldown: 4, tags: ['Cut'] },
    ],
  },
  {
    id: 'spring_harvester',
    name: 'Spring Harvester',
    rarity: 'rare',
    tags: ['Release', 'Gravity'],
    description:
      'Tension Release stores twenty gravity charge, at most once every seven seconds. A valid release consumes its links, preventing repeated harvesting of the same network.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'store', value: 20, cooldown: 7, tags: ['Release'] },
    ],
  },
  {
    id: 'momentum_escrow',
    name: 'Momentum Escrow',
    rarity: 'rare',
    tags: ['Momentum', 'Gravity'],
    description:
      'Below 40% energy, casting a Momentum power refunds twelve energy after payment, at most once every five seconds. Its full cost is still required up front.',
    triggers: [
      {
        trigger: 'OnAbilityCast',
        effect: 'energy',
        value: 12,
        cooldown: 5,
        tags: ['Momentum'],
        conditions: [{ stat: 'energyRatio', comparison: 'lt', value: 0.4 }],
      },
    ],
  },
  {
    id: 'balanced_fuse',
    name: 'Balanced Fuse',
    rarity: 'rare',
    tags: ['Momentum', 'Defense'],
    description:
      'Momentum-attributed impact kills repair five integrity, at most once per second. Redistribute motion, then cash in before another power takes ownership.',
    triggers: [{ trigger: 'OnKill', effect: 'heal', value: 5, cooldown: 1, tags: ['Momentum'] }],
  },
  {
    id: 'rotor_dynamo',
    name: 'Rotor Dynamo',
    rarity: 'legendary',
    tags: ['Spin', 'Gravity'],
    description:
      'Spin-attributed impact kills store fifteen gravity charge and return five energy, at most once per second. Turning plate edges can supply the impact.',
    triggers: [
      { trigger: 'OnKill', effect: 'store', value: 15, cooldown: 1, tags: ['Spin'] },
      { trigger: 'OnKill', effect: 'energy', value: 5, cooldown: 1, tags: ['Spin'] },
    ],
  },
];
