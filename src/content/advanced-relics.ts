import type { RelicDefinition } from './relics';

export const advancedRelics: RelicDefinition[] = [
  {
    id: 'tension_spool',
    name: 'Tension Spool',
    rarity: 'common',
    tags: ['Control', 'Machine'],
    description:
      'Control effects last 35% longer but cost 15% more energy. Sustain physical links and crowd control at a price.',
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 1.35, tags: ['Control'] },
      { stat: 'energyCost', operation: 'multiply', value: 1.15, tags: ['Control'] },
    ],
  },
  {
    id: 'faraday_shell',
    name: 'Faraday Shell',
    rarity: 'rare',
    tags: ['Projectile', 'Defense'],
    description:
      'Casting a Projectile power grants a 0.45-second shield, at most once every eight seconds. Time a redirection to cover a dangerous approach.',
    triggers: [
      {
        trigger: 'OnAbilityCast',
        effect: 'shield',
        value: 0.45,
        cooldown: 8,
        tags: ['Projectile'],
      },
    ],
  },
  {
    id: 'glass_meteor',
    name: 'Glass Meteor',
    rarity: 'legendary',
    tags: ['Impact', 'Mass'],
    description:
      'Collision damage is multiplied by 2.4, but maximum integrity falls by 25. Commit to decisive impacts.',
    modifiers: [
      { stat: 'impactDamage', operation: 'multiply', value: 2.4 },
      { stat: 'maxHealth', operation: 'add', value: -25 },
    ],
  },
  {
    id: 'redline',
    name: 'Redline Engine',
    rarity: 'rare',
    tags: ['Velocity', 'Movement'],
    description:
      'Below 40% integrity, Velocity powers gain 70% strength. Your condition is checked before casting.',
    modifiers: [
      {
        stat: 'strength',
        operation: 'multiply',
        value: 1.7,
        tags: ['Velocity'],
        conditions: [{ stat: 'healthRatio', comparison: 'lt', value: 0.4 }],
      },
    ],
  },
  {
    id: 'drift_rudder',
    name: 'Drift Rudder',
    rarity: 'common',
    tags: ['Movement', 'Velocity'],
    description:
      'Movement acceleration increases 50% while traveling at speed 5 or faster. Maintain momentum to steer harder.',
    modifiers: [
      {
        stat: 'movement',
        operation: 'multiply',
        value: 1.5,
        conditions: [{ stat: 'speed', comparison: 'gte', value: 5 }],
      },
    ],
  },
  {
    id: 'hollow_reactor',
    name: 'Hollow Reactor',
    rarity: 'rare',
    tags: ['Gravity', 'Machine'],
    description:
      'Regenerate five extra energy per second, but lose 30 maximum energy. Frequent inexpensive casts replace a deep reserve.',
    modifiers: [
      { stat: 'energyRegen', operation: 'add', value: 5 },
      { stat: 'maxEnergy', operation: 'add', value: -30 },
    ],
  },
  {
    id: 'afterimage',
    name: 'Afterimage',
    rarity: 'rare',
    tags: ['Movement', 'Chaos'],
    description:
      'Movement powers echo once at no energy cost, at most once every eight seconds. The second cast repeats your original aim.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'echo', value: 1, cooldown: 8, tags: ['Movement'] },
    ],
  },
  {
    id: 'phase_capacitor',
    name: 'Phase Capacitor',
    rarity: 'rare',
    tags: ['Void', 'Defense'],
    description:
      'Changing global gravity grants a 0.4-second shield once every six seconds. Maximum energy decreases by 15.',
    modifiers: [{ stat: 'maxEnergy', operation: 'add', value: -15 }],
    triggers: [{ trigger: 'OnGravityChange', effect: 'shield', value: 0.4, cooldown: 6 }],
  },
  {
    id: 'void_recycler',
    name: 'Void Recycler',
    rarity: 'common',
    tags: ['Void', 'Gravity'],
    description:
      'Void kills restore eight energy, at most once per second. Feed your next rift or singularity with its victims.',
    triggers: [{ trigger: 'OnKill', effect: 'energy', value: 8, cooldown: 1, tags: ['Void'] }],
  },
  {
    id: 'filament',
    name: 'Magnetic Filament',
    rarity: 'common',
    tags: ['Control', 'Machine'],
    description:
      'Control powers reach 30% farther but their force is 20% weaker. Capture a wider crowd with gentler manipulation.',
    modifiers: [
      { stat: 'radius', operation: 'multiply', value: 1.3, tags: ['Control'] },
      { stat: 'strength', operation: 'multiply', value: 0.8, tags: ['Control'] },
    ],
  },
  {
    id: 'compression_debt',
    name: 'Compression Debt',
    rarity: 'rare',
    tags: ['Compression', 'Chaos'],
    description:
      'Compression powers gain 80% force but last only 60% as long. Their collapse arrives sooner, with less time to gather targets.',
    modifiers: [
      { stat: 'strength', operation: 'multiply', value: 1.8, tags: ['Compression'] },
      { stat: 'duration', operation: 'multiply', value: 0.6, tags: ['Compression'] },
    ],
  },
  {
    id: 'eccentric_axle',
    name: 'Eccentric Axle',
    rarity: 'rare',
    tags: ['Orbit', 'Machine'],
    description:
      'Orbit powers gain 60% force but take 35% longer to recharge. Build around a powerful committed orbit.',
    modifiers: [
      { stat: 'strength', operation: 'multiply', value: 1.6, tags: ['Orbit'] },
      { stat: 'cooldown', operation: 'multiply', value: 1.35, tags: ['Orbit'] },
    ],
  },
];
