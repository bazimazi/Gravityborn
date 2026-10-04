import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { RunBuild } from '../src/progression/build';
import { ModifierSet } from '../src/progression/modifiers';
import { SaveStore } from '../src/core/save';
import { readSaveData } from '../src/progression/save-data';
import { newProfile } from '../src/progression/profile';
import { RunArchive } from '../src/progression/archive';

it('keeps a repeated fallback upgrade beyond the former thousand-stack save limit', () => {
  const run = new Expedition(new Game(false));
  run.start('long-build');
  run.build.level = 1002;
  run.build.currency = 73;
  run.build.xp = 11;
  run.build.passives.push(...Array.from({ length: 1000 }, () => 'integrity'));
  run.build.pending = 1;
  run.build.choices = [
    {
      id: 'passive:integrity',
      kind: 'passive',
      target: 'integrity',
      name: 'Reinforced Core',
      description: 'Gain 20 maximum integrity and repair 20.',
    },
  ];
  expect(run.build.choose('passive:integrity')).toBe(true);
  const checkpoint = JSON.parse(JSON.stringify(run.snapshot()));
  const recovered = new Expedition(new Game(false));
  expect(recovered.restore(checkpoint)).toBe(true);
  expect(recovered.build.snapshot()).toEqual(run.build.snapshot());
  expect(recovered.game.maxHealth).toBe(run.game.maxHealth);
  for (const expedition of [run, recovered]) expedition.game.world.dispose();
});

it('keeps a large fallback build bounded in the live modifier loop', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'long-modifiers');
  for (let index = 0; index < 2500; index++)
    build.passives.push('integrity', 'recovery', 'cooling', 'force');
  build.apply();
  expect(
    [...game.abilities.modifiers.values.keys()].filter((id) => id.startsWith('passive:')),
  ).toHaveLength(4);
  expect(game.maxHealth).toBe(2000);
  expect(game.abilities.modifiers.evaluate('energyRegen', 8)).toBe(50);
  expect(game.abilities.modifiers.evaluate('cooldown', 5)).toBe(0.25);
  expect(game.abilities.modifiers.evaluate('strength', 1)).toBe(32);
  const recovered = new RunBuild(game, 'read-long-modifiers');
  expect(() => recovered.restore(build.snapshot())).not.toThrow();
  expect(recovered.passives).toEqual(build.passives);
  game.world.dispose();
});

it('preserves modifier composition and temporary effects when compressing repeated upgrades', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'combined-fallback');
  build.addRelic('heavy_heart');
  build.skills = ['field_theory'];
  build.mutation = 'light';
  build.apply();
  const reference = new ModifierSet(() => game.abilities.context());
  for (const modifier of game.abilities.modifiers.values.values()) reference.add(modifier);
  const definitions = [
    ['integrity', 'maxHealth', 'add', 20],
    ['recovery', 'energyRegen', 'add', 2],
    ['cooling', 'cooldown', 'multiply', 0.9],
    ['force', 'strength', 'multiply', 1.15],
  ] as const;
  for (let index = 0; index < 19; index++)
    for (const [id, stat, operation, value] of definitions) {
      build.passives.push(id);
      reference.add({ id: `${id}:${index}`, stat, operation, value });
    }
  const temporary = {
    id: 'temporary:test',
    stat: 'strength',
    operation: 'multiply',
    value: 0.5,
  } as const;
  game.abilities.modifiers.addTemporary(temporary, 5);
  reference.addTemporary(temporary, 5);
  build.apply();
  for (const [stat, base] of [
    ['maxHealth', 100],
    ['energyRegen', 8],
    ['cooldown', 8],
    ['strength', 0.002],
  ] as const)
    expect(game.abilities.modifiers.evaluate(stat, base)).toBeCloseTo(
      reference.evaluate(stat, base),
      12,
    );
  expect(game.abilities.modifiers.remaining('temporary:test', 0)).toBe(5);
  game.world.dispose();
});

it('keeps large XP grants and banked choices within readable checkpoint bounds', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'banked-xp');
  build.gainXP(1000000);
  expect(build.pending).toBe(100);
  expect(build.xp).toBeGreaterThan(build.threshold);
  let choices = 0;
  while (build.pending) {
    expect(build.choose(build.offer()[0].id)).toBe(true);
    choices++;
    expect(build.pending).toBeLessThanOrEqual(100);
    const checkpoint = new RunBuild(game, 'read-banked');
    expect(() => checkpoint.restore(build.snapshot())).not.toThrow();
  }
  expect(choices).toBeGreaterThan(100);
  expect(build.level).toBe(choices + 1);
  expect(build.xp).toBeLessThan(build.threshold);
  game.world.dispose();
});

it('stops numeric level growth at the existing save limit without losing the final choice', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'maximum-level');
  build.level = 9999;
  build.gainXP(build.threshold + 99);
  expect({ level: build.level, xp: build.xp, pending: build.pending }).toEqual({
    level: 10000,
    xp: 0,
    pending: 1,
  });
  const before = build.snapshot();
  for (const amount of [Infinity, NaN, -5, 1000000]) build.gainXP(amount);
  expect(build.snapshot()).toEqual(before);
  expect(build.choose(build.offer()[0].id)).toBe(true);
  expect(build.pending).toBe(0);
  const restored = new RunBuild(game, 'read-maximum');
  restored.restore(build.snapshot());
  expect(restored.snapshot()).toEqual(build.snapshot());
  game.world.dispose();
});

it('recovers a long build through validated saves, import and generated archives', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const game = new Game(false);
  const run = new Expedition(game);
  const archive = new RunArchive(storage, run);
  run.start('saved-long-build');
  run.build.level = 1501;
  run.build.passives.push(
    ...Array.from(
      { length: 1500 },
      (_, index) => ['integrity', 'recovery', 'cooling', 'force'][index % 4],
    ),
  );
  run.build.apply();
  const data = { profile: { ...newProfile(), shards: 42 }, checkpoint: run.snapshot() };
  const store = new SaveStore(storage, (value) =>
    readSaveData(value, (checkpoint) => run.canRestore(checkpoint)),
  );
  expect(store.save(data)).toBe(true);
  expect(store.load()).toEqual(data);
  expect(store.import(store.export(data))).toEqual(data);
  const invalid = structuredClone(data);
  (invalid.checkpoint as any).build.passives.push(...Array.from({ length: 8501 }, () => 'force'));
  expect(store.import(store.export(invalid))).toBeUndefined();
  expect(store.load()).toEqual(data);
  run.abandon();
  const recovered = new RunArchive(storage, run);
  expect(recovered.reports).toEqual(archive.reports);
  expect(recovered.reports[0].bonuses).toEqual([
    'integrity ×375',
    'recovery ×375',
    'cooling ×375',
    'force ×375',
  ]);
  expect(recovered.reports[0].level).toBe(1501);
  game.world.dispose();
});

it('ignores nonfinite XP without changing a readable build', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'invalid-xp');
  build.gainXP(10);
  const before = build.snapshot();
  for (const amount of [Infinity, -Infinity, NaN, -5]) build.gainXP(amount);
  expect(build.snapshot()).toEqual(before);
  game.world.dispose();
});
