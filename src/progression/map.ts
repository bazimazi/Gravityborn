import { Random } from '../core/random';
import type { RoomType } from '../content/rooms';
export interface MapNode {
  id: string;
  row: number;
  lane: number;
  type: RoomType;
  next: string[];
  visited: boolean;
}
export function generateMap(seed: string, biome: number): MapNode[] {
  const random = new Random(`${seed}:map:${biome}`);
  const nodes: MapNode[] = [];
  const pools: RoomType[][] = [
    ['combat'],
    ['combat', 'event', 'puzzle'],
    ['elite', 'treasure', 'challenge'],
    ['shop'],
    ['combat', 'event', 'secret'],
    ['rest', 'elite', 'treasure'],
    ['boss'],
  ];
  for (let row = 0; row < pools.length; row++) {
    const lanes = row === 0 || row === 6 ? [1] : [0, 1, 2];
    const options = random.shuffle(pools[row]);
    for (const lane of lanes)
      nodes.push({
        id: `${biome}:${row}:${lane}`,
        row,
        lane,
        type: options[lane % options.length],
        next: [],
        visited: false,
      });
  }
  for (const node of nodes)
    node.next = nodes
      .filter(
        (next) =>
          next.row === node.row + 1 &&
          (node.row === 0 || node.row === 5 || Math.abs(next.lane - node.lane) <= 1),
      )
      .map((next) => next.id);
  return nodes;
}
