import type { AbilityDefinition } from './abilities';

const power = (
  definition: Omit<AbilityDefinition, 'maxLevel' | 'target' | 'duration'>,
): AbilityDefinition => ({ maxLevel: 3, target: 'point', duration: 0, ...definition });

export const manipulationAbilities: AbilityDefinition[] = [
  power({
    id: 'tether_cut',
    name: 'Cut the Lines',
    rarity: 'common',
    tags: ['Tether', 'Cut', 'Control'],
    effect: 'tether_cut',
    description:
      'Sever your live tethers with an endpoint near your aim. Bodies keep their current velocity: release a swinging payload at the right moment.',
    energy: 8,
    cooldown: 2,
    radius: 220,
    strength: 1,
  }),
  power({
    id: 'tension_release',
    name: 'Tension Release',
    rarity: 'epic',
    tags: ['Tether', 'Release', 'Impact'],
    effect: 'tether_release',
    description:
      'Sever nearby live tethers and turn their current stretch or compression into a final bounded kick. Relaxed links add no motion; fixed anchors push only their attached body.',
    energy: 25,
    cooldown: 7,
    radius: 240,
    strength: 2,
  }),
  power({
    id: 'anchor_recall',
    name: 'Anchor Recall',
    rarity: 'rare',
    tags: ['Tether', 'Control', 'Gravity'],
    effect: 'reanchor',
    description:
      'Move your nearby fixed tether anchors to your aim in open space. Attached bodies travel through the room under spring forces; their existing link lifetimes stay unchanged.',
    energy: 20,
    cooldown: 5,
    radius: 320,
    strength: 1,
  }),
  power({
    id: 'torque',
    name: 'Torque',
    rarity: 'common',
    tags: ['Spin', 'Velocity', 'Impact'],
    effect: 'spin',
    description:
      'Add clockwise rotation to nearby movable matter. Rectangular plates sweep a wider area as they turn; this changes spin without changing center velocity.',
    energy: 16,
    cooldown: 4,
    radius: 220,
    strength: 0.2,
  }),
  power({
    id: 'counter_torque',
    name: 'Counter Torque',
    rarity: 'common',
    tags: ['Spin', 'Velocity', 'Control'],
    effect: 'spin',
    description:
      'Add counterclockwise rotation to nearby matter. Cancel a clockwise sweep or reverse it; angular speed remains capped at 0.3.',
    energy: 16,
    cooldown: 4,
    radius: 220,
    strength: -0.2,
  }),
  power({
    id: 'gyroscopic_brake',
    name: 'Gyroscopic Brake',
    rarity: 'rare',
    tags: ['Spin', 'Control', 'Defense'],
    effect: 'spin',
    description:
      'Stop nearby bodies rotating while preserving their linear velocity. Stabilize tumbling plates without freezing their flight or disabling future collision torque.',
    energy: 18,
    cooldown: 5,
    radius: 260,
    strength: 0,
    parameters: { angularScale: 0 },
  }),
  power({
    id: 'momentum_exchange',
    name: 'Momentum Exchange',
    rarity: 'rare',
    tags: ['Momentum', 'Mass', 'Velocity'],
    effect: 'momentum_swap',
    description:
      'Exchange the linear momentum of the two nearest movable bodies without changing gravity response. A light body receiving a heavy body’s momentum moves faster, up to the global speed limit.',
    energy: 24,
    cooldown: 7,
    radius: 240,
    strength: 1,
  }),
  power({
    id: 'momentum_balance',
    name: 'Momentum Balance',
    rarity: 'epic',
    tags: ['Momentum', 'Mass', 'Control'],
    effect: 'momentum_balance',
    description:
      'Give nearby movable bodies their shared mass-weighted velocity. Total linear momentum is conserved within motion limits while relative movement settles; at least two bodies are required.',
    energy: 30,
    cooldown: 9,
    radius: 230,
    strength: 1,
  }),
  power({
    id: 'radial_redirect',
    name: 'Radial Redirect',
    rarity: 'rare',
    tags: ['Radial', 'Velocity', 'Projectile'],
    effect: 'radial_turn',
    description:
      'Turn moving matter away from your aim while preserving each body’s speed. Stationary matter and bodies exactly at the center stay unchanged.',
    energy: 24,
    cooldown: 6,
    radius: 260,
    strength: 1,
  }),
];
