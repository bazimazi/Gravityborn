import type { Vec2 } from '../core/vector';

export function computeCamera(
  viewport: Vec2,
  world: Vec2,
  focus: Vec2,
): { scale: number; offset: Vec2 } {
  const aspect = viewport.x / viewport.y;
  const crop = aspect < 0.95 || aspect > 2.1;
  const scale = crop
    ? Math.max(viewport.x / world.x, viewport.y / world.y)
    : Math.min(viewport.x / world.x, viewport.y / world.y);
  const visible = { x: viewport.x / scale, y: viewport.y / scale };
  const center = (size: number, extent: number, position: number): number =>
    extent >= size ? size / 2 : Math.max(extent / 2, Math.min(size - extent / 2, position));
  return {
    scale,
    offset: {
      x: viewport.x / 2 - center(world.x, visible.x, focus.x) * scale,
      y: viewport.y / 2 - center(world.y, visible.y, focus.y) * scale,
    },
  };
}
