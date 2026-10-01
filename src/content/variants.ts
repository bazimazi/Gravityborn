import { enemyDefinitions, type EliteModifier } from './enemies';
import base from '../data/entities.json';

export type VariantKind = 'chaser' | 'shooter' | 'heavy' | keyof typeof enemyDefinitions;
// Explicit compatibility avoids meaningless combinations such as a heavy static Anchor.
export const eliteCompatibility: Record<VariantKind, readonly EliteModifier[]> = {
  chaser: [
    'heavy',
    'inverted',
    'orbital',
    'unstable',
    'vampire',
    'reflector',
    'anchor',
    'singularity',
  ],
  shooter: [
    'heavy',
    'inverted',
    'orbital',
    'unstable',
    'vampire',
    'reflector',
    'anchor',
    'singularity',
  ],
  heavy: ['inverted', 'orbital', 'unstable', 'vampire', 'reflector', 'anchor', 'singularity'],
  slime: ['heavy', 'inverted', 'orbital', 'vampire'],
  anchor: ['vampire', 'reflector'],
  floater: ['heavy', 'inverted', 'orbital', 'reflector'],
  bomber: ['heavy', 'inverted', 'orbital', 'vampire'],
  leech: ['heavy', 'inverted', 'orbital', 'reflector'],
  orbiter: ['heavy', 'inverted', 'unstable', 'vampire'],
  repulsor: ['heavy', 'inverted', 'orbital', 'vampire'],
  swarm: ['inverted', 'orbital', 'unstable'],
  phase: ['heavy', 'inverted', 'orbital', 'vampire'],
  singularity: ['heavy', 'inverted', 'orbital', 'vampire'],
  mirror: ['heavy', 'inverted', 'orbital', 'vampire'],
  parasite: ['heavy', 'inverted', 'orbital', 'reflector'],
  summoner: ['heavy', 'inverted', 'orbital', 'vampire'],
  railgunner: ['heavy', 'inverted', 'orbital'],
  null_shepherd: ['heavy', 'inverted', 'reflector'],
  salvager: ['heavy', 'inverted', 'orbital'],
  lancer: ['heavy', 'inverted', 'unstable'],
  flux_mite: ['heavy', 'orbital', 'reflector'],
  splitter: ['heavy', 'inverted', 'orbital'],
  magnetic_sentinel: ['heavy', 'inverted', 'orbital'],
  momentum_broker: ['heavy', 'inverted', 'reflector'],
  cratewright: ['heavy', 'inverted', 'vampire'],
};
const descriptions: Record<EliteModifier, string> = {
  heavy: 'Five times the mass changes how impacts and impulses move this enemy.',
  inverted: 'Falls against global gravity.',
  orbital: 'Steers tangentially around nearby gravity sources.',
  unstable: 'Detonates when its speed crosses the instability threshold.',
  vampire: 'Consumes nearby external gravity fields to repair itself.',
  reflector: 'Responds to a nearby power field with an impulse toward your core.',
  anchor: 'Becomes immobile and generates strong attraction.',
  singularity: 'Carries a persistent local attraction field.',
};
export const enemyVariants = Object.entries(eliteCompatibility).flatMap(([kind, elites]) =>
  elites.map((elite) => {
    const entity = { ...base, ...enemyDefinitions }[kind as VariantKind];
    return {
      id: `${kind}_${elite}`,
      kind: kind as VariantKind,
      elite,
      name: `${elite[0].toUpperCase()}${elite.slice(1)} ${'name' in entity ? entity.name : kind}`,
      description: descriptions[elite],
    };
  }),
);
