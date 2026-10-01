import { expect, it } from 'vitest';
import { defaults, loadSettings, migrateSettings, saveSettings } from '../src/core/settings';
import { joystickInput } from '../src/presentation/accessibility';

it('clamps accessibility options and keeps joystick input radial and bounded', () => {
  const settings = migrateSettings({
    uiScale: 8,
    joystickScale: -1,
    joystickDeadzone: NaN,
    reducedFlashing: true,
    frameRate: 30,
  });
  expect(settings.uiScale).toBe(1.4);
  expect(settings.joystickScale).toBe(0.8);
  expect(settings.joystickDeadzone).toBe(defaults.joystickDeadzone);
  expect(settings.reducedFlashing).toBe(true);
  expect(settings.frameRate).toBe(30);
  expect(joystickInput(0.02, -0.03, 0.1)).toEqual({ x: 0, y: 0 });
  expect(joystickInput(0.55, 0, 0.1).x).toBeCloseTo(0.5);
  const diagonal = joystickInput(5, -5, 0.1);
  expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
  expect(diagonal.x).toBeCloseTo(-diagonal.y);
});

it('migrates old settings, validates corrupt data, and handles future save versions', () => {
  expect(migrateSettings({ version: 0, volume: 5, leftHanded: true })).toEqual({
    ...defaults,
    volume: 1,
    leftHanded: true,
  });
  expect(migrateSettings({ version: 1, volume: NaN, reducedMotion: 'no' })).toEqual(defaults);
  expect(migrateSettings({ version: 99, volume: 0 })).toEqual(defaults);
  expect(loadSettings({ getItem: () => '{broken' })).toEqual(defaults);
});

it('survives disabled storage and round trips current settings', () => {
  let saved = '';
  saveSettings(
    {
      setItem: (_key, value) => {
        saved = value;
      },
    },
    { ...defaults, reducedMotion: true },
  );
  expect(loadSettings({ getItem: () => saved }).reducedMotion).toBe(true);
  expect(() =>
    saveSettings(
      {
        setItem: () => {
          throw new Error('quota');
        },
      },
      defaults,
    ),
  ).not.toThrow();
});

it('does not overwrite a newer settings schema with this older build', () => {
  let saved = '{"version":2,"volume":0.9,"futureOption":true}';
  const original = saved;
  const storage = {
    getItem: () => saved,
    setItem: (_key: string, value: string) => {
      saved = value;
    },
  };
  saveSettings(storage, loadSettings(storage));
  expect(saved).toBe(original);
});
