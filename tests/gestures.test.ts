import { expect, it } from 'vitest';
import { arenaGesture } from '../src/presentation/gestures';
import { migrateSettings } from '../src/core/settings';
it('distinguishes taps, accidental drags and all four cardinal swipes', () => {
  const origin = { x: 100, y: 100 };
  expect(arenaGesture(origin, { x: 102, y: 107 })).toEqual({ kind: 'tap' });
  expect(arenaGesture(origin, { x: 120, y: 100 })).toEqual({ kind: 'cancel' });
  expect(arenaGesture(origin, { x: NaN, y: 100 })).toEqual({ kind: 'cancel' });
  for (const direction of [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ])
    expect(
      arenaGesture(origin, { x: origin.x + direction.x * 80, y: origin.y + direction.y * 80 }),
    ).toEqual({ kind: 'swipe', direction });
});
it('enables gestures for older settings and retains an explicit opt-out', () => {
  expect(migrateSettings({ version: 1 }).swipeGravity).toBe(true);
  expect(migrateSettings({ version: 1, swipeGravity: false }).swipeGravity).toBe(false);
});
