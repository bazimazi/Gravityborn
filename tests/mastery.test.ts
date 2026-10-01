import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { ChainTracker } from '../src/gameplay/chains';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile, settleRun } from '../src/progression/profile';
import { freshMastery, masteryLevel } from '../src/progression/mastery';
import { codexView } from '../src/presentation/codex';
import { challenges } from '../src/content/challenges';
import { equipmentById } from '../src/content/equipment';

it('credits a real wall-impact kill to the ability that supplied its causal chain', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('mastery');
  run.phase = 'room';
  const enemy = game.world.spawn('chaser', { x: 1100, y: 360 })!;
  enemy.health = 20;
  game.enemies.setElite(enemy, 'inverted');
  const cause = game.createCause('pulse');
  game.markCause(enemy, cause);
  game.start();
  game.gravity.strength = 0;
  Matter.Body.setVelocity(enemy.body, { x: 18, y: 0 });
  for (let i = 0; i < 40 && enemy.alive; i++) game.step();
  expect(enemy.alive).toBe(false);
  expect(run.mastery.pulse.kills).toBe(1);
  expect(run.mastery.pulse.elites).toBe(1);
  expect(run.metrics.impactKills).toBe(1);
});
it.each([
  ['orbital_engine', 'Orbital'],
  ['zero', 'Void'],
])('classifies %s collisions using authored power tags', (source, tag) => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('tagged-impact');
  run.phase = 'room';
  const enemy = game.world.spawn('chaser', { x: 1100, y: 360 })!;
  enemy.health = 1;
  let tags: string[] = [];
  game.events.on('killed', (event) => {
    if (event.kind === 'chaser') tags = event.damageTags;
  });
  game.markCause(enemy, game.createCause(source));
  game.start();
  game.gravity.strength = 0;
  Matter.Body.setVelocity(enemy.body, { x: 18, y: 0 });
  for (let i = 0; i < 40 && enemy.alive; i++) game.step();
  expect(enemy.alive).toBe(false);
  expect(tags).toContain(tag);
  expect(run.mastery[source].kills).toBe(1);
  game.world.dispose();
});
it('counts many parallel effects without allowing unbounded recursive depth or lifetime', () => {
  const chains = new ChainTracker();
  const id = chains.start(0, 'well');
  for (let i = 0; i < 80; i++) chains.extend(id, `impact:${i}`, 1, 1);
  expect(chains.best).toBe(64);
  expect(chains.source(id)).toBe('well');
  expect(chains.extend(id, 'too-deep', 13, 1)).toBe(0);
  chains.touch(id, 19);
  chains.tick(21);
  expect(chains.source(id)).toBe('environment');
});
it('persists discoveries and grants challenge rewards once', () => {
  const profile = newProfile();
  const run = new Expedition(new Game(false));
  run.start('achievements');
  run.phase = 'summary';
  run.bestChain = 20;
  run.discoveries.add('planet:3');
  run.discoveries.add('lore:3');
  run.mastery.pulse = { casts: 50, kills: 100, elites: 1, bosses: 1, chain: 10, wins: 1 };
  expect(settleRun(profile, run)).toBe(true);
  expect(profile.challenges).toContain('chain_twenty');
  expect(profile.challenges).toEqual(
    expect.arrayContaining([
      'pulse_practice',
      'pulse_force',
      'pulse_breaker',
      'pulse_cascade',
      'pulse_master',
    ]),
  );
  expect(profile.equipment.event_horizon).toBe(1);
  expect(masteryLevel(profile.abilityMastery.pulse)).toBe(5);
  const currency = profile.shards;
  expect(settleRun(profile, run)).toBe(false);
  expect(profile.shards).toBe(currency);
  expect(readProfile(profile)).toEqual(profile);
  const codex = codexView(profile);
  expect(codex).toContain('Kepler Remnant');
  expect(codex).toContain('The last station');
  expect(codex).not.toContain('Aster Foundry');
});
it('records defeated guardians separately from encounters and remembers expedition-only equipment', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const profile = newProfile();
  run.start('collection-records');
  run.discoveries.add('boss:magnetar');
  expect(run.discoveries.has('defeated:magnetar')).toBe(false);
  run.phase = 'room';
  const boss = game.world.spawn('magnetar', { x: 800, y: 400 })!;
  boss.health = 1;
  game.applyDamage(boss, 85, game.createCause('planet'));
  expect(run.discoveries.has('defeated:magnetar')).toBe(true);
  run.phase = 'shop';
  run.build.currency = 100;
  run.shop = [{ id: 'equipment:hollow_core', price: 60, sold: false }];
  expect(run.buy('equipment:hollow_core')).toBe(true);
  run.phase = 'summary';
  expect(settleRun(profile, run)).toBe(true);
  expect(profile.equipment.hollow_core).toBeUndefined();
  const restored = readProfile(JSON.parse(JSON.stringify(profile)));
  expect(restored.discoveries).toContain('equipment:hollow_core');
  expect(restored.discoveries).toContain('defeated:magnetar');
  const codex = codexView(restored);
  expect(codex).toContain('Defeated. Three phases.');
  expect(codex.includes(equipmentById.get('hollow_core')!.name)).toBe(true);
  game.world.dispose();
});
it('records initial props and later spawned machines and enemies for the persistent codex', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const profile = newProfile();
  run.start('codex-spawns', 'engineer');
  run.enter(run.available[0].id);
  expect([...run.discoveries].some((id) => id.startsWith('object:'))).toBe(true);
  expect(game.castAbility('beacon', { x: 600, y: 400 })).toBe(true);
  expect(run.discoveries.has('object:gravity_machine')).toBe(true);
  game.world.spawn('parasite', { x: 700, y: 400 });
  expect(run.discoveries.has('enemy:parasite')).toBe(true);
  run.phase = 'summary';
  settleRun(profile, run);
  const codex = codexView(readProfile(JSON.parse(JSON.stringify(profile))));
  expect(codex.includes('<h3>Gravity Machine</h3>')).toBe(true);
  game.world.dispose();
});

it('keeps the complete collection of power challenges through profile migration', () => {
  expect(challenges.length).toBeGreaterThanOrEqual(100);
  expect(new Set(challenges.map((item) => item.id)).size).toBe(challenges.length);
  const profile = newProfile();
  profile.challenges = challenges.map((item) => item.id);
  expect(readProfile(profile).challenges).toEqual(profile.challenges);
});
it('earned appearance and titles persist while locked choices safely fall back', () => {
  const profile = newProfile();
  profile.shards = 42;
  profile.cosmetic = 'cascade';
  profile.title = 'chain_twenty';
  const locked = readProfile(profile);
  expect(locked.cosmetic).toBe('core');
  expect(locked.title).toBe('');
  expect(locked.shards).toBe(42);
  profile.challenges.push('chain_twenty');
  expect(readProfile(profile)).toEqual(profile);
  const codex = codexView(profile);
  expect(codex).toContain('Cascade Prism');
  expect(codex).toContain('Cascadeborn');
  expect(codex).toContain('The long consequence');
});
it('mastery milestones require actual combat achievements beyond cast count', () => {
  const progress = freshMastery();
  progress.casts = 10000;
  expect(masteryLevel(progress)).toBe(1);
  progress.kills = 100;
  expect(masteryLevel(progress)).toBe(2);
  progress.elites = 1;
  expect(masteryLevel(progress)).toBe(3);
  progress.chain = 10;
  expect(masteryLevel(progress)).toBe(4);
  progress.wins = 1;
  expect(masteryLevel(progress)).toBe(5);
});
