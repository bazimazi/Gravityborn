import base from '../data/entities.json';
import { regions } from './regions';
function boss(name: string, color: string, tags: string[]) {
  return {
    ...base.heavy,
    name,
    color,
    tags,
    radius: 43,
    mass: 20,
    health: 540,
    gravityResponse: 0.35,
  };
}
export const bossDefinitions = {
  inverter: boss('The Inverter', '#f0af91', ['Gravity', 'Chaos']),
  planet_eater: boss('The Planet Eater', '#90d8cf', ['Orbit', 'Mass']),
  singularity_boss: boss('The Singularity', '#c29aff', ['Void', 'Compression']),
  architect: boss('The Architect', '#dfc28c', ['Control', 'Defense']),
  star: boss('The Star', '#f5d99a', ['Gravity', 'Explosion']),
  magnetar: boss('The Magnetar', '#91dcff', ['Gravity', 'Metal']),
  chronarch: boss('The Chronarch', '#d8e8c6', ['Velocity', 'Control']),
  tidal: boss('The Tidal Engine', '#82b5f0', ['Gravity', 'Movement']),
  comet: boss('The Comet Heart', '#efa688', ['Velocity', 'Impact']),
  weaver: boss('The Void Weaver', '#cf9ce8', ['Void', 'Control']),
} as const;
export type BossKind = keyof typeof bossDefinitions;
export const regionGuardians: BossKind[] = regions.map((region) => region.guardian);
export const bossDescriptions: Record<BossKind, string> = {
  inverter: 'Changes global gravity and emits repulsive fields.',
  planet_eater: 'Creates moving, destructible gravity sources.',
  singularity_boss: 'Pulls the arena toward a growing singularity.',
  architect: 'Builds temporary walls near your path and localized vortices.',
  star: 'Emits outward waves that launch loose matter.',
  magnetar: 'Alternates attraction and repulsion of metal. Stone and rubber remain useful anchors.',
  chronarch:
    'Suspends loose matter, then releases its stored velocity in reverse. Your core remains mobile.',
  tidal: 'Alternates opposing gravity sources across horizontal and vertical arena edges.',
  comet: 'Marks your position before dashing along that line. Sidestep to weaponize its momentum.',
  weaver: 'Weaves temporary vortices and zero-gravity pockets around your marked position.',
};
