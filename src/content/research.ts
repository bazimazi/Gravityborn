import type { Modifier, TriggerRule } from '../progression/modifiers';
export interface ResearchNode {
  id: string;
  tree: string;
  name: string;
  description: string;
  cost: number;
  requires?: string;
  modifier?: Omit<Modifier, 'id'>;
}
export const researchNodes: ResearchNode[] = [
  {
    id: 'field_theory',
    tree: 'Gravity Mastery',
    name: 'Field Theory',
    description: 'Gravity powers gain 8% strength.',
    cost: 2,
    modifier: { stat: 'strength', operation: 'multiply', value: 1.08, tags: ['Gravity'] },
  },
  {
    id: 'mutations',
    tree: 'Gravity Mastery',
    name: 'Mutable Core',
    description: 'Choose one permanent physics mutation before each expedition.',
    cost: 5,
    requires: 'field_theory',
  },
  {
    id: 'vitality',
    tree: 'Survivor',
    name: 'Core Reinforcement',
    description: 'Gain 10 maximum integrity.',
    cost: 2,
    modifier: { stat: 'maxHealth', operation: 'add', value: 10 },
  },
  {
    id: 'agility',
    tree: 'Survivor',
    name: 'Escape Velocity',
    description: 'Gain 8% movement acceleration.',
    cost: 4,
    requires: 'vitality',
    modifier: { stat: 'movement', operation: 'multiply', value: 1.08 },
  },
  {
    id: 'reroll',
    tree: 'Research',
    name: 'Second Opinion',
    description: 'Reroll one upgrade offer each expedition.',
    cost: 2,
  },
  {
    id: 'reroll_plus',
    tree: 'Research',
    name: 'Peer Review',
    description: 'Gain a second upgrade reroll.',
    cost: 5,
    requires: 'reroll',
  },
  {
    id: 'scavenger',
    tree: 'Technology',
    name: 'Salvage Grant',
    description: 'Start each expedition with 15 matter shards.',
    cost: 2,
  },
  {
    id: 'affixes',
    tree: 'Technology',
    name: 'Precision Workshop',
    description: 'Reforge equipment with a chosen affix.',
    cost: 5,
    requires: 'scavenger',
  },
  {
    id: 'navigation',
    tree: 'Discovery',
    name: 'Deep Navigation',
    description: 'Start expeditions in any discovered region.',
    cost: 3,
  },
  {
    id: 'survey',
    tree: 'Discovery',
    name: 'Long-Range Survey',
    description: 'All eight regions become selectable starting points.',
    cost: 8,
    requires: 'navigation',
  },
  {
    id: 'mastery',
    tree: 'Mastery',
    name: 'Deliberate Practice',
    description: 'Class mastery contributes a modest 5% energy recovery bonus.',
    cost: 3,
    modifier: { stat: 'energyRegen', operation: 'multiply', value: 1.05 },
  },
  {
    id: 'endless',
    tree: 'Mastery',
    name: 'Beyond the Horizon',
    description: 'Unlock endless expeditions after a guardian victory.',
    cost: 8,
    requires: 'mastery',
  },
];
export const mutations: {
  id: string;
  name: string;
  description: string;
  modifiers: Omit<Modifier, 'id'>[];
  triggers?: Omit<TriggerRule, 'id'>[];
}[] = [
  {
    id: 'negative',
    name: 'Negative Mass',
    description: 'Your core responds to gravity in the opposite direction.',
    modifiers: [{ stat: 'gravityResponse', operation: 'multiply', value: -1 }],
  },
  {
    id: 'dense',
    name: 'Dense Matter',
    description: 'Triple your core mass, but lose 20% movement acceleration.',
    modifiers: [
      { stat: 'mass', operation: 'multiply', value: 3 },
      { stat: 'movement', operation: 'multiply', value: 0.8 },
    ],
  },
  {
    id: 'light',
    name: 'Light Matter',
    description: 'Halve your core mass and gain 30% movement acceleration.',
    modifiers: [
      { stat: 'mass', operation: 'multiply', value: 0.5 },
      { stat: 'movement', operation: 'multiply', value: 1.3 },
    ],
  },
  {
    id: 'dual',
    name: 'Dual Gravity',
    description: 'Maintain an additional gravity well, at the cost of longer well cooldowns.',
    modifiers: [
      { stat: 'maxWells', operation: 'add', value: 1 },
      { stat: 'cooldown', operation: 'multiply', value: 1.1, tags: ['Control'] },
    ],
  },
  {
    id: 'unstable',
    name: 'Instability',
    description: 'Gravity changes become unpredictable, but your powers gain 40% strength.',
    modifiers: [
      { stat: 'randomGravity', operation: 'override', value: 1 },
      { stat: 'strength', operation: 'multiply', value: 1.4 },
    ],
  },
  {
    id: 'afterimage',
    name: 'Echo Gravity',
    description: 'Every gravity change leaves a temporary directional field at your core.',
    modifiers: [],
    triggers: [{ trigger: 'OnGravityChange', effect: 'afterimage', value: 0.003, cooldown: 0.5 }],
  },
  {
    id: 'metabolism',
    name: 'Gravitational Metabolism',
    description: 'Taking damage recovers 20 energy.',
    modifiers: [],
    triggers: [{ trigger: 'OnDamage', effect: 'energy', value: 20, cooldown: 1 }],
  },
  {
    id: 'horizon',
    name: 'Event Horizon',
    description: 'At low health, repeatedly create a powerful attraction field around your core.',
    modifiers: [{ stat: 'maxHealth', operation: 'add', value: -10 }],
    triggers: [{ trigger: 'Periodic', effect: 'horizon', value: 0.006, cooldown: 2 }],
  },
  {
    id: 'personal',
    name: 'Personal Gravity',
    description:
      'Your core becomes a recurring local gravity source with a smaller energy reserve.',
    modifiers: [{ stat: 'maxEnergy', operation: 'add', value: -20 }],
    triggers: [{ trigger: 'Periodic', effect: 'personal', value: 0.002, cooldown: 1 }],
  },
];
