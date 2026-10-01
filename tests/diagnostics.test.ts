import { expect, it } from 'vitest';
import { newDiagnostics, readDiagnostics, recordDiagnostic } from '../src/core/diagnostics';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile } from '../src/progression/profile';

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
  expect(data.totals.RunDuration).toBeGreaterThan(0);
  expect(JSON.stringify(data)).not.toContain('private-seed-never-exported');
  run.abandon();
  expect(data.counts.RunAbandoned).toBeUndefined();
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
