import type { RelicDefinition } from './relics';

export const tetherRelics: RelicDefinition[] = [
  {
    id: 'short_spool',
    name: 'Short Spool',
    rarity: 'rare',
    tags: ['Tether', 'Compression'],
    description:
      'Spring lengths shrink by 40% and tether stiffness rises by 30%. Both ends of a winch or spreader progression change; lengths stay within 20–200 units.',
    modifiers: [
      { stat: 'tetherLength', operation: 'multiply', value: 0.6 },
      { stat: 'strength', operation: 'multiply', value: 1.3, tags: ['Tether'] },
    ],
  },
  {
    id: 'long_spool',
    name: 'Long Spool',
    rarity: 'rare',
    tags: ['Tether', 'Orbit'],
    description:
      'Spring lengths increase by 50%, capped at 200 units, while tether stiffness falls by 20%. Make wider pendulums and loose trains.',
    modifiers: [
      { stat: 'tetherLength', operation: 'multiply', value: 1.5 },
      { stat: 'strength', operation: 'multiply', value: 0.8, tags: ['Tether'] },
    ],
  },
  {
    id: 'dashpot',
    name: 'Dashpot',
    rarity: 'common',
    tags: ['Tether', 'Defense'],
    description:
      'Springs gain 0.15 damping, capped at 0.3. Motion along each connection settles faster while sideways swinging remains possible.',
    modifiers: [{ stat: 'tetherDamping', operation: 'add', value: 0.15 }],
  },
  {
    id: 'live_wire',
    name: 'Live Wire',
    rarity: 'rare',
    tags: ['Tether', 'Impact'],
    description:
      'New springs have no damping and 40% more stiffness. Build an energetic network, then let it rebound within the shared motion limits.',
    modifiers: [
      { stat: 'tetherDamping', operation: 'override', value: 0 },
      { stat: 'strength', operation: 'multiply', value: 1.4, tags: ['Tether'] },
    ],
  },
  {
    id: 'extra_terminal',
    name: 'Extra Terminal',
    rarity: 'legendary',
    tags: ['Tether', 'Control'],
    description:
      'Tether casts connect one extra body, up to six endpoints, but cost 25% more energy. Even a grapple can now suspend nearby matter at its anchor; every link still uses the shared budget.',
    modifiers: [
      { stat: 'tetherTargets', operation: 'add', value: 1 },
      { stat: 'energyCost', operation: 'multiply', value: 1.25, tags: ['Tether'] },
    ],
  },
  {
    id: 'clockwork_reel',
    name: 'Clockwork Reel',
    rarity: 'common',
    tags: ['Tether', 'Velocity'],
    description:
      'Tethers last 40% less time and recover 20% faster. Winches, spreaders and grapples complete their full length change sooner.',
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 0.6, tags: ['Tether'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.8, tags: ['Tether'] },
    ],
  },
  {
    id: 'tension_capacitor',
    name: 'Tension Capacitor',
    rarity: 'rare',
    tags: ['Tether', 'Gravity'],
    description:
      'Impact kills credited to a tether store twelve gravity charge, at most once per second. Spend the reserve with Gravity Burst.',
    triggers: [{ trigger: 'OnKill', effect: 'store', value: 12, cooldown: 1, tags: ['Tether'] }],
  },
  {
    id: 'lifeline',
    name: 'Lifeline',
    rarity: 'common',
    tags: ['Tether', 'Defense'],
    description:
      'Casting a tether grants a brief 0.5-second shield, at most once every six seconds. Survive the initial pull while your network settles.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'shield', value: 0.5, cooldown: 6, tags: ['Tether'] },
    ],
  },
  {
    id: 'knotted_echo',
    name: 'Knotted Echo',
    rarity: 'legendary',
    tags: ['Tether', 'Chaos'],
    description:
      'Repeat a tether cast after a brief delay, at most once every fifteen seconds. Casts cost 20% more energy; duplicate connections share the twelve-link limit and cannot echo recursively.',
    modifiers: [{ stat: 'energyCost', operation: 'multiply', value: 1.2, tags: ['Tether'] }],
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'echo', value: 1, cooldown: 15, tags: ['Tether'] },
    ],
  },
];
