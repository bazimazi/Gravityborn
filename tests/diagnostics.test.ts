import { expect, it } from 'vitest';
import { newDiagnostics, readDiagnostics, recordDiagnostic } from '../src/core/diagnostics';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile } from '../src/progression/profile';
import { diagnosticsView } from '../src/presentation/diagnostics';

it('bounds local history and values, sanitizes subjects, and respects disabling', () => {
  const data = newDiagnostics();
  for (let i = 0; i < 500; i++) recordDiagnostic(data, { event: 'AbilityUsage', subject: 'well' });
  expect(data.recent).toHaveLength(300);
  expect(data.counts['AbilityUsage:well']).toBe(500);
  recordDiagnostic(data, {
    event: 'RunDuration',
    value: Infinity,
    subject: '<script>secret</script>',
  });
  expect(data.recent.at(-1)).toEqual({ event: 'RunDuration' });
  data.enabled = false;
  recordDiagnostic(data, { event: 'RunStarted' });
  expect(data.counts.RunStarted).toBeUndefined();
  expect(readDiagnostics(JSON.parse(JSON.stringify(data)))).toEqual(data);
});
it('older profiles gain diagnostics without losing progress and malformed diagnostics stay isolated', () => {
  const old = { ...newProfile(), shards: 123, diagnostics: undefined };
  expect(readProfile(old).shards).toBe(123);
  expect(readProfile(old).diagnostics).toEqual(newDiagnostics());
  const profile = readProfile({
    ...old,
    diagnostics: {
      counts: { '<b>': 8, RunStarted: -100, 'AbilityUsage:well': 9 },
      recent: [null, { event: 'Forgery' }],
    },
  });
  expect(profile.shards).toBe(123);
  expect(profile.diagnostics.counts).toEqual({ 'AbilityUsage:well': 9 });
  expect(profile.diagnostics.recent).toHaveLength(0);
});
it('records real run actions and one death outcome, with no seed in exported diagnostics', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const data = newDiagnostics();
  game.events.on('diagnostic', (event) => recordDiagnostic(data, event));
  run.start('private-seed-never-exported', 'manipulator', undefined, 0, { difficulty: 2 });
  run.enter(run.available[0].id);
  game.flip({ x: 1, y: 0 });
  game.createWell({ x: 500, y: 350 });
  game.castAbility('pulse', game.player.body.position);
  run.build.gainXP(60);
  run.build.rerolls = 1;
  run.build.offer();
  run.build.reroll();
  run.build.choose(run.build.choices[0].id);
  game.player.invulnerability = 0;
  game.player.health = 5;
  game.applyDamage(game.player, 20, game.createCause(), 'Explosion');
  game.step();
  game.step();
  expect(data.counts.RunStarted).toBe(1);
  expect(data.totals.DifficultySelected).toBe(2);
  expect(data.counts.GravityChanges).toBe(1);
  expect(data.counts['AbilityUsage:well']).toBe(1);
  expect(data.counts['AbilityUsage:pulse']).toBe(1);
  expect(data.counts.UpgradeRerolls).toBe(1);
  expect(data.counts.RunEnded).toBe(1);
  expect(data.counts['CauseOfDeath:Explosion']).toBe(1);
  expect(data.counts['RoomStarted:standard:facility:combat']).toBe(1);
  expect(data.counts['RoomFailed:standard:facility:combat']).toBe(1);
  expect(data.totals['RoomDamage:standard:facility:combat']).toBe(20);
  expect(data.totals['RoomFailed:standard:facility:combat']).toBeGreaterThan(0);
  expect(data.totals.RunDuration).toBeGreaterThan(0);
  expect(JSON.stringify(data)).not.toContain('private-seed-never-exported');
  run.abandon();
  expect(data.counts.RunAbandoned).toBeUndefined();
});
it('records combat abandonment once and excludes noncombat route transitions', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const data = newDiagnostics();
  game.events.on('diagnostic', (event) => recordDiagnostic(data, event));
  run.start('abandoned-room');
  run.enter(run.available[0].id);
  game.step();
  run.start('replacement-room');
  expect(data.counts.RoomAbandoned).toBe(1);
  expect(data.totals.RoomAbandoned).toBeGreaterThan(0);
  run.abandon();
  run.abandon();
  expect(data.counts.RoomAbandoned).toBe(1);
  expect(data.counts.RoomStarted).toBe(1);
  expect(data.counts.RoomCleared).toBeUndefined();
  game.world.dispose();
});

it('uses guardian identities for attempts and kills and records actual chamber completion', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const data = newDiagnostics();
  game.events.on('diagnostic', (event) => recordDiagnostic(data, event));
  run.start('guardian-diagnostics', 'manipulator', undefined, 0, { mode: 'quick' });
  // Isolate the ordinary guardian encounter; Boss Rush already used named IDs.
  run.map = [{ id: '0:0:1', row: 0, lane: 1, type: 'boss', next: [], visited: false }];
  run.enter(run.available[0].id);
  const boss = [...game.world.entities.values()].find(
    (entity) => entity.definition.faction === 'enemy',
  )!;
  const kind = boss.kind;
  while (boss.alive) game.applyDamage(boss, 85, game.createCause());
  game.step();
  game.step();
  expect(data.counts[`BossAttempts:${kind}`]).toBe(1);
  expect(data.counts[`BossKills:${kind}`]).toBe(1);
  expect(data.counts['RoomCleared:quick:facility:boss']).toBe(1);
  expect(data.counts.RoomFailed).toBeUndefined();
  expect(readDiagnostics(JSON.parse(JSON.stringify(data)))).toEqual(data);
  game.world.dispose();
});

it('shows bounded chamber summaries with distinct damage and clear-time denominators', () => {
  const data = newDiagnostics();
  const subject = 'campaign:facility:combat';
  for (let i = 0; i < 3; i++) recordDiagnostic(data, { event: 'RoomStarted', subject, value: 100 });
  recordDiagnostic(data, { event: 'RoomCleared', subject, value: 40 });
  recordDiagnostic(data, { event: 'RoomFailed', subject, value: 20 });
  recordDiagnostic(data, { event: 'RoomDamage', subject, value: 90 });
  // Unknown/invalid catalog groups must not be rendered as arbitrary markup.
  data.counts['RoomStarted:campaign:facility:<script>'] = 100;
  const view = diagnosticsView(data);
  expect(view).toContain('3 attempts · 1 cleared · 1 defeated · 0 abandoned');
  expect(view).toContain('30 average damage received · 40s average clear');
  expect(view).not.toContain('<script>');
});
it('replacement runs count abandonment once and victories count once', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const data = newDiagnostics();
  game.events.on('diagnostic', (event) => recordDiagnostic(data, event));
  run.start('old');
  run.start('new', 'manipulator', undefined, 0, { mode: 'quick' });
  expect(data.counts.RunAbandoned).toBe(1);
  run.current = run.map.find((node) => node.type === 'boss');
  run.phase = 'reward';
  run.elapsed = 123;
  run.advance();
  run.advance();
  expect(data.counts['RunEnded:victory']).toBe(1);
  expect(data.totals['RunDuration:victory']).toBe(123);
});
