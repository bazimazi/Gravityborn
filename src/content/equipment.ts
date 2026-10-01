import type { Modifier, TriggerRule } from '../progression/modifiers';
export const equipmentSlots = [
  'core',
  'shell',
  'gravity',
  'movement',
  'artifact',
  'utility',
] as const;
export type EquipmentSlot = (typeof equipmentSlots)[number];
type Stat = Omit<Modifier, 'id'>;
export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  set: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  cost: number;
  modifiers: Stat[];
  triggers?: Omit<TriggerRule, 'id'>[];
}
interface Family {
  id: string;
  name: string;
  tag: string;
  stats: Stat[];
  trade: Stat;
  description: string;
  setEffect: Stat;
}
const families: Family[] = [
  {
    id: 'basalt',
    name: 'Basalt',
    tag: 'Mass',
    description: 'Heavy, deliberate impact machinery.',
    stats: [
      { stat: 'mass', operation: 'multiply', value: 1.8 },
      { stat: 'maxHealth', operation: 'add', value: 15 },
      { stat: 'strength', operation: 'multiply', value: 1.25, tags: ['Impact'] },
      { stat: 'gravityResponse', operation: 'multiply', value: 0.7 },
      { stat: 'impactDamage', operation: 'multiply', value: 1.3 },
      { stat: 'maxEnergy', operation: 'add', value: 15 },
    ],
    trade: { stat: 'movement', operation: 'multiply', value: 0.95 },
    setEffect: { stat: 'impactDamage', operation: 'multiply', value: 1.25 },
  },
  {
    id: 'hollow',
    name: 'Hollow',
    tag: 'Void',
    description: 'Light chambers exchange durability for freedom from gravity.',
    stats: [
      { stat: 'mass', operation: 'multiply', value: 0.5 },
      { stat: 'gravityResponse', operation: 'multiply', value: 0.5 },
      { stat: 'duration', operation: 'multiply', value: 1.35, tags: ['Void'] },
      { stat: 'movement', operation: 'multiply', value: 1.2 },
      { stat: 'energyCost', operation: 'multiply', value: 0.7, tags: ['Void'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.85 },
    ],
    trade: { stat: 'maxHealth', operation: 'add', value: -4 },
    setEffect: { stat: 'energyCost', operation: 'multiply', value: 0.8, tags: ['Void'] },
  },
  {
    id: 'epicycle',
    name: 'Epicycle',
    tag: 'Orbit',
    description: 'Orbital instruments maintain moving fields for longer.',
    stats: [
      { stat: 'maxEnergy', operation: 'add', value: 20 },
      { stat: 'maxHealth', operation: 'add', value: 8 },
      { stat: 'strength', operation: 'multiply', value: 1.3, tags: ['Orbit'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.75, tags: ['Movement'] },
      { stat: 'duration', operation: 'multiply', value: 1.4, tags: ['Orbit'] },
      { stat: 'radius', operation: 'multiply', value: 1.25, tags: ['Orbit'] },
    ],
    trade: { stat: 'energyRegen', operation: 'add', value: -0.4 },
    setEffect: { stat: 'cooldown', operation: 'multiply', value: 0.8, tags: ['Orbit'] },
  },
  {
    id: 'titan',
    name: 'Titan',
    tag: 'Gravity',
    description: 'High-force coils demand more power for every cast.',
    stats: [
      { stat: 'maxEnergy', operation: 'add', value: 25 },
      { stat: 'maxHealth', operation: 'add', value: 12 },
      { stat: 'strength', operation: 'multiply', value: 1.35, tags: ['Gravity'] },
      { stat: 'movement', operation: 'multiply', value: 1.15 },
      { stat: 'radius', operation: 'multiply', value: 1.25, tags: ['Gravity'] },
      { stat: 'duration', operation: 'multiply', value: 1.3, tags: ['Gravity'] },
    ],
    trade: { stat: 'energyCost', operation: 'multiply', value: 1.04 },
    setEffect: { stat: 'strength', operation: 'multiply', value: 1.2, tags: ['Gravity'] },
  },
  {
    id: 'vector',
    name: 'Vector',
    tag: 'Velocity',
    description: 'Fast, precise assemblies give up some gravity control.',
    stats: [
      { stat: 'mass', operation: 'multiply', value: 0.7 },
      { stat: 'maxHealth', operation: 'add', value: 8 },
      { stat: 'projectileDamage', operation: 'multiply', value: 1.4 },
      { stat: 'movement', operation: 'multiply', value: 1.25 },
      { stat: 'strength', operation: 'multiply', value: 1.3, tags: ['Velocity'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.8, tags: ['Velocity'] },
    ],
    trade: { stat: 'duration', operation: 'multiply', value: 0.96 },
    setEffect: { stat: 'projectileDamage', operation: 'multiply', value: 1.3 },
  },
  {
    id: 'paradox',
    name: 'Paradox',
    tag: 'Chaos',
    description: 'Unstable hardware favors violent bursts over sustained fields.',
    stats: [
      { stat: 'maxEnergy', operation: 'add', value: 30 },
      { stat: 'maxHealth', operation: 'add', value: 10 },
      { stat: 'strength', operation: 'multiply', value: 1.4, tags: ['Chaos'] },
      { stat: 'movement', operation: 'multiply', value: 1.18 },
      { stat: 'strength', operation: 'multiply', value: 1.2 },
      { stat: 'cooldown', operation: 'multiply', value: 0.75, tags: ['Chaos'] },
    ],
    trade: { stat: 'energyRegen', operation: 'add', value: -0.3 },
    setEffect: { stat: 'strength', operation: 'multiply', value: 1.25, tags: ['Chaos'] },
  },
  {
    id: 'lattice',
    name: 'Lattice',
    tag: 'Control',
    description: 'Efficient machines widen control fields while lowering peak force.',
    stats: [
      { stat: 'maxEnergy', operation: 'add', value: 18 },
      { stat: 'maxHealth', operation: 'add', value: 12 },
      { stat: 'radius', operation: 'multiply', value: 1.35, tags: ['Control'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.9 },
      { stat: 'duration', operation: 'multiply', value: 1.4, tags: ['Control'] },
      { stat: 'energyRegen', operation: 'add', value: 2 },
    ],
    trade: { stat: 'strength', operation: 'multiply', value: 0.97 },
    setEffect: { stat: 'energyCost', operation: 'multiply', value: 0.8, tags: ['Control'] },
  },
  {
    id: 'symbiote',
    name: 'Symbiote',
    tag: 'Mass',
    description: 'Living components recycle energy but demand a fragile shell.',
    stats: [
      { stat: 'energyRegen', operation: 'add', value: 2 },
      { stat: 'gravityResponse', operation: 'multiply', value: 0.7 },
      { stat: 'cooldown', operation: 'multiply', value: 0.75, tags: ['Mass'] },
      { stat: 'movement', operation: 'multiply', value: 1.2 },
      { stat: 'duration', operation: 'multiply', value: 1.4, tags: ['Mass'] },
      { stat: 'maxEnergy', operation: 'add', value: 25 },
    ],
    trade: { stat: 'maxHealth', operation: 'add', value: -3 },
    setEffect: { stat: 'energyRegen', operation: 'add', value: 2 },
  },
];
const names = ['Heart', 'Mantle', 'Lens', 'Thruster', 'Seal', 'Relay'];
export function modifierText(modifier: Stat): string {
  const value =
    modifier.operation === 'multiply'
      ? `${Math.round((modifier.value - 1) * 100) >= 0 ? '+' : ''}${Math.round((modifier.value - 1) * 100)}%`
      : `${modifier.value >= 0 ? '+' : ''}${modifier.value}`;
  return `${value} ${modifier.stat.replace(/([A-Z])/g, ' $1').toLowerCase()}${modifier.tags ? ` (${modifier.tags.join(', ')})` : ''}`;
}
export const equipment: EquipmentDefinition[] = families.flatMap((family) =>
  equipmentSlots.map((slot, index) => ({
    id: `${family.id}_${slot}`,
    name: `${family.name} ${names[index]}`,
    slot,
    set: family.id,
    description: `${family.description} ${modifierText(family.stats[index])}; ${modifierText(family.trade)}.`,
    rarity: index === 4 ? ('rare' as const) : ('common' as const),
    cost: 12 + index * 3,
    modifiers: [family.stats[index], family.trade],
  })),
);
equipment.push(
  {
    id: 'event_horizon',
    name: 'Event Horizon Engine',
    slot: 'artifact',
    set: 'relic',
    description: 'Powers echo once. Maximum integrity is reduced by 25.',
    rarity: 'legendary',
    cost: 75,
    modifiers: [{ stat: 'maxHealth', operation: 'add', value: -25 }],
    triggers: [{ trigger: 'OnAbilityCast', effect: 'echo', value: 1, cooldown: 0.3 }],
  },
  {
    id: 'phoenix_reactor',
    name: 'Phoenix Reactor',
    slot: 'core',
    set: 'relic',
    description: 'Revive once per room at 20 integrity. Powers recharge 20% slower.',
    rarity: 'legendary',
    cost: 75,
    modifiers: [{ stat: 'cooldown', operation: 'multiply', value: 1.2 }],
    triggers: [{ trigger: 'OnDeath', effect: 'revive', value: 20, cooldown: 36000 }],
  },
);
export const equipmentById = new Map(equipment.map((item) => [item.id, item]));
export const equipmentSets = new Map(
  families.map((family) => [family.id, { name: family.name, modifier: family.setEffect }]),
);
export const affixes: { id: string; name: string; modifier: Stat }[] = [
  {
    id: 'steady',
    name: 'Steady',
    modifier: { stat: 'gravityResponse', operation: 'multiply', value: 0.9 },
  },
  { id: 'charged', name: 'Charged', modifier: { stat: 'maxEnergy', operation: 'add', value: 8 } },
  {
    id: 'swift',
    name: 'Swift',
    modifier: { stat: 'movement', operation: 'multiply', value: 1.05 },
  },
  {
    id: 'efficient',
    name: 'Efficient',
    modifier: { stat: 'energyCost', operation: 'multiply', value: 0.95 },
  },
];
