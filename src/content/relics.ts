import type { Modifier, TriggerRule } from '../progression/modifiers';
export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rarity: 'common' | 'rare' | 'legendary';
  modifiers?: Omit<Modifier, 'id'>[];
  triggers?: Omit<TriggerRule, 'id'>[];
}
export const relics: RelicDefinition[] = [
  {
    id: 'heavy_heart',
    name: 'Heavy Heart',
    description:
      'Your core becomes four times heavier. Collisions deliver more force, but acceleration remains controllable.',
    tags: ['Mass', 'Impact'],
    rarity: 'common',
    modifiers: [{ stat: 'mass', operation: 'multiply', value: 4 }],
  },
  {
    id: 'feather',
    name: 'Feather Core',
    description:
      'Your mass falls to one fifth. Reduced gravity response makes tight escapes easier.',
    tags: ['Movement', 'Void'],
    rarity: 'common',
    modifiers: [
      { stat: 'mass', operation: 'multiply', value: 0.2 },
      { stat: 'gravityResponse', operation: 'multiply', value: 0.6 },
    ],
  },
  {
    id: 'hungry',
    name: 'Hungry Singularity',
    description: 'Gravity fields last 60% longer, keeping captured matter in play.',
    tags: ['Gravity', 'Compression'],
    rarity: 'common',
    modifiers: [{ stat: 'duration', operation: 'multiply', value: 1.6, tags: ['Gravity'] }],
  },
  {
    id: 'compass',
    name: 'Broken Compass',
    description:
      'Your gravity changes choose a different random cardinal direction. Gravity powers gain 70% strength.',
    tags: ['Chaos', 'Gravity'],
    rarity: 'rare',
    modifiers: [
      { stat: 'randomGravity', operation: 'override', value: 1 },
      { stat: 'strength', operation: 'multiply', value: 1.7, tags: ['Gravity'] },
    ],
  },
  {
    id: 'crown',
    name: 'Orbital Crown',
    description:
      'A recurring vortex forms around your core, turning loose matter into an orbital defense.',
    tags: ['Orbit', 'Defense'],
    rarity: 'rare',
    triggers: [{ trigger: 'Periodic', effect: 'orbit', value: 0.003, cooldown: 1 }],
  },
  {
    id: 'battery',
    name: 'Gravity Battery',
    description: 'Collisions charge Stored Burst. Your gravitational energy reserve grows by 30.',
    tags: ['Mass', 'Gravity'],
    rarity: 'common',
    modifiers: [{ stat: 'maxEnergy', operation: 'add', value: 30 }],
    triggers: [{ trigger: 'OnCollision', effect: 'store', value: 6, cooldown: 0.5 }],
  },
  {
    id: 'echo',
    name: 'Echo Core',
    description: 'Every power echoes once after a short delay at no energy cost.',
    tags: ['Gravity', 'Chaos'],
    rarity: 'legendary',
    triggers: [{ trigger: 'OnAbilityCast', effect: 'echo', value: 1, cooldown: 0.3 }],
  },
  {
    id: 'newton',
    name: "Newton's Revenge",
    description: 'Collision damage doubles. Heavy objects become devastating weapons.',
    tags: ['Impact', 'Velocity'],
    rarity: 'rare',
    modifiers: [{ stat: 'impactDamage', operation: 'multiply', value: 2 }],
  },
  {
    id: 'capacitor',
    name: 'Redirection Capacitor',
    description: 'Manipulating gravity restores 10 energy, once every two seconds.',
    tags: ['Projectile', 'Gravity'],
    rarity: 'common',
    triggers: [{ trigger: 'OnGravityChange', effect: 'energy', value: 10, cooldown: 2 }],
  },
  {
    id: 'repair',
    name: 'Salvage Organ',
    description: 'Destroying a hostile repairs four core integrity, at most once per second.',
    tags: ['Defense', 'Mass'],
    rarity: 'common',
    triggers: [{ trigger: 'OnKill', effect: 'heal', value: 4, cooldown: 1 }],
  },
  {
    id: 'aegis',
    name: 'Inertial Aegis',
    description: 'After taking a hit, phase out of damage for an additional second.',
    tags: ['Defense', 'Void'],
    rarity: 'rare',
    triggers: [{ trigger: 'OnDamage', effect: 'shield', value: 1.8, cooldown: 4 }],
  },
  {
    id: 'lens',
    name: 'Compression Lens',
    description: 'Compression powers reach 40% farther and cost 20% less energy.',
    tags: ['Compression', 'Gravity'],
    rarity: 'common',
    modifiers: [
      { stat: 'radius', operation: 'multiply', value: 1.4, tags: ['Compression'] },
      { stat: 'energyCost', operation: 'multiply', value: 0.8, tags: ['Compression'] },
    ],
  },
  {
    id: 'drive',
    name: 'Slipstream Drive',
    description: 'Movement accelerates 30% faster and movement powers recharge 35% sooner.',
    tags: ['Movement', 'Velocity'],
    rarity: 'common',
    modifiers: [
      { stat: 'movement', operation: 'multiply', value: 1.3 },
      { stat: 'cooldown', operation: 'multiply', value: 0.65, tags: ['Movement'] },
    ],
  },
  {
    id: 'prism',
    name: 'Ballistic Prism',
    description: 'Redirected projectiles deal twice the damage. Projectile powers cost 25% less.',
    tags: ['Projectile', 'Velocity'],
    rarity: 'rare',
    modifiers: [
      { stat: 'projectileDamage', operation: 'multiply', value: 2 },
      { stat: 'energyCost', operation: 'multiply', value: 0.75, tags: ['Projectile'] },
    ],
  },
  {
    id: 'seed',
    name: 'Second Dawn',
    description: 'Once per room, a fatal hit restores 30 integrity and grants a brief shield.',
    tags: ['Defense', 'Gravity'],
    rarity: 'legendary',
    triggers: [{ trigger: 'OnDeath', effect: 'revive', value: 30, cooldown: 36000 }],
  },
];
export const relicById = new Map(relics.map((relic) => [relic.id, relic]));

export const synergies = [
  {
    id: 'overload',
    name: 'Gravitational Overload',
    requires: ['theft', 'pulse'],
    stat: 'strength',
    value: 1.6,
    tags: ['Impact'],
  },
  {
    id: 'prison',
    name: 'Orbital Prison',
    requires: ['planet', 'lock'],
    stat: 'duration',
    value: 1.5,
    tags: ['Orbit'],
  },
  {
    id: 'storm',
    name: 'Projectile Storm',
    requires: ['zero', 'reflect'],
    stat: 'cooldown',
    value: 0.55,
    tags: ['Projectile'],
  },
  {
    id: 'vacuum_bomb',
    name: 'Explosion Vacuum',
    requires: ['vacuum', 'collapse'],
    stat: 'radius',
    value: 1.5,
    tags: ['Compression'],
  },
] as const;
