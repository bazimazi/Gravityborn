import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile, settleRun } from '../src/progression/profile';
import { SaveStore } from '../src/core/save';

const markers = (count: number) => Array.from({ length: count }, (_, depth) => `secret:0:${depth}`);

it('settles deep-route discoveries without making the earned profile unreadable', () => {
  const profile = newProfile();
  const run = new Expedition(new Game(false));
  run.start('long-discovery-fixture');
  run.phase = 'summary';
  run.rooms = 12;
  run.kills = 20;
  for (const id of [...markers(1100), 'lore:secret:0', 'planet:0', 'equipment:hollow_core'])
    run.discoveries.add(id);
  run.metrics.secretsRevealed = 1100;
  expect(settleRun(profile, run)).toBe(true);
  const restored = readProfile(JSON.parse(JSON.stringify(profile)));
  expect(restored).toEqual(profile);
  expect(restored.shards).toBeGreaterThan(0);
  expect(restored.discoveries).toEqual(
    expect.arrayContaining(['lore:secret:0', 'planet:0', 'equipment:hollow_core']),
  );
  expect(restored.discoveries.some((id) => /^secret:\d+:\d+$/.test(id))).toBe(false);
  expect(restored.metrics.secretsRevealed).toBe(1100);
  expect(settleRun(restored, run)).toBe(false);
  run.game.world.dispose();
});

it('migrates an oversized legacy discovery list without resetting progression', () => {
  const profile = {
    ...newProfile(),
    shards: 1234,
    research: 56,
    runs: 8,
    wins: 2,
    skills: ['endless'],
    equipment: { hollow_core: 3 },
    metrics: { secretsRevealed: 2500 },
    claimed: ['already-settled'],
    discoveries: [...markers(2500), 'lore:secret:0', 'planet:0', 'lore:secret:0'],
  };
  const values = new Map<string, string>();
  const store = new SaveStore({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  });
  expect(store.save({ profile, checkpoint: null })).toBe(true);
  const saved = store.load() as { profile: unknown };
  const restored = readProfile(saved.profile);
  expect(restored).toEqual({ ...profile, discoveries: ['lore:secret:0', 'planet:0'] });
  expect(store.save({ profile: restored, checkpoint: null })).toBe(true);
  expect(readProfile((store.load() as { profile: unknown }).profile)).toEqual(restored);
  expect(readProfile({ ...profile, discoveries: [...profile.discoveries, 42] })).toEqual(
    newProfile(),
  );
  expect(readProfile({ ...profile, discoveries: ['secret:0:' + '1'.repeat(201)] })).toEqual(
    newProfile(),
  );
  expect(
    readProfile({
      ...profile,
      discoveries: Array.from({ length: 1001 }, (_, i) => `unknown:${i}`),
    }),
  ).toEqual(newProfile());
  expect(readProfile({ ...profile, discoveries: Array(100001).fill('secret:0:0') })).toEqual(
    newProfile(),
  );
});

it('drops completed-region route markers while keeping lore and revealed-secret metrics', () => {
  const run = new Expedition(new Game(false));
  run.start('route-discovery-fixture', 'manipulator', undefined, 0, { mode: 'endless' });
  for (const id of [...markers(1800), 'lore:secret:0']) run.discoveries.add(id);
  run.metrics.secretsRevealed = 1800;
  run.current = run.map.find((node) => node.type === 'boss' && node.next.length === 0);
  run.phase = 'reward';
  expect(run.advance()).toBe(true);
  expect(run.depth).toBe(1);
  expect(run.discoveries).toEqual(new Set(['lore:secret:0']));
  expect(run.metrics.secretsRevealed).toBe(1800);
  expect(run.isRevealed(run.map.find((node) => node.type === 'secret')!)).toBe(false);
  run.game.world.dispose();
});

it('recovers a deep legacy checkpoint with only its current revealed route and permanent knowledge', () => {
  const run = new Expedition(new Game(false));
  run.start('deep-checkpoint-fixture', 'manipulator', undefined, 0, { mode: 'endless' });
  const checkpoint = run.snapshot() as Record<string, unknown>;
  Object.assign(checkpoint, {
    depth: 3000,
    discoveries: [...markers(2500), 'secret:0:3000', 'lore:secret:0', 'planet:0'],
    metrics: { secretsRevealed: 2501, assisted: 1 },
  });
  const restored = new Expedition(new Game(false));
  expect(restored.restore(checkpoint)).toBe(true);
  expect(restored.discoveries).toEqual(new Set(['secret:0:3000', 'lore:secret:0', 'planet:0']));
  expect(restored.metrics.secretsRevealed).toBe(2501);
  expect(restored.isRevealed(restored.map.find((node) => node.type === 'secret')!)).toBe(true);
  const clean = restored.snapshot();
  const again = new Expedition(new Game(false));
  expect(again.restore(clean)).toBe(true);
  expect(again.snapshot()).toEqual(clean);
  expect(restored.restore({ ...checkpoint, discoveries: [null] })).toBe(false);
  expect(restored.snapshot()).toEqual(clean);
  for (const item of [run, restored, again]) item.game.world.dispose();
});
