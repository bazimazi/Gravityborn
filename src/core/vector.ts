export interface Vec2 {
  x: number;
  y: number;
}
export const length = (v: Vec2): number => Math.hypot(v.x, v.y);
export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, amount: number): Vec2 => ({
  x: v.x * amount || 0,
  y: v.y * amount || 0,
});
export function normalize(v: Vec2): Vec2 {
  const magnitude = length(v);
  return magnitude > 0 && Number.isFinite(magnitude) ? scale(v, 1 / magnitude) : { x: 0, y: 0 };
}
export function clampVector(v: Vec2, max: number): Vec2 {
  const magnitude = length(v);
  if (!Number.isFinite(magnitude)) return { x: 0, y: 0 };
  return magnitude > max ? scale(v, max / magnitude) : { ...v };
}
