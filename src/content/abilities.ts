import { advancedAbilities } from './advanced-abilities';
import { specialistAbilities } from './specialist-abilities';
import { kineticAbilities } from './kinetic-abilities';

export type EffectKind =
  | 'split'
  | 'mass'
  | 'orbit_impulse'
  | 'vector_turn'
  | 'steer'
  | 'response'
  | 'tether'
  | 'field'
  | 'impulse'
  | 'lock'
  | 'dash'
  | 'theft'
  | 'transfer'
  | 'beam'
  | 'collapse'
  | 'burst'
  | 'planet'
  | 'deploy'
  | 'chain'
  | 'reverse'
  | 'rotate'
  | 'reflect';
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tags: string[];
  effect: EffectKind;
  energy: number;
  cooldown: number;
  radius: number;
  strength: number;
  duration: number;
  mode?: 'radial' | 'vortex' | 'directional' | 'zero';
  target: 'point' | 'player';
  maxLevel: number;
  evolution?: string;
  parameters?: {
    momentumScale?: number;
    planetCount?: number;
    collapseMultiplier?: number;
    collapseDamageType?: string;
    chainTargets?: number;
    affects?: string[];
    falloff?: 'constant' | 'linear' | 'inverseSquare';
    travelSpeed?: number;
    tetherLength?: number;
    selfOnly?: boolean;
  };
  feedback?: {
    color?: string;
    startFrequency?: number;
    endFrequency?: number;
    soundDuration?: number;
  };
}

export const abilities: AbilityDefinition[] = [
  {
    id: 'beacon',
    name: 'Gravity Beacon',
    rarity: 'rare',
    description:
      'Deploy a movable, destructible machine in open space. Its attraction field follows the machine until it breaks or expires.',
    tags: ['Gravity', 'Control', 'Machine'],
    effect: 'deploy',
    mode: 'radial',
    energy: 32,
    cooldown: 12,
    radius: 220,
    strength: 0.004,
    duration: 8,
    target: 'point',
    maxLevel: 3,
    evolution: 'orbital_engine',
  },
  {
    id: 'orbital_engine',
    name: 'Orbital Engine',
    rarity: 'epic',
    description:
      'Deploy a vortex machine in open space. Launch the device to carry its orbit across the chamber.',
    tags: ['Gravity', 'Control', 'Machine', 'Orbit'],
    effect: 'deploy',
    mode: 'vortex',
    energy: 42,
    cooldown: 14,
    radius: 270,
    strength: 0.0045,
    duration: 10,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'pulse',
    rarity: 'common',
    name: 'Gravity Pulse',
    description: 'Launch nearby matter away from your core. Heavy objects retain their momentum.',
    tags: ['Gravity', 'Impact', 'Control'],
    effect: 'impulse',
    energy: 18,
    cooldown: 3.5,
    radius: 220,
    strength: 13,
    duration: 0,
    target: 'player',
    maxLevel: 3,
    evolution: 'nova',
  },
  {
    id: 'wave',
    rarity: 'rare',
    name: 'Gravity Wave',
    description:
      'Send a moving front of gravity toward your aim, carrying loose matter and redirecting shots along its path.',
    tags: ['Gravity', 'Velocity', 'Projectile'],
    effect: 'field',
    mode: 'directional',
    energy: 28,
    cooldown: 8,
    radius: 95,
    strength: 0.006,
    duration: 2.5,
    target: 'player',
    maxLevel: 3,
    parameters: { travelSpeed: 320, falloff: 'constant' },
    feedback: { color: '#a8deff', startFrequency: 110, endFrequency: 320, soundDuration: 0.4 },
  },
  {
    id: 'repulsor',
    rarity: 'common',
    name: 'Repulsor',
    description: 'A repulsive field turns a chosen point into a temporary barrier.',
    tags: ['Gravity', 'Control', 'Defense'],
    effect: 'field',
    mode: 'radial',
    energy: 25,
    cooldown: 6,
    radius: 250,
    strength: -0.006,
    duration: 3,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'lock',
    rarity: 'common',
    name: 'Gravity Lock',
    description: 'Anchor nearby enemies and objects briefly. Released targets resist another lock.',
    tags: ['Control', 'Defense'],
    effect: 'lock',
    energy: 24,
    cooldown: 7,
    radius: 145,
    strength: 1,
    duration: 1.8,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'vacuum',
    rarity: 'common',
    name: 'Gravity Vacuum',
    description: 'Carry an attraction field with your core, collecting matter as you move.',
    tags: ['Gravity', 'Control', 'Movement'],
    effect: 'field',
    mode: 'radial',
    energy: 20,
    cooldown: 7,
    radius: 245,
    strength: 0.005,
    duration: 3,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'slingshot',
    rarity: 'common',
    name: 'Gravity Slingshot',
    description: 'Borrow a nearby source’s pull to propel your core toward the target.',
    tags: ['Velocity', 'Movement', 'Impact'],
    effect: 'dash',
    energy: 15,
    cooldown: 2.8,
    radius: 300,
    strength: 13,
    duration: 0,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'theft',
    rarity: 'rare',
    name: 'Gravity Theft',
    description: 'Drain a nearby enemy’s gravitational response and store force for a burst.',
    tags: ['Gravity', 'Control', 'Mass'],
    effect: 'theft',
    energy: 22,
    cooldown: 6,
    radius: 220,
    strength: 0.2,
    duration: 4,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'transfer',
    rarity: 'rare',
    name: 'Gravity Transfer',
    description:
      'Swap momentum and exchange gravity response between two movable bodies for four seconds. Phase-locked or already-linked bodies cannot transfer.',
    tags: ['Gravity', 'Velocity', 'Control', 'Projectile'],
    effect: 'transfer',
    energy: 25,
    cooldown: 5,
    radius: 260,
    strength: 1,
    duration: 4,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'beam',
    rarity: 'rare',
    name: 'Gravity Beam',
    description: 'Accelerate matter along a narrow line from your core to the target.',
    tags: ['Gravity', 'Projectile', 'Velocity'],
    effect: 'beam',
    energy: 18,
    cooldown: 3,
    radius: 600,
    strength: 11,
    duration: 0,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'collapse',
    rarity: 'epic',
    name: 'Gravity Collapse',
    description: 'Compress matter around a point, then crush tightly grouped targets.',
    tags: ['Compression', 'Control', 'Gravity'],
    effect: 'collapse',
    energy: 35,
    cooldown: 8,
    radius: 240,
    strength: 0.009,
    duration: 1.4,
    target: 'point',
    maxLevel: 3,
    evolution: 'black_hole',
  },
  {
    id: 'burst',
    rarity: 'epic',
    name: 'Stored Burst',
    description: 'Release stolen and collision energy as a powerful outward impulse.',
    tags: ['Gravity', 'Impact', 'Mass'],
    effect: 'burst',
    energy: 15,
    cooldown: 5,
    radius: 260,
    strength: 9,
    duration: 0,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'planet',
    rarity: 'rare',
    name: 'Micro Planet',
    description:
      'Create a moving gravitational body in open space. Its pull and tangential field capture nearby matter.',
    tags: ['Orbit', 'Mass', 'Gravity'],
    effect: 'planet',
    energy: 32,
    cooldown: 10,
    radius: 230,
    strength: 0.004,
    duration: 8,
    target: 'point',
    maxLevel: 3,
    evolution: 'binary',
  },
  {
    id: 'black_hole',
    parameters: { collapseMultiplier: 1.8, collapseDamageType: 'Void' },
    rarity: 'epic',
    name: 'Black Hole',
    description:
      'A short, intense singularity draws everything inward and tears its crowded center.',
    tags: ['Void', 'Compression', 'Gravity'],
    effect: 'collapse',
    energy: 50,
    cooldown: 14,
    radius: 330,
    strength: 0.015,
    duration: 3,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'rift',
    rarity: 'epic',
    name: 'Gravity Rift',
    description: 'Impose a sideways vector field inside a localized region.',
    tags: ['Void', 'Gravity', 'Control'],
    effect: 'field',
    mode: 'directional',
    energy: 25,
    cooldown: 7,
    radius: 225,
    strength: 0.004,
    duration: 5,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'vortex',
    rarity: 'common',
    name: 'Gravity Vortex',
    description: 'Spin matter around the target, creating orbital collisions.',
    tags: ['Orbit', 'Gravity', 'Velocity'],
    effect: 'field',
    mode: 'vortex',
    energy: 28,
    cooldown: 8,
    radius: 270,
    strength: 0.005,
    duration: 5,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'zero',
    rarity: 'common',
    name: 'Zero-G Chamber',
    description: 'Suppress gravity inside a bubble. Existing momentum survives.',
    tags: ['Void', 'Projectile', 'Control'],
    effect: 'field',
    mode: 'zero',
    energy: 20,
    cooldown: 7,
    radius: 250,
    strength: 1,
    duration: 4,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'chain',
    rarity: 'rare',
    name: 'Gravity Chain',
    description:
      'Pass signed gravity responses around up to five targets for four seconds, launching them in a causal chain.',
    tags: ['Gravity', 'Control', 'Impact'],
    effect: 'chain',
    energy: 30,
    cooldown: 6,
    radius: 260,
    strength: 10,
    duration: 4,
    target: 'point',
    maxLevel: 3,
  },
  {
    id: 'reverse',
    rarity: 'rare',
    name: 'Inversion',
    description: 'Reverse global gravity and kick nearby matter in the new direction.',
    tags: ['Gravity', 'Control', 'Movement'],
    effect: 'reverse',
    energy: 15,
    cooldown: 4,
    radius: 230,
    strength: 7,
    duration: 0,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'rotate',
    rarity: 'rare',
    name: 'Rotational Field',
    description: 'Rotate global gravity through a full revolution, then restore its direction.',
    tags: ['Orbit', 'Gravity', 'Chaos'],
    effect: 'rotate',
    energy: 32,
    cooldown: 10,
    radius: 0,
    strength: 1,
    duration: 4,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'reflect',
    rarity: 'rare',
    name: 'Orbital Guard',
    description: 'Capture nearby hostile shots in a moving orbital field and redirect them.',
    tags: ['Projectile', 'Orbit', 'Defense'],
    effect: 'reflect',
    energy: 22,
    cooldown: 7,
    radius: 150,
    strength: 0.005,
    duration: 3,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'nova',
    parameters: { momentumScale: -0.5 },
    rarity: 'legendary',
    name: 'Gravity Nova',
    description: 'An evolved pulse reverses inbound momentum before a wide, powerful launch.',
    tags: ['Gravity', 'Impact', 'Defense'],
    effect: 'impulse',
    energy: 40,
    cooldown: 9,
    radius: 380,
    strength: 20,
    duration: 0,
    target: 'player',
    maxLevel: 3,
  },
  {
    id: 'binary',
    evolution: 'solar_system',
    parameters: { planetCount: 2 },
    rarity: 'legendary',
    name: 'Binary System',
    description:
      'Create two orbiting bodies in open space to trap and slingshot nearby matter. Both bodies need clearance.',
    tags: ['Orbit', 'Mass', 'Gravity'],
    effect: 'planet',
    energy: 48,
    cooldown: 14,
    radius: 260,
    strength: 0.0045,
    duration: 10,
    target: 'point',
    maxLevel: 3,
  },
  ...advancedAbilities,
  ...specialistAbilities,
  ...kineticAbilities,
  {
    id: 'planet_split',
    name: 'Planet Split',
    rarity: 'legendary',
    description:
      'Split one of your summoned planets into two destructible moons in open space. They share its mass, inherit motion and temporary effects, and keep only its remaining lifetime.',
    tags: ['Gravity', 'Mass', 'Orbit'],
    effect: 'split',
    energy: 28,
    cooldown: 8,
    radius: 210,
    strength: 0.0035,
    duration: 10,
    target: 'point',
    maxLevel: 3,
  },
];

export const abilityById = new Map(abilities.map((definition) => [definition.id, definition]));
