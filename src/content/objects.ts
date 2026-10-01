import base from '../data/entities.json';
function object(
  name: string,
  material: string,
  mass: number,
  health: number,
  color: string,
  tags: string[],
  response = 1,
  restitution = 0.4,
) {
  return {
    ...base.rock,
    name,
    material,
    mass,
    health,
    color,
    tags,
    gravityResponse: response,
    restitution,
    breakable: health < 10000,
  };
}
export const objectDefinitions = {
  crystal: object(
    'Gravity Crystal',
    'crystal',
    3,
    45,
    '#c1a0ff',
    ['Gravity', 'Environmental'],
    1.3,
  ),
  mine: object('Proximity Mine', 'metal', 2, 15, '#ff9768', ['Explosion', 'Environmental']),
  generator: object(
    'Field Generator',
    'metal',
    8,
    90,
    '#96dce9',
    ['Gravity', 'Environmental'],
    0.8,
  ),
  gravity_core: object('Gravity Core', 'gravity', 5, 65, '#bdabff', ['Gravity', 'Mass'], 2.2),
  metal_plate: {
    ...object('Metal Plate', 'metal', 7, 80, '#a3b8c8', ['Impact', 'Environmental']),
    shape: 'rectangle',
    width: 80,
    height: 15,
    radius: 40,
  },
  container: {
    ...object('Explosive Container', 'metal', 12, 60, '#ffb176', ['Explosion', 'Environmental']),
    shape: 'rectangle',
    width: 54,
    height: 48,
    radius: 34,
  },
  energy_cell: object(
    'Energy Cell',
    'plasma',
    1,
    20,
    '#8cebd3',
    ['Energy', 'Environmental'],
    1.5,
    0.7,
  ),
  fragment: object('Planet Fragment', 'stone', 16, 120, '#bdad92', ['Gravity', 'Mass'], 0.8),
  rubber: object('Rubber Boulder', 'rubber', 2, 10000, '#e6a6cb', ['Impact', 'Velocity'], 1, 0.98),
  ice: {
    ...object('Ice Block', 'ice', 3, 35, '#c2eaf5', ['Impact', 'Environmental'], 1, 0.2),
    frictionAir: 0.001,
  },
  void_matter: object('Void Matter', 'void', 0.12, 30, '#be9bd8', ['Void', 'Velocity'], -0.3, 0.8),
  magnet: object('Magnetic Core', 'metal', 5, 80, '#dfacb9', ['Control', 'Environmental']),
  xp: {
    ...object('Knowledge Mote', 'energy', 0.08, 10000, '#a8deff', ['Resource'], 1.4, 0.65),
    shape: 'circle',
    radius: 6,
    frictionAir: 0.02,
  },
  shard: {
    ...object('Matter Shard', 'metal', 0.1, 10000, '#e4c28d', ['Resource'], 1.2, 0.7),
    shape: 'polygon',
    radius: 7,
    frictionAir: 0.02,
  },
} as const;
export const materialDescriptions = [
  { id: 'metal', name: 'Metal', text: 'Dense and durable. Magnetic cores attract metal objects.' },
  {
    id: 'rubber',
    name: 'Rubber',
    text: 'Highly elastic bodies preserve momentum through repeated bounces.',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    text: 'Fragile crystals generate localized attraction fields until destroyed.',
  },
  {
    id: 'plasma',
    name: 'Plasma',
    text: 'Energy cells release a charge on destruction. Projectiles have physical mass.',
  },
  {
    id: 'ice',
    name: 'Ice',
    text: 'Low drag and surface friction make ice easy to slide into targets.',
  },
  { id: 'stone', name: 'Stone', text: 'Heavy, stable matter transfers strong impulses on impact.' },
  {
    id: 'void',
    name: 'Void Matter',
    text: 'Nearly massless matter responds weakly in the opposite gravity direction.',
  },
  {
    id: 'gravity',
    name: 'Gravity Matter',
    text: 'Unstable cores respond strongly to gravity and generate local pull.',
  },
  {
    id: 'energy',
    name: 'Core Energy',
    text: 'Your core and knowledge motes remain physical bodies inside every field.',
  },
];
