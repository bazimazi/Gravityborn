import { expect, it } from 'vitest';
import { SaveStore } from '../src/core/save';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile, settleRun, unlockClass } from '../src/progression/profile';
import { classes } from '../src/content/classes';
function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
it('recovers the previous valid record if the primary write is corrupt', () => {
  const storage = memory();
  const store = new SaveStore(storage);
  store.save({ value: 1 });
  store.save({ value: 2 });
  storage.values.set('gravityborn.save', 'truncated');
  expect(store.load()).toEqual({ value: 1 });
  expect(store.state).toBe('recovered');
});
it('does not overwrite saves created by a newer version', () => {
  const storage = memory();
  const raw = JSON.stringify({ version: 99, payload: { future: true } });
  storage.values.set('gravityborn.save', raw);
  const store = new SaveStore(storage);
  expect(store.load()).toBeNull();
  expect(store.state).toBe('future');
  expect(store.save({ new: true })).toBe(false);
  expect(storage.getItem('gravityborn.save')).toBe(raw);
});
it('migrates version one, detects payload corruption, and handles unavailable storage', () => {
  const storage = memory();
  storage.values.set('gravityborn.save', JSON.stringify({ version: 1, profile: newProfile() }));
  const store = new SaveStore(storage);
  expect(store.load()).toEqual({ profile: newProfile(), checkpoint: null });
  const exported = store.export({ profile: newProfile() });
  expect(store.import(exported.replace('manipulator', 'changed'))).toBeUndefined();
  const unavailable = new SaveStore({
    getItem: () => {
      throw Error('denied');
    },
    setItem: () => {
      throw Error('denied');
    },
  });
  expect(unavailable.load()).toBeNull();
  expect(unavailable.save({})).toBe(false);
});
it('restores route, choices, build, currency, random state, and health without serializing physics', () => {
  const run = new Expedition(new Game(false));
  run.start('restore', 'orbiter');
  run.build.addRelic('heavy_heart');
  run.build.currency = 87;
  run.build.gainXP(100);
  run.build.offer();
  run.game.player.health = 63;
  const saved = JSON.parse(JSON.stringify(run.snapshot()));
  const restored = new Expedition(new Game(false));
  expect(restored.restore(saved)).toBe(true);
  expect(restored.classId).toBe('orbiter');
  expect(restored.game.player.health).toBe(63);
  expect(restored.game.player.body.mass).toBeCloseTo(5.6);
  expect(restored.build.choices.map((choice) => choice.id)).toEqual(
    run.build.choices.map((choice) => choice.id),
  );
  expect(restored.build.random.state).toBe(run.build.random.state);
  expect(restored.build.currency).toBe(87);
  expect(restored.available).toEqual(run.available);
  expect(restored.game.abilities.snapshot()).toEqual(run.game.abilities.snapshot());
  expect(restored.restore({ ...saved, health: Infinity })).toBe(false);
  expect(restored.game.player.health).toBe(63);
});
it('awards each result once and class unlocks spend currency exactly once', () => {
  const profile = newProfile();
  const run = new Expedition(new Game(false));
  run.start('award');
  run.phase = 'summary';
  run.rooms = 10;
  run.kills = 20;
  run.won = true;
  expect(settleRun(profile, run)).toBe(true);
  const shards = profile.shards;
  expect(settleRun(profile, run)).toBe(false);
  expect(profile.shards).toBe(shards);
  expect(unlockClass(profile, 'massborn')).toBe(true);
  expect(profile.shards).toBe(shards - 20);
  expect(unlockClass(profile, 'massborn')).toBe(false);
  expect(readProfile(profile)).toEqual(profile);
  expect(readProfile({ ...profile, shards: -1 })).toEqual(newProfile());
});
for (const definition of classes)
  it(`${definition.name} starts with its distinct powers and derived physics`, () => {
    const game = new Game(false);
    const run = new Expedition(game);
    run.start('classes', definition.id);
    expect([...game.abilities.levels.keys()]).toEqual(definition.powers);
    expect(game.player.health).toBe(game.maxHealth);
    const mass = game.player.body.mass;
    run.build.apply();
    expect(game.player.body.mass).toBe(mass);
    expect(run.enter(run.available[0].id)).toBe(true);
    expect(game.player.body.mass).toBe(mass);
  });
