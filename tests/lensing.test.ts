import { expect, it } from 'vitest';
import { isSingularity, lensPoint, selectLenses } from '../src/presentation/lensing';
import type { GravityField } from '../src/physics/gravity';
import balance from '../src/data/balance.json';
const field: GravityField = {
  id: 1,
  source: 'ability:black_hole',
  mode: 'radial',
  direction: { x: 0, y: 1 },
  position: { x: 300, y: 300 },
  strength: 0.015,
  radius: 330,
  falloff: 'linear',
  remaining: 3,
};
it('keeps the lens center and distant geometry stable and bounds overlapping distortion', () => {
  expect(lensPoint(field.position, [field])).toEqual(field.position);
  expect(lensPoint({ x: 1000, y: 300 }, [field])).toEqual({ x: 1000, y: 300 });
  const point = { x: 400, y: 300 };
  const result = lensPoint(
    point,
    Array.from({ length: 50 }, () => field),
  );
  expect(Number.isFinite(result.x + result.y)).toBe(true);
  expect(Math.hypot(result.x - point.x, result.y - point.y)).toBeLessThanOrEqual(
    balance.presentation.maxLensDisplacement,
  );
});
it('distinguishes attraction, repulsion and expiry without modifying the field or input', () => {
  const point = { x: 450, y: 300 };
  const saved = JSON.stringify(field);
  expect(lensPoint(point, [field]).x).toBeLessThan(point.x);
  expect(lensPoint(point, [{ ...field, strength: -field.strength }]).x).toBeGreaterThan(point.x);
  expect(lensPoint(point, [{ ...field, remaining: 0 }])).toEqual(point);
  expect(point).toEqual({ x: 450, y: 300 });
  expect(JSON.stringify(field)).toBe(saved);
});
it('selects a bounded stable set and identifies void cores independently of effect strength upgrades', () => {
  const fields = Array.from({ length: 50 }, (_, id) => ({ ...field, id }));
  expect(selectLenses(fields, field.position).map((item) => item.id)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(
    selectLenses(
      [
        { ...field, mode: 'zero' },
        { ...field, mode: 'vortex' },
      ],
      field.position,
    ),
  ).toEqual([]);
  expect(isSingularity({ ...field, strength: 0.001 })).toBe(true);
  expect(isSingularity({ ...field, source: 'ability:collapse' })).toBe(false);
  expect(isSingularity({ ...field, source: 'phenomenon' })).toBe(true);
  expect(isSingularity({ ...field, strength: -0.01 })).toBe(false);
});
