import type { Vec2 } from '../core/vector';
import type { EntityKind } from '../physics/world';
import type { GravityField } from '../physics/gravity';
import type { EliteModifier } from './enemies';
import { Random } from '../core/random';
import { bossDefinitions, type BossKind } from './bosses';

export type RoomType =
  | 'combat'
  | 'elite'
  | 'treasure'
  | 'shop'
  | 'event'
  | 'challenge'
  | 'puzzle'
  | 'rest'
  | 'boss'
  | 'secret';
export interface Wall extends Vec2 {
  width: number;
  height: number;
  motion?: 'horizontal' | 'vertical' | 'rotate';
}
export interface Hazard extends Vec2 {
  width: number;
  height: number;
  kind: 'spikes' | 'laser' | 'wind' | 'crusher';
  period: number;
  phase: number;
}
export interface RoomDefinition {
  id: string;
  name: string;
  type: RoomType;
  biome: number;
  width: number;
  height: number;
  walls: Wall[];
  spawns: (Vec2 & { kind: EntityKind; elite?: EliteModifier })[];
  hazards: Hazard[];
  fields: Omit<GravityField, 'id'>[];
  puzzle?: { switch: Vec2; exit: Vec2 };
  waves?: { kind: EntityKind; x: number; y: number; elite?: EliteModifier }[][];
}
export const biomes = [
  {
    name: 'Ruined Facility',
    color: '#0e1a2a',
    accent: '#8cf2e3',
    enemies: ['chaser', 'shooter', 'slime', 'anchor', 'bomber', 'heavy'],
  },
  {
    name: 'Crystal Caverns',
    color: '#211a32',
    accent: '#ccaaff',
    enemies: ['slime', 'repulsor', 'mirror', 'swarm', 'leech'],
  },
  {
    name: 'Dead Planet',
    color: '#292219',
    accent: '#e8cba2',
    enemies: ['heavy', 'anchor', 'orbiter', 'floater', 'bomber'],
  },
  {
    name: 'Orbital Station',
    color: '#152631',
    accent: '#8dceef',
    enemies: ['shooter', 'orbiter', 'summoner', 'phase', 'parasite'],
  },
  {
    name: 'Black Hole Interior',
    color: '#1a1229',
    accent: '#be8cff',
    enemies: ['singularity', 'phase', 'leech', 'mirror'],
  },
  {
    name: 'Gravity Laboratory',
    color: '#142b29',
    accent: '#92efd8',
    enemies: ['repulsor', 'mirror', 'parasite', 'summoner', 'slime'],
  },
  {
    name: 'Floating Islands',
    color: '#1a2930',
    accent: '#acdccc',
    enemies: ['floater', 'swarm', 'orbiter', 'bomber'],
  },
  {
    name: 'Collapsing Dimension',
    color: '#29192b',
    accent: '#f0a4dc',
    enemies: ['singularity', 'mirror', 'phase', 'summoner', 'leech', 'parasite'],
  },
] as const;
const bounds: Wall[] = [
  { x: 600, y: 25, width: 1200, height: 50 },
  { x: 600, y: 775, width: 1200, height: 50 },
  { x: 25, y: 400, width: 50, height: 700 },
  { x: 1175, y: 400, width: 50, height: 700 },
];
const layouts: { name: string; walls: Wall[]; enemies: Vec2[]; matter: Vec2[] }[] = [
  {
    name: 'Crosscurrent',
    walls: [
      { x: 420, y: 250, width: 220, height: 28 },
      { x: 810, y: 550, width: 220, height: 28 },
    ],
    enemies: [
      { x: 880, y: 210 },
      { x: 950, y: 640 },
      { x: 640, y: 370 },
      { x: 730, y: 650 },
      { x: 1080, y: 350 },
      { x: 520, y: 660 },
    ],
    matter: [
      { x: 470, y: 430 },
      { x: 820, y: 350 },
      { x: 850, y: 660 },
      { x: 650, y: 170 },
    ],
  },
  {
    name: 'The Foundry',
    walls: [
      { x: 600, y: 200, width: 32, height: 190 },
      { x: 600, y: 610, width: 32, height: 170 },
      { x: 900, y: 390, width: 210, height: 30 },
    ],
    enemies: [
      { x: 840, y: 260 },
      { x: 1010, y: 600 },
      { x: 710, y: 430 },
      { x: 820, y: 680 },
      { x: 1060, y: 180 },
      { x: 430, y: 660 },
    ],
    matter: [
      { x: 490, y: 400 },
      { x: 950, y: 300 },
      { x: 740, y: 580 },
      { x: 370, y: 180 },
    ],
  },
  {
    name: 'Orbital Gallery',
    walls: [
      { x: 600, y: 400, width: 160, height: 30, motion: 'rotate' },
      { x: 880, y: 630, width: 180, height: 24 },
    ],
    enemies: [
      { x: 900, y: 200 },
      { x: 1040, y: 450 },
      { x: 740, y: 230 },
      { x: 760, y: 650 },
      { x: 1050, y: 650 },
      { x: 460, y: 620 },
    ],
    matter: [
      { x: 450, y: 300 },
      { x: 790, y: 420 },
      { x: 1000, y: 280 },
      { x: 540, y: 600 },
    ],
  },
  {
    name: 'Compression Hall',
    walls: [
      { x: 550, y: 210, width: 280, height: 26, motion: 'vertical' },
      { x: 770, y: 590, width: 280, height: 26, motion: 'horizontal' },
    ],
    enemies: [
      { x: 920, y: 250 },
      { x: 1020, y: 580 },
      { x: 680, y: 370 },
      { x: 550, y: 690 },
      { x: 1070, y: 350 },
      { x: 850, y: 690 },
    ],
    matter: [
      { x: 420, y: 420 },
      { x: 820, y: 310 },
      { x: 980, y: 680 },
      { x: 600, y: 480 },
    ],
  },
];

export function buildRoom(
  seed: string,
  id: string,
  type: RoomType,
  biome: number,
  difficulty = 0,
): RoomDefinition {
  const random = new Random(`${seed}:${id}`);
  const region = biomes[Math.max(0, Math.min(7, biome))];
  const layout = random.pick(layouts);
  const combat = ['combat', 'elite', 'challenge', 'boss'].includes(type);
  const room: RoomDefinition = {
    id,
    name: `${region.name} · ${layout.name}`,
    type,
    biome,
    width: 1200,
    height: 800,
    walls: structuredClone([...bounds, ...layout.walls]),
    spawns: [{ kind: 'player', x: 220, y: 400 }],
    hazards: [],
    fields: [],
  };
  for (const [index, point] of layout.matter.entries())
    room.spawns.push({
      ...point,
      kind: index % 3 === 0 ? 'barrel' : index % 3 === 1 ? 'rock' : 'crate',
    });
  const props: EntityKind[] = [
    'generator',
    'crystal',
    'fragment',
    'metal_plate',
    'void_matter',
    'gravity_core',
    'rubber',
    'magnet',
  ];
  room.spawns.push({ kind: props[biome], x: 1050, y: 100 });
  room.spawns.push({ kind: biome % 2 ? 'ice' : 'energy_cell', x: 150, y: 650 });
  if (type === 'boss') {
    room.spawns.push({
      kind: (Object.keys(bossDefinitions) as BossKind[])[biome % 5],
      x: 860,
      y: 400,
    });
    room.walls = structuredClone(bounds);
  } else if (combat) {
    const count = Math.min(6, 3 + Math.floor(difficulty / 2) + (type === 'challenge' ? 2 : 0));
    for (let i = 0; i < count; i++)
      room.spawns.push({
        ...layout.enemies[i],
        kind: random.pick(region.enemies) as EntityKind,
        elite:
          type === 'elite' && i === 0
            ? random.pick([
                'heavy',
                'inverted',
                'orbital',
                'unstable',
                'vampire',
                'reflector',
                'anchor',
                'singularity',
              ] as const)
            : undefined,
      });
    room.hazards.push({
      kind: biome % 2 ? 'laser' : 'spikes',
      x: 1000,
      y: 710,
      width: 220,
      height: 22,
      period: 4,
      phase: random.next() * 4,
    });
    room.waves = [];
    for (let wave = 0; wave < (type === 'challenge' ? 5 : 3); wave++)
      room.waves.push(
        layout.enemies.slice(0, Math.min(6, count + Math.floor(wave / 2))).map((point, index) => ({
          ...point,
          kind: random.pick(region.enemies) as EntityKind,
          elite: type === 'elite' && index === 0 && wave === 2 ? 'inverted' : undefined,
        })),
      );
  }
  if (biome === 1 || biome === 2 || biome === 4 || biome === 5)
    room.fields.push({
      source: 'environment',
      mode: biome === 5 ? 'zero' : 'radial',
      position: { x: 600, y: 400 },
      direction: { x: 0, y: 1 },
      strength: biome === 5 ? 1 : biome === 4 ? 0.004 : 0.0025,
      radius: biome === 5 ? 150 : 300,
      falloff: biome === 5 ? 'constant' : 'linear',
      remaining: 36000,
    });
  if (biome === 6)
    room.hazards.push({
      kind: 'wind',
      x: 650,
      y: 420,
      width: 350,
      height: 450,
      period: 6,
      phase: 0,
    });
  if (biome === 7)
    room.walls
      .slice(4)
      .forEach((wall, index) => (wall.motion = index % 2 ? 'horizontal' : 'vertical'));
  if (type === 'puzzle') {
    room.puzzle = { switch: { x: 890, y: 400 }, exit: { x: 1050, y: 170 } };
    room.spawns.push({ kind: 'rock', x: 480, y: 400 });
  }
  return room;
}
