import base from '../data/entities.json';

function enemy(
  name: string,
  mass: number,
  health: number,
  radius: number,
  color: string,
  tags: string[],
  response = 1,
) {
  return { ...base.chaser, name, mass, health, radius, color, tags, gravityResponse: response };
}
export const enemyDefinitions = {
  slime: enemy('Gravity Slime', 2.5, 65, 21, '#8adcaa', ['Gravity', 'Control']),
  anchor: enemy('Anchor', 16, 130, 27, '#b5c6d9', ['Gravity', 'Defense'], 0),
  floater: enemy('Floater', 1, 42, 18, '#ede89e', ['Velocity', 'Movement'], 1.8),
  bomber: enemy('Bomb Carrier', 3, 48, 22, '#ff976c', ['Explosion', 'Impact']),
  leech: enemy('Gravity Leech', 1.8, 55, 18, '#bc80da', ['Gravity', 'Support']),
  orbiter: enemy('Orbiter', 2, 65, 21, '#8cbded', ['Orbit', 'Velocity'], 0.4),
  repulsor: enemy('Repulsor', 5, 95, 25, '#f2be85', ['Gravity', 'Control']),
  swarm: enemy('Swarm Mote', 0.5, 18, 11, '#ffafc2', ['Velocity', 'Collision']),
  phase: enemy('Phase Stalker', 1.6, 60, 19, '#c7b1f9', ['Void', 'Movement']),
  singularity: enemy('Singularity', 8, 100, 24, '#b18bff', ['Void', 'Compression']),
  mirror: enemy('Mirror', 3, 85, 23, '#a8e4f0', ['Gravity', 'Defense']),
  parasite: enemy('Gravity Parasite', 0.6, 30, 13, '#d4db79', ['Gravity', 'Support']),
  summoner: enemy('Brood Engine', 6, 100, 25, '#dd9fd4', ['Support', 'Mass']),
} as const;
export type SpecialEnemy = keyof typeof enemyDefinitions;
export const eliteModifiers = [
  'heavy',
  'inverted',
  'orbital',
  'unstable',
  'vampire',
  'reflector',
  'anchor',
  'singularity',
] as const;
export type EliteModifier = (typeof eliteModifiers)[number];
export const enemyGlyphs: Record<SpecialEnemy, string> = {
  slime: 'S',
  anchor: '⊥',
  floater: '↑',
  bomber: '!',
  leech: 'L',
  orbiter: '○',
  repulsor: '↔',
  swarm: '·',
  phase: 'P',
  singularity: '●',
  mirror: '◇',
  parasite: '+',
  summoner: 'Σ',
};
export const entityDefinitions = { ...base, ...enemyDefinitions };
