import base from '../data/entities.json';
import { bossDefinitions } from './bosses';
import { objectDefinitions } from './objects';

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
  railgunner: enemy('Rail Warden', 4, 90, 23, '#f5c283', ['Projectile', 'Control']),
  null_shepherd: enemy('Null Shepherd', 5, 85, 24, '#bcbcf4', ['Void', 'Support'], 0.3),
  salvager: enemy('Salvager', 3, 95, 22, '#e4ba85', ['Mass', 'Support']),
  lancer: enemy('Momentum Lancer', 3, 70, 20, '#f29aaa', ['Velocity', 'Impact']),
  flux_mite: enemy('Flux Mite', 0.7, 35, 14, '#d4b6ff', ['Gravity', 'Chaos']),
  splitter: enemy('Brood Husk', 4, 80, 25, '#b4cf91', ['Mass', 'Support']),
  magnetic_sentinel: enemy('Magnetic Sentinel', 6, 95, 25, '#e1acc6', ['Gravity', 'Metal']),
  momentum_broker: enemy('Momentum Broker', 3, 80, 22, '#90d6ee', ['Velocity', 'Control']),
  cratewright: enemy('Barricade Weaver', 5, 110, 25, '#d7bc91', ['Machine', 'Defense']),
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
  railgunner: 'R',
  null_shepherd: 'N',
  salvager: 'C',
  lancer: '»',
  flux_mite: '±',
  splitter: 'B',
  magnetic_sentinel: 'M',
  momentum_broker: '⇄',
  cratewright: 'W',
};
export const enemyDescriptions: Partial<
  Record<SpecialEnemy | 'chaser' | 'shooter' | 'heavy', string>
> = {
  chaser: 'Pursues your core. Turn its approach into a wall impact.',
  shooter: 'Keeps its distance and fires physical shots that can be redirected.',
  heavy: 'High mass resists small impulses but creates strong collision damage.',
  slime: 'Places attraction fields at your position. Move before the next field appears.',
  anchor: 'An immobile gravity source. Throw matter into it or redirect its ammunition.',
  floater: 'Accelerates sharply when global gravity changes. Plan where a flip sends it.',
  bomber:
    'Carries a physical barrel and detonates near your core. Separate the payload or trigger it at range.',
  leech: 'Cancels much of the gravity acting on your core while nearby.',
  orbiter: 'Steers around a gravity source, or your core when no source is available.',
  repulsor: 'Periodically creates a repulsion field. Use its push to launch other matter.',
  swarm: 'Small, light pursuers become ammunition when launched into heavier targets.',
  phase:
    'Alternates between solid and phased states. Walls remain solid to it; time object impacts for its solid phase.',
  singularity: 'Carries a strong attraction field. Its pull can turn other enemies into weapons.',
  mirror: 'Responds to nearby power fields by pushing your core.',
  parasite: 'Changes an allied enemy’s gravity response. Destroying it releases the host.',
  summoner: 'Produces a bounded brood of swarm motes. Destroy the source to stop reinforcements.',
  railgunner:
    'Locks a visible aim point, then launches nearby loose matter toward it. Sidestep after its aim locks or remove its ammunition.',
  null_shepherd:
    'Carries a gravity-damping aura that protects nearby matter from force manipulation. Destroy it to restore full gravity.',
  salvager:
    'Consumes nearby destructible props and machines to repair itself. Deny its scrap supply; explosive scrap can backfire.',
  lancer:
    'Locks your position before launching its own body. Sidestep the warning line and let its momentum carry it into matter.',
  flux_mite:
    'Alternates its gravity response between normal and inverted while remaining solid. Time a flip for its current polarity.',
  splitter:
    'Releases two swarm motes when broken, if space allows. Save a repulsion pulse for the brood.',
  magnetic_sentinel:
    'Alternates attraction and repulsion of metal. Stone ammunition ignores its magnetic aura.',
  momentum_broker:
    'Marks nearby loose matter, then swaps velocity with it. Remove the marked prop or move beyond its reach before the exchange.',
  cratewright:
    'Builds up to three movable metal barricades in open space. Turn its own plates into ammunition.',
};
export const entityDefinitions = {
  ...base,
  ...enemyDefinitions,
  ...bossDefinitions,
  ...objectDefinitions,
};
