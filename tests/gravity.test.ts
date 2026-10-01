import { describe, expect, it } from 'vitest';
import { GravitySystem, type GravityField } from '../src/physics/gravity';
import { SpatialGrid } from '../src/physics/spatial-grid';

const field = (overrides: Partial<Omit<GravityField, 'id'>> = {}): Omit<GravityField, 'id'> => ({
  source: 'test',
  mode: 'radial',
  position: { x: 0, y: 0 },
  direction: { x: 0, y: 0 },
  strength: 1,
  radius: 100,
  falloff: 'linear',
  remaining: 5,
  ...overrides,
});

describe('authoritative gravity field', () => {
  it('supports arbitrary directions, inversion, and zero gravity', () => {
    const gravity = new GravitySystem(2, 10);
    gravity.setDirection({ x: 3, y: 4 });
    expect(gravity.sample({ x: 0, y: 0 }).x).toBeCloseTo(1.2);
    expect(gravity.sample({ x: 0, y: 0 }).y).toBeCloseTo(1.6);
    gravity.setDirection({ x: -3, y: -4 });
    expect(gravity.sample({ x: 0, y: 0 }).y).toBe(-1.6);
    gravity.setDirection({ x: 0, y: 0 });
    expect(gravity.sample({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('combines fields with global gravity and excludes out-of-range sources', () => {
    const gravity = new GravitySystem(1, 10);
    gravity.addField(field());
    gravity.addField(field({ strength: 2 }));
    expect(gravity.sample({ x: 50, y: 0 })).toEqual({ x: -1.5, y: 1 });
    expect(gravity.sample({ x: 101, y: 0 })).toEqual({ x: 0, y: 1 });
  });
  it('has finite well centers, bounded overlapping fields, response, and expiration', () => {
    const gravity = new GravitySystem(0, 2);
    gravity.addField(field({ strength: 100 }));
    expect(gravity.sample({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(gravity.sample({ x: 50, y: 0 })).toEqual({ x: -2, y: 0 });
    expect(gravity.sample({ x: 50, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
    gravity.tick(5);
    expect(gravity.fields.size).toBe(0);
    expect(gravity.sample({ x: 50, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('supports repulsion and tangential fields without another gravity implementation', () => {
    const gravity = new GravitySystem(0, 10);
    const id = gravity.addField(field({ strength: -1, falloff: 'constant' }));
    expect(gravity.sample({ x: 50, y: 0 }).x).toBe(1);
    gravity.removeField(id);
    gravity.addField(field({ mode: 'vortex', falloff: 'constant' }));
    expect(gravity.sample({ x: 50, y: 0 }).y).toBe(-1);
  });
  it('rejects invalid numeric inputs', () => {
    const gravity = new GravitySystem(1, 2);
    expect(gravity.setDirection({ x: NaN, y: 1 })).toBe(false);
    expect(() => gravity.addField(field({ radius: Infinity }))).toThrow();
    expect(() => gravity.addField(field({ strength: NaN }))).toThrow();
  });
});

it('indexes radius coverage across negative cell boundaries', () => {
  const grid = new SpatialGrid<string>(10);
  grid.insert('well', { x: 0, y: 0 }, 12);
  expect(grid.at({ x: -11, y: -11 })?.has('well')).toBe(true);
  expect(grid.at({ x: 30, y: 0 })).toBeUndefined();
});
