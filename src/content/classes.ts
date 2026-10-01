import type { Modifier } from '../progression/modifiers';
export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  powers: string[];
  modifiers: Omit<Modifier, 'id'>[];
}
export const classes: ClassDefinition[] = [
  {
    id: 'manipulator',
    name: 'The Manipulator',
    description: 'A versatile core with pulse, slingshot, and balanced control.',
    cost: 0,
    powers: ['pulse', 'slingshot'],
    modifiers: [],
  },
  {
    id: 'massborn',
    name: 'The Massborn',
    description: 'Five times heavier, with powerful collisions and a slower stride.',
    cost: 20,
    powers: ['pulse', 'burst'],
    modifiers: [
      { stat: 'mass', operation: 'multiply', value: 5 },
      { stat: 'movement', operation: 'multiply', value: 0.8 },
      { stat: 'impactDamage', operation: 'multiply', value: 1.4 },
    ],
  },
  {
    id: 'voidwalker',
    name: 'The Voidwalker',
    description: 'A light core barely touched by gravity. Suspend fields and dash through the gap.',
    cost: 30,
    powers: ['zero', 'slingshot'],
    modifiers: [
      { stat: 'mass', operation: 'multiply', value: 0.3 },
      { stat: 'gravityResponse', operation: 'multiply', value: 0.2 },
      { stat: 'maxHealth', operation: 'add', value: -15 },
    ],
  },
  {
    id: 'orbiter',
    name: 'The Orbiter',
    description:
      'Build moving gravity sources and capture projectiles. Orbital fields last longer.',
    cost: 40,
    powers: ['planet', 'reflect'],
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 1.5, tags: ['Orbit'] },
      { stat: 'energyRegen', operation: 'add', value: -2 },
    ],
  },
  {
    id: 'singularity',
    name: 'The Singularity',
    description: 'Powerful compression fields surround a slow, durable core.',
    cost: 50,
    powers: ['collapse', 'vacuum'],
    modifiers: [
      { stat: 'strength', operation: 'multiply', value: 1.5, tags: ['Compression'] },
      { stat: 'movement', operation: 'multiply', value: 0.6 },
      { stat: 'maxHealth', operation: 'add', value: 25 },
    ],
  },
  {
    id: 'trickster',
    name: 'The Trickster',
    description: 'Gravity directions become unpredictable; gravity powers gain enormous force.',
    cost: 35,
    powers: ['reverse', 'rotate'],
    modifiers: [
      { stat: 'randomGravity', operation: 'override', value: 1 },
      { stat: 'strength', operation: 'multiply', value: 1.8, tags: ['Gravity'] },
    ],
  },
  {
    id: 'engineer',
    name: 'The Engineer',
    description:
      'Deploy a destructible gravity machine and reposition it with repulsors. Efficient fields trade force for uptime.',
    cost: 40,
    powers: ['beacon', 'repulsor'],
    modifiers: [
      { stat: 'energyCost', operation: 'multiply', value: 0.7 },
      { stat: 'strength', operation: 'multiply', value: 0.8 },
      { stat: 'duration', operation: 'multiply', value: 1.4 },
    ],
  },
  {
    id: 'parasite',
    name: 'The Parasite',
    description: 'Steal gravitational response, then spend accumulated force in a burst.',
    cost: 45,
    powers: ['theft', 'burst'],
    modifiers: [
      { stat: 'cooldown', operation: 'multiply', value: 0.65, tags: ['Mass'] },
      { stat: 'energyRegen', operation: 'add', value: 2 },
    ],
  },
  {
    id: 'conductor',
    name: 'The Conductor',
    description:
      'Link bodies with Gravity Tether, then drive the chain with Gravity Wave. Control powers last 40% longer, but core movement is 15% slower.',
    cost: 55,
    powers: ['tether', 'wave'],
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 1.4, tags: ['Control'] },
      { stat: 'movement', operation: 'multiply', value: 0.85 },
    ],
  },
  {
    id: 'kineticist',
    name: 'The Kineticist',
    description:
      'Brake incoming matter and relaunch it with Gravity Beam. Redirected shots deal 50% more damage; your energy reserve is 15 smaller.',
    cost: 55,
    powers: ['kinetic_brake', 'beam'],
    modifiers: [
      { stat: 'projectileDamage', operation: 'multiply', value: 1.5 },
      { stat: 'maxEnergy', operation: 'add', value: -15 },
    ],
  },
];
export const classById = new Map(classes.map((definition) => [definition.id, definition]));
