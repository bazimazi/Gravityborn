import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, parseProfile } from '../src/progression/profile';
import { readSaveData, importProgress } from '../src/progression/save-data';
import { SaveStore, checksum } from '../src/core/save';
import { NativeStorage } from '../src/core/storage';

const encode = (payload: unknown) =>
  JSON.stringify({ version: 2, checksum: checksum(JSON.stringify(payload)), payload });
function setup() {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('existing-progress');
  const checkpoint = run.snapshot();
  const payload = { profile: { ...newProfile(), shards: 42 }, checkpoint };
  const values = new Map<string, string>([['gravityborn.save', encode(payload)]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const validate = (value: unknown) => readSaveData(value, (value) => run.canRestore(value));
  const store = new SaveStore(storage, validate);
  store.load();
  return { game, run, payload, values, storage, validate, store };
}

it('validates checkpoints without touching gameplay, metadata, events or random state', () => {
  const context = setup();
  const input = JSON.stringify(context.payload);
  context.run.enter(context.run.available[0].id);
  const powers = context.game.abilities.snapshot();
  const build = context.run.build.snapshot();
  const bodies = [...context.game.world.entities.values()];
  const player = context.game.player;
  const events: unknown[] = [];
  for (const name of ['runRestored', 'entitySpawned', 'abilityUpgraded'] as const)
    context.game.events.on(name, (event) => events.push(event));
  expect(context.run.canRestore(context.payload.checkpoint)).toBe(true);
  expect(context.validate(JSON.parse(input))).toEqual(context.payload);
  expect(context.game.player).toBe(player);
  expect([...context.game.world.entities.values()]).toEqual(bodies);
  expect(context.game.abilities.snapshot()).toEqual(powers);
  expect(context.run.build.snapshot()).toEqual(build);
  expect(context.run.phase).toBe('room');
  expect(context.game.state).toBe('playing');
  expect(events).toEqual([]);
  expect(JSON.stringify(context.payload)).toBe(input);
  context.game.world.dispose();
});

it('rejects invalid profiles and malformed routes atomically before any import write', async () => {
  const context = setup();
  const before = [...context.values];
  for (const mutate of [
    (data: any) => {
      data.profile.shards = -1;
    },
    (data: any) => {
      data.profile.classes = {};
    },
    (data: any) => {
      data.checkpoint.powers.levels.pulse = null;
    },
    (data: any) => {
      data.checkpoint.powers.cooldowns.pulse = 'soon';
    },
    (data: any) => {
      data.checkpoint.phase = 'event';
      data.checkpoint.current = null;
    },
    (data: any) => {
      data.checkpoint.shop = [{ id: 'ability:pulse:unknown', price: 1, sold: false }];
    },
  ]) {
    const data = structuredClone(context.payload);
    mutate(data);
    expect(await importProgress(context.store, context.storage, encode(data))).toEqual({
      status: 'invalid',
    });
    expect([...context.values]).toEqual(before);
    expect(context.run.snapshot()).toEqual(context.payload.checkpoint);
    expect(context.store.state).toBe('loaded');
  }
  expect(() => parseProfile({ ...context.payload.profile, shards: -1 })).toThrow();
  context.game.world.dispose();
});

it('uses validated backup recovery for an invalid profile or route and keeps legacy migration', () => {
  const context = setup();
  for (const data of [
    { ...context.payload, profile: { ...context.payload.profile, shards: -1 } },
    {
      ...context.payload,
      checkpoint: { ...(context.payload.checkpoint as object), phase: 'unknown' },
    },
  ]) {
    context.values.set('gravityborn.save', encode(data));
    context.values.set('gravityborn.save.backup', encode(context.payload));
    expect(context.store.load()).toEqual(context.payload);
    expect(context.store.state).toBe('recovered');
  }
  const legacy = structuredClone(context.payload);
  legacy.profile.discoveries = [
    ...Array.from({ length: 2500 }, (_, i) => `secret:0:${i}`),
    'lore:secret:0',
  ];
  context.values.set('gravityborn.save', JSON.stringify({ version: 1, ...legacy }));
  expect(context.store.load()?.profile).toEqual({
    ...context.payload.profile,
    discoveries: ['lore:secret:0'],
  });
  context.game.world.dispose();
});

it('returns committed progress only after native writes finish', async () => {
  const context = setup();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const storage = new NativeStorage({
    get: async ({ key }) => ({ value: context.values.get(key) ?? null }),
    set: async ({ key, value }) => {
      await pending;
      context.values.set(key, value);
    },
  });
  await storage.load();
  const store = new SaveStore(storage, context.validate);
  store.load();
  const next = { ...context.payload, profile: { ...context.payload.profile, shards: 99 } };
  let finished = false;
  const result = importProgress(store, storage, encode(next)).then((result) => {
    finished = true;
    return result;
  });
  await Promise.resolve();
  expect(finished).toBe(false);
  expect(JSON.parse(context.values.get('gravityborn.save')!).payload).toEqual(context.payload);
  release();
  expect(await result).toEqual({ status: 'imported', data: next });
  expect(JSON.parse(context.values.get('gravityborn.save')!).payload).toEqual(next);
  expect(JSON.parse(context.values.get('gravityborn.save.backup')!).payload).toEqual(
    context.payload,
  );
  expect(context.run.snapshot()).toEqual(context.payload.checkpoint);
  context.game.world.dispose();
});

it('does not report success for failed browser or native writes', async () => {
  const context = setup();
  const next = { ...context.payload, profile: { ...context.payload.profile, shards: 99 } };
  for (const native of [false, true]) {
    const failing = {
      getItem: context.storage.getItem,
      setItem: () => {
        throw new Error('Full');
      },
    };
    const storage = native
      ? new NativeStorage({
          get: async ({ key }) => ({ value: context.values.get(key) ?? null }),
          set: async () => {
            throw new Error('Full');
          },
        })
      : failing;
    if (storage instanceof NativeStorage) await storage.load();
    const store = new SaveStore(storage, context.validate);
    store.load();
    expect(await importProgress(store, storage, encode(next))).toEqual({ status: 'unavailable' });
    expect(store.state).toBe('unavailable');
    expect(JSON.parse(context.values.get('gravityborn.save')!).payload).toEqual(context.payload);
    expect(context.run.snapshot()).toEqual(context.payload.checkpoint);
  }
  context.game.world.dispose();
});

it('refuses to replace newer local progress even with an otherwise valid import', async () => {
  const context = setup();
  const future = JSON.stringify({ version: 99, payload: { future: true } });
  context.values.set('gravityborn.save', future);
  expect(context.store.load()).toBeNull();
  expect(await importProgress(context.store, context.storage, encode(context.payload))).toEqual({
    status: 'future',
  });
  expect(context.values.get('gravityborn.save')).toBe(future);
  expect(context.store.state).toBe('future');
  context.game.world.dispose();
});
