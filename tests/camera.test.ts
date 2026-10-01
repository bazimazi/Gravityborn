import { expect, it } from 'vitest';
import { computeCamera } from '../src/presentation/camera';

it('centers the complete room when the viewport has spare horizontal space', () => {
  const camera = computeCamera({ x: 1440, y: 900 }, { x: 1200, y: 800 }, { x: 300, y: 400 });
  expect(camera.offset.x).toBe(45);
  expect(camera.offset.y).toBe(0);
});

it('keeps bodies readable and follows the player vertically in short phone landscape', () => {
  const camera = computeCamera({ x: 824, y: 222 }, { x: 1200, y: 800 }, { x: 300, y: 470 });
  expect(camera.scale * 34).toBeGreaterThan(20);
  expect(camera.offset.x).toBeCloseTo(0);
  expect(470 * camera.scale + camera.offset.y).toBeCloseTo(111);
});

it('follows horizontally in portrait without exposing space beyond the world edge', () => {
  const camera = computeCamera({ x: 370, y: 550 }, { x: 1200, y: 800 }, { x: 70, y: 470 });
  expect(camera.offset.x).toBeCloseTo(0);
  expect(camera.offset.y).toBeCloseTo(0);
});
