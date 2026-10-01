import type { Vec2 } from '../core/vector';

/** Radius-indexed fields: sampling only visits the cell containing a body. */
export class SpatialGrid<T> {
  private readonly cells = new Map<string, Set<T>>();
  constructor(private readonly cellSize: number) {}

  insert(value: T, center: Vec2, radius: number): void {
    const minX = Math.floor((center.x - radius) / this.cellSize);
    const maxX = Math.floor((center.x + radius) / this.cellSize);
    const minY = Math.floor((center.y - radius) / this.cellSize);
    const maxY = Math.floor((center.y + radius) / this.cellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.cells.get(key) ?? new Set<T>();
        cell.add(value);
        this.cells.set(key, cell);
      }
    }
  }

  at(position: Vec2): ReadonlySet<T> | undefined {
    return this.cells.get(
      `${Math.floor(position.x / this.cellSize)},${Math.floor(position.y / this.cellSize)}`,
    );
  }

  clear(): void {
    this.cells.clear();
  }
}
