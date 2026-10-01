import type { Modifier, TriggerRule } from '../progression/modifiers';
import { advancedRelics } from './advanced-relics';
import { specialistRelics } from './specialist-relics';
import { kineticRelics } from './kinetic-relics';
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
    id: 'redshift',
    name: 'Redshift Lens',
    rarity: 'rare',
    tags: ['Impact', 'Velocity'],
    description:
      'While moving at speed 6 or faster, collision damage increases by 60%. Keep your core in motion.',
    modifiers: [
      {
        stat: 'impactDamage',
        operation: 'multiply',
        value: 1.6,
        conditions: [{ stat: 'speed', comparison: 'gte', value: 6 }],
      },
    ],
  },
  {
    id: 'last_light',
    name: 'Last Light',
    rarity: 'rare',
    tags: ['Defense', 'Gravity'],
    description:
      'Below 35% integrity, hostile kills repair 10 integrity, at most once every two seconds.',
    triggers: [
      {
        trigger: 'OnKill',
        effect: 'heal',
        value: 10,
        cooldown: 2,
        conditions: [{ stat: 'healthRatio', comparison: 'lt', value: 0.35 }],
      },
    ],
  },
  {
    id: 'quiet_orbit',
    name: 'Quiet Orbit',
    rarity: 'common',
    tags: ['Orbit', 'Defense'],
    description:
      'With no hostiles within 240 units, regenerate four extra energy per second. Create space to recharge.',
    modifiers: [
      {
        stat: 'energyRegen',
        operation: 'add',
        value: 4,
        conditions: [{ stat: 'nearbyEnemies', comparison: 'eq', value: 0 }],
      },
    ],
  },
  {
    id: 'crowd_pressure',
    name: 'Crowd Pressure',
    rarity: 'rare',
    tags: ['Gravity', 'Compression'],
    description: 'With at least three hostiles within 240 units, gravity powers reach 35% farther.',
    modifiers: [
      {
        stat: 'radius',
        operation: 'multiply',
        value: 1.35,
        tags: ['Gravity'],
        conditions: [{ stat: 'nearbyEnemies', comparison: 'gte', value: 3 }],
      },
    ],
  },
  {
    id: 'full_spectrum',
    name: 'Full Spectrum',
    rarity: 'rare',
    tags: ['Gravity', 'Mass'],
    description:
      'Powers cast at 80% energy or more gain 40% strength. Effects use energy before the cast is paid.',
    modifiers: [
      {
        stat: 'strength',
        operation: 'multiply',
        value: 1.4,
        conditions: [{ stat: 'energyRatio', comparison: 'gte', value: 0.8 }],
      },
    ],
  },
  {
    id: 'reserve_cell',
    name: 'Reserve Cell',
    rarity: 'common',
    tags: ['Gravity', 'Defense'],
    description:
      'Gravity changes restore 18 energy while below 25% energy, once every three seconds.',
    triggers: [
      {
        trigger: 'OnGravityChange',
        effect: 'energy',
        value: 18,
        cooldown: 3,
        conditions: [{ stat: 'energyRatio', comparison: 'lt', value: 0.25 }],
      },
    ],
  },
  {
    id: 'still_point',
    name: 'Still Point',
    rarity: 'rare',
    tags: ['Compression', 'Gravity'],
    description:
      'Compression powers cost 40% less energy while your speed is below 1. Timing a stationary cast matters.',
    modifiers: [
      {
        stat: 'energyCost',
        operation: 'multiply',
        value: 0.6,
        tags: ['Compression'],
        conditions: [{ stat: 'speed', comparison: 'lt', value: 1 }],
      },
    ],
  },
  {
    id: 'charged_escape',
    name: 'Charged Escape',
    rarity: 'legendary',
    tags: ['Movement', 'Mass'],
    description:
      'At 50 stored charge or more, movement powers recharge 50% sooner. Stored Burst spends this advantage.',
    modifiers: [
      {
        stat: 'cooldown',
        operation: 'multiply',
        value: 0.5,
        tags: ['Movement'],
        conditions: [{ stat: 'stored', comparison: 'gte', value: 50 }],
      },
    ],
  },
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
  ...advancedRelics,
  ...specialistRelics,
  ...kineticRelics,
];
export const relicById = new Map(relics.map((relic) => [relic.id, relic]));

export interface SynergyDefinition {
  id: string;
  name: string;
  description: string;
  requires?: string[];
  requiresTags?: string[];
  modifiers?: Omit<Modifier, 'id'>[];
  triggers?: Omit<TriggerRule, 'id'>[];
}
export const synergies: SynergyDefinition[] = [
  {
    id: 'weighted_orbit',
    name: 'Weighted Orbit',
    description:
      'Densify and Orbital Strike extend Mass effects by 50%. Keep heavy ammunition active through its orbital pass.',
    requires: ['densify', 'orbital_strike'],
    modifiers: [{ stat: 'duration', operation: 'multiply', value: 1.5, tags: ['Mass'] }],
  },
  {
    id: 'ricochet_geometry',
    name: 'Ricochet Geometry',
    description:
      'Quarter Turn and Gravity Beam reverse nearby shots on gravity changes, at most once every four seconds.',
    requires: ['quarter_turn', 'beam'],
    triggers: [{ trigger: 'OnGravityChange', effect: 'returnShots', value: -1, cooldown: 4 }],
  },
  {
    id: 'light_filament',
    name: 'Light Filament',
    description: 'Featherweight and the Tether family reduce Control power energy costs by 20%.',
    requires: ['featherweight', 'tether'],
    modifiers: [{ stat: 'energyCost', operation: 'multiply', value: 0.8, tags: ['Control'] }],
  },
  {
    id: 'tension_wave',
    name: 'Tension Wave',
    description:
      'A Tether-family power and Gravity Wave extend Gravity effects by 25%, giving linked matter more time to travel.',
    requires: ['tether', 'wave'],
    modifiers: [{ stat: 'duration', operation: 'multiply', value: 1.25, tags: ['Gravity'] }],
  },
  {
    id: 'kinetic_reflex',
    name: 'Kinetic Reflex',
    description:
      'A Brake-family power and Orbital Guard grant a 0.5-second shield when a Projectile cast leaves you below 35% energy, once every eight seconds.',
    requires: ['kinetic_brake', 'reflect'],
    triggers: [
      {
        trigger: 'OnAbilityCast',
        effect: 'shield',
        value: 0.5,
        cooldown: 8,
        tags: ['Projectile'],
        conditions: [{ stat: 'energyRatio', comparison: 'lt', value: 0.35 }],
      },
    ],
  },
  {
    id: 'tidal_cannon',
    name: 'Tidal Cannon',
    description: 'Gravity Wave and Beam gain 35% velocity-tagged force.',
    requires: ['wave', 'beam'],
    modifiers: [{ stat: 'strength', operation: 'multiply', value: 1.35, tags: ['Velocity'] }],
  },
  {
    id: 'overload',
    name: 'Gravitational Overload',
    description: 'Gravity Theft and the Pulse family amplify impact-tagged force by 60%.',
    requires: ['theft', 'pulse'],
    modifiers: [{ stat: 'strength', operation: 'multiply', value: 1.6, tags: ['Impact'] }],
  },
  {
    id: 'prison',
    name: 'Orbital Prison',
    description:
      'A planet-family power and a Control-tagged power, relic, equipped item or active mutation extend orbital effects by 50%.',
    requires: ['planet'],
    requiresTags: ['Control'],
    modifiers: [{ stat: 'duration', operation: 'multiply', value: 1.5, tags: ['Orbit'] }],
  },
  {
    id: 'storm',
    name: 'Projectile Storm',
    description: 'Zero-G and Orbital Shield shorten projectile power cooldowns by 45%.',
    requires: ['zero', 'reflect'],
    modifiers: [{ stat: 'cooldown', operation: 'multiply', value: 0.55, tags: ['Projectile'] }],
  },
  {
    id: 'vacuum_bomb',
    name: 'Explosion Vacuum',
    description: 'Vacuum and the Collapse family expand compression effects by 50%.',
    requires: ['vacuum', 'collapse'],
    modifiers: [{ stat: 'radius', operation: 'multiply', value: 1.5, tags: ['Compression'] }],
  },
  {
    id: 'escape_window',
    name: 'Escape Window',
    description:
      'Slingshot and Gravity Lock grant a 0.65-second shield when you cast a Movement power, once every six seconds.',
    requires: ['slingshot', 'lock'],
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'shield', value: 0.65, cooldown: 6, tags: ['Movement'] },
    ],
  },
  {
    id: 'entropy_engine',
    name: 'Entropy Engine',
    description:
      'Theft and Burst recover 12 stored charge from impact kills, at most once per second.',
    requires: ['theft', 'burst'],
    triggers: [{ trigger: 'OnKill', effect: 'store', value: 12, cooldown: 1, tags: ['Impact'] }],
  },
];
