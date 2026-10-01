import type { Vec2 } from '../core/vector';
import type { GravityField } from '../physics/gravity';
import { abilityById } from '../content/abilities';
import balance from '../data/balance.json';

export function isSingularity(field: GravityField): boolean {
  return (
    field.mode === 'radial' &&
    field.strength > 0 &&
    (field.source.startsWith('ability:')
      ? abilityById.get(field.source.slice(8))?.tags.includes('Void') === true
      : field.strength >= balance.presentation.singularityThreshold)
  );
}

/** Decorative background displacement only. Never changes bodies, aiming or collision geometry. */
export function selectLenses(fields: Iterable<GravityField>, center: Vec2): GravityField[] {
  return [...fields]
    .filter((field) => field.mode === 'radial' && field.strength !== 0)
    .sort((a, b) => {
      const score = (field: GravityField): number =>
        (Math.abs(field.strength) * field.radius) /
        (1 + Math.hypot(field.position.x - center.x, field.position.y - center.y));
      return score(b) - score(a) || a.id - b.id;
    })
    .slice(0, balance.presentation.maxLenses);
}

export function lensPoint(point: Vec2, fields: readonly GravityField[]): Vec2 {
  let dx = 0;
  let dy = 0;
  for (const field of fields) {
    const x = point.x - field.position.x;
    const y = point.y - field.position.y;
    const distance = Math.hypot(x, y);
    if (distance < 0.001 || distance >= field.radius) continue;
    const t = distance / field.radius;
    const fade = Math.min(1, field.remaining);
    const amount =
      Math.sin(t * Math.PI) *
      (1 - t) *
      fade *
      Math.min(1, Math.abs(field.strength) / balance.presentation.singularityThreshold) *
      Math.sign(field.strength) *
      balance.presentation.maxLensDisplacement;
    dx -= (x / distance) * amount;
    dy -= (y / distance) * amount;
  }
  const limit = Math.min(1, balance.presentation.maxLensDisplacement / (Math.hypot(dx, dy) || 1));
  return { x: point.x + dx * limit, y: point.y + dy * limit };
}
