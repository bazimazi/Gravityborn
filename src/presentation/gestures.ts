import type { Vec2 } from '../core/vector';
export type ArenaGesture =
  | { kind: 'tap' }
  | { kind: 'swipe'; direction: Vec2 }
  | { kind: 'cancel' };
/** CSS-pixel thresholds stay consistent across device pixel ratios and camera zoom. */
export function arenaGesture(start: Vec2, end: Vec2): ArenaGesture {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return { kind: 'cancel' };
  const x = end.x - start.x;
  const y = end.y - start.y;
  const distance = Math.hypot(x, y);
  if (distance < 12) return { kind: 'tap' };
  if (distance < 36) return { kind: 'cancel' };
  return {
    kind: 'swipe',
    direction: Math.abs(x) > Math.abs(y) ? { x: Math.sign(x), y: 0 } : { x: 0, y: Math.sign(y) },
  };
}
