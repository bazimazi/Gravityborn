import base from '../data/entities.json';
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
} as const;
export type BossKind = keyof typeof bossDefinitions;
