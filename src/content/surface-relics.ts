import type { RelicDefinition } from './relics';

export const surfaceRelics: RelicDefinition[] = [
  {
    id: 'coil_lacquer',
    name: 'Coil Lacquer',
    rarity: 'rare',
    tags: ['Surface', 'Impact'],
    description:
      'Surface coatings gain 20% restitution, capped at 1.2, but last 20% less time. Elastic ammunition rebounds harder; zero-restitution foam stays inert.',
    modifiers: [
      { stat: 'surface_restitution', operation: 'multiply', value: 1.2 },
      { stat: 'duration', operation: 'multiply', value: 0.8, tags: ['Surface'] },
    ],
  },
  {
    id: 'viscous_resin',
    name: 'Viscous Resin',
    rarity: 'rare',
    tags: ['Surface', 'Defense'],
    description:
      'Coatings apply 50% more air drag, but Surface powers cost 20% more energy. Drag-free coatings remain drag-free.',
    modifiers: [
      { stat: 'surface_frictionAir', operation: 'multiply', value: 1.5 },
      { stat: 'energyCost', operation: 'multiply', value: 1.2, tags: ['Surface'] },
    ],
  },
  {
    id: 'antistatic_film',
    name: 'Antistatic Film',
    rarity: 'rare',
    tags: ['Surface', 'Velocity'],
    description:
      'Coatings that change contact friction set it to zero. Gain 15% movement acceleration: Deadening Foam now slows airborne motion while allowing frictionless contact.',
    modifiers: [
      { stat: 'surface_friction', operation: 'override', value: 0 },
      { stat: 'surface_frictionStatic', operation: 'override', value: 0 },
      { stat: 'movement', operation: 'multiply', value: 1.15 },
    ],
  },
  {
    id: 'lasting_varnish',
    name: 'Lasting Varnish',
    rarity: 'common',
    tags: ['Surface', 'Control'],
    description:
      'Surface coatings last twice as long, but their cooldowns increase by 40%. Commit to a lasting physical setup.',
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 2, tags: ['Surface'] },
      { stat: 'cooldown', operation: 'multiply', value: 1.4, tags: ['Surface'] },
    ],
  },
  {
    id: 'flash_solvent',
    name: 'Flash Solvent',
    rarity: 'common',
    tags: ['Surface', 'Velocity'],
    description:
      'Surface powers cost 30% less energy and recover twice as fast, but coatings last half as long. Apply them just before the impact you need.',
    modifiers: [
      { stat: 'duration', operation: 'multiply', value: 0.5, tags: ['Surface'] },
      { stat: 'cooldown', operation: 'multiply', value: 0.5, tags: ['Surface'] },
      { stat: 'energyCost', operation: 'multiply', value: 0.7, tags: ['Surface'] },
    ],
  },
  {
    id: 'rebound_dividend',
    name: 'Rebound Dividend',
    rarity: 'common',
    tags: ['Surface', 'Impact'],
    description:
      'Impact kills credited to Surface powers return eight energy, at most once per second. Another force taking ownership replaces that credit.',
    triggers: [{ trigger: 'OnKill', effect: 'energy', value: 8, cooldown: 1, tags: ['Surface'] }],
  },
  {
    id: 'slipstream_cradle',
    name: 'Slipstream Cradle',
    rarity: 'rare',
    tags: ['Surface', 'Orbit'],
    description:
      'Casting a Surface power gives nearby matter a tangential kick around your core, at most once every four seconds. Set coated debris moving immediately.',
    triggers: [
      { trigger: 'OnAbilityCast', effect: 'orbitPulse', value: 3, cooldown: 4, tags: ['Surface'] },
    ],
  },
];
