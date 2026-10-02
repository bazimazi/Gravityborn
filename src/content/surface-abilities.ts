import type { AbilityDefinition } from './abilities';

const coat = (
  definition: Omit<AbilityDefinition, 'effect' | 'strength' | 'maxLevel' | 'target'> & {
    target?: 'point' | 'player';
  },
): AbilityDefinition => ({
  effect: 'surface',
  strength: 1,
  maxLevel: 3,
  target: 'point',
  ...definition,
});

export const surfaceAbilities: AbilityDefinition[] = [
  coat({
    id: 'elastic_coat',
    name: 'Elastic Coat',
    rarity: 'rare',
    description:
      'Turn nearby matter into bouncing ammunition for five seconds. The coating removes air drag and slightly amplifies rebounds within the velocity limit.',
    tags: ['Surface', 'Impact', 'Velocity'],
    energy: 24,
    cooldown: 8,
    radius: 200,
    duration: 5,
    parameters: { surface: { restitution: 1.05, frictionAir: 0 } },
  }),
  coat({
    id: 'deadening_foam',
    name: 'Deadening Foam',
    rarity: 'common',
    description:
      'Coat nearby matter in drag and high contact friction for four seconds. Restitution falls to zero, though an elastic collision partner can still produce a rebound.',
    tags: ['Surface', 'Control', 'Defense'],
    energy: 22,
    cooldown: 7,
    radius: 200,
    duration: 4,
    parameters: { surface: { restitution: 0, frictionAir: 0.08, friction: 0.8 } },
  }),
  coat({
    id: 'vacuum_polish',
    name: 'Vacuum Polish',
    rarity: 'common',
    description:
      'Remove air drag and contact friction from nearby matter for five seconds. Bodies keep their momentum until forces or impacts change it.',
    tags: ['Surface', 'Velocity', 'Control'],
    energy: 18,
    cooldown: 6,
    radius: 230,
    duration: 5,
    parameters: { surface: { friction: 0, frictionAir: 0, frictionStatic: 0 } },
  }),
  coat({
    id: 'inertia_tar',
    name: 'Inertia Tar',
    rarity: 'rare',
    description:
      'Apply strong air drag to nearby bodies for three seconds. Moving matter slows gradually while gravity can still pull it.',
    tags: ['Surface', 'Control', 'Defense'],
    energy: 26,
    cooldown: 8,
    radius: 220,
    duration: 3,
    parameters: { surface: { frictionAir: 0.12 } },
  }),
  coat({
    id: 'glass_spring',
    name: 'Glass Spring',
    rarity: 'rare',
    description:
      'Make your core strongly elastic for four seconds. Aim a dash into a wall to rebound through loose matter; the coating provides no damage immunity.',
    tags: ['Surface', 'Movement', 'Impact'],
    energy: 20,
    cooldown: 7,
    radius: 1,
    duration: 4,
    target: 'player',
    parameters: { selfOnly: true, surface: { restitution: 1.05 } },
  }),
  coat({
    id: 'magnetic_grease',
    name: 'Magnetic Grease',
    rarity: 'rare',
    description:
      'Remove drag and contact friction from metal for six seconds. Prepare plates and crates to glide through gravity fields while other materials keep their usual resistance.',
    tags: ['Surface', 'Metal', 'Velocity'],
    energy: 18,
    cooldown: 6,
    radius: 280,
    duration: 6,
    parameters: { affects: ['metal'], surface: { friction: 0, frictionAir: 0, frictionStatic: 0 } },
  }),
  coat({
    id: 'shot_drag',
    name: 'Shot Drag',
    rarity: 'rare',
    description:
      'Apply strong air drag only to nearby projectiles for three seconds. Slow an incoming volley without changing the motion of surrounding debris.',
    tags: ['Surface', 'Projectile', 'Defense'],
    energy: 18,
    cooldown: 5,
    radius: 280,
    duration: 3,
    parameters: { affects: ['Projectile'], surface: { frictionAir: 0.12 } },
  }),
];
