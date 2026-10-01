import { expect, it } from 'vitest';
import { defaults, loadSettings, migrateSettings, saveSettings } from '../src/core/settings';

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
