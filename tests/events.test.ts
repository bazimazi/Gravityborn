import { expect, it } from 'vitest';
import Matter from 'matter-js';
import { EventBus, type GameEvents } from '../src/core/events';
import { ChainTracker } from '../src/gameplay/chains';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { RunBuild } from '../src/progression/build';
import balance from '../src/data/balance.json';

it('gravity changes cannot claim static, phased or fully zero-G projectiles', () => {
  const game = new Game(false);
  const locked = game.world.spawn('projectile', { x: 400, y: 400 })!;
  const phased = game.world.spawn('projectile', { x: 500, y: 400 })!;
  const zero = game.world.spawn('projectile', { x: 600, y: 400 })!;
  const affected = game.world.spawn('projectile', { x: 800, y: 400 })!;
  Matter.Body.setStatic(locked.body, true);
  phased.gravityFactors.set('phase', 0);
  game.gravity.addField({
    source: 'environment',
    mode: 'zero',
    position: zero.body.position,
    direction: { x: 0, y: 0 },
    strength: 1,
    radius: 30,
    falloff: 'constant',
    remaining: 10,
  });
  game.start();
  expect(game.flip({ x: 0, y: -1 })).toBe(true);
  for (const entity of [locked, phased, zero]) {
    expect(entity.chainId).toBeNull();
    expect(entity.redirected).toBe(false);
  }
  expect(affected.chainId).not.toBeNull();
  expect(affected.redirected).toBe(true);
  game.abilities.learn('rotate');
  game.castAbility('rotate', game.player.body.position);
  game.time = 0.5;
  game.abilities.tick(0);
  for (const entity of [locked, phased, zero]) expect(entity.chainId).toBeNull();
});

it('wells and orbit shields do not redirect bodies immune to their fields', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 500, y: 400 })!;
  shot.gravityFactors.set('phase', 0);
  const locked = game.world.spawn('crate', { x: 550, y: 400 })!;
  Matter.Body.setStatic(locked.body, true);
  game.start();
  game.createWell(shot.body.position);
  game.abilities.learn('reflect');
  game.castAbility('reflect', shot.body.position);
  game.abilities.tick(0);
  expect(shot.chainId).toBeNull();
  expect(shot.redirected).toBe(false);
  expect(locked.chainId).toBeNull();
});

it('a full field budget rejects a well without emitting a phantom chain', () => {
  const game = new Game(false);
  for (let i = 0; i < balance.physics.maxFields; i++)
    game.gravity.addField({
      source: 'environment',
      mode: 'radial',
      position: { x: 600, y: 400 },
      direction: { x: 0, y: 0 },
      strength: 0.001,
      radius: 100,
      falloff: 'linear',
      remaining: 10,
    });
  let starts = 0;
  game.events.on('chainStarted', () => starts++);
  game.start();
  expect(game.createWell({ x: 600, y: 400 })).toBe(false);
  expect(starts).toBe(0);
});

it('chains emit one extension per distinct effect and one ending per expiration or reset', () => {
  const events = new EventBus();
  const starts: GameEvents['chainStarted'][] = [];
  const extensions: GameEvents['chainExtended'][] = [];
  const endings: GameEvents['chainEnded'][] = [];
  events.on('chainStarted', (value) => starts.push(value));
  events.on('chainExtended', (value) => extensions.push(value));
  events.on('chainEnded', (value) => endings.push(value));
  const chains = new ChainTracker(events);
  const first = chains.start(0, 'pulse');
  chains.extend(first, 'kill:1', 1, 0);
  chains.extend(first, 'kill:1', 1, 0);
  chains.extend(first, 'kill:2', 13, 0);
  expect(extensions).toEqual([{ id: first, source: 'pulse', length: 1, effect: 'kill:1' }]);
  chains.tick(7);
  chains.tick(8);
  const second = chains.start(8, 'well');
  chains.clear();
  chains.clear();
  expect(starts).toHaveLength(2);
  expect(endings).toEqual([
    { id: first, source: 'pulse', length: 1, reason: 'expired' },
    { id: second, source: 'well', length: 0, reason: 'reset' },
  ]);
});
it('upgrades and evolutions emit only when a power actually changes', () => {
  const game = new Game(false);
  const upgrades: GameEvents['abilityUpgraded'][] = [];
  game.events.on('abilityUpgraded', (event) => upgrades.push(event));
  game.abilities.learn('missing');
  game.abilities.learn('pulse');
  game.abilities.learn('pulse');
  game.abilities.learn('pulse');
  game.abilities.learn('pulse');
  expect(upgrades).toEqual([
    { id: 'pulse', previousLevel: 1, level: 2 },
    { id: 'pulse', previousLevel: 2, level: 3 },
    { id: 'nova', previousLevel: 0, level: 1, evolvedFrom: 'pulse' },
  ]);
  const build = new RunBuild(game, 'events');
  build.pending = 1;
  build.choices = [{ id: 'well:well', name: '', description: '', kind: 'well', target: 'well' }];
  expect(build.choose('well:well')).toBe(true);
  expect(upgrades.at(-1)).toEqual({ id: 'well', previousLevel: 1, level: 2 });
});
it('rejected targeted powers do not begin phantom causal chains', () => {
  const game = new Game(false);
  const starts: number[] = [];
  game.events.on('chainStarted', (event) => starts.push(event.id));
  game.abilities.learn('theft');
  game.abilities.learn('transfer');
  game.start();
  expect(game.castAbility('theft', { x: 800, y: 400 })).toBe(false);
  expect(game.castAbility('transfer', { x: 800, y: 400 })).toBe(false);
  expect(starts).toEqual([]);
  expect(game.abilities.energy).toBe(100);
});
it('run events distinguish replacement, defeat and summary dismissal without duplication', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const starts: GameEvents['runStarted'][] = [];
  const endings: GameEvents['runEnded'][] = [];
  game.events.on('runStarted', (event) => starts.push(event));
  game.events.on('runEnded', (event) => endings.push(event));
  run.start('first');
  run.start('second');
  expect(endings.map((event) => event.outcome)).toEqual(['abandoned']);
  expect(endings[0].id).toBe(starts[0].id);
  run.enter(run.available[0].id);
  game.player.health = 0;
  game.step();
  run.abandon();
  run.abandon();
  expect(starts).toHaveLength(2);
  expect(endings.map((event) => event.outcome)).toEqual(['abandoned', 'defeat']);
  expect(endings[1].id).toBe(starts[1].id);
  expect(endings[1].elapsed).toBeGreaterThan(0);
});
it('boss and elite events retain identity and emit once, including instant boss destruction', () => {
  const game = new Game(false);
  const starts: number[] = [];
  const deaths: number[] = [];
  const elites: number[] = [];
  game.events.on('bossStarted', (event) => starts.push(event.entityId));
  game.events.on('bossDefeated', (event) => deaths.push(event.entityId));
  game.events.on('eliteSpawned', (event) => elites.push(event.entityId));
  const boss = game.world.spawn('inverter', { x: 800, y: 400 })!;
  game.bosses.update(boss);
  game.bosses.update(boss);
  const elite = game.world.spawn('chaser', { x: 900, y: 400 })!;
  game.enemies.setElite(elite, 'heavy');
  game.enemies.setElite(elite, 'heavy');
  boss.health = 1;
  game.applyDamage(boss, 5, game.createCause());
  game.applyDamage(boss, 5, game.createCause());
  const instant = game.world.spawn('star', { x: 900, y: 250 })!;
  instant.health = 1;
  game.applyDamage(instant, 5, game.createCause());
  expect(starts).toEqual([boss.id]);
  expect(deaths).toEqual([boss.id, instant.id]);
  expect(elites).toEqual([elite.id]);
});
it('physical launch and collision events preserve the causal source and contact geometry', () => {
  const game = new Game(false);
  game.gravity.strength = 0;
  const enemy = game.world.spawn('heavy', { x: 1090, y: 400 })!;
  enemy.health = enemy.maxHealth = 1000;
  const launches: GameEvents['enemyLaunched'][] = [];
  const collisions: GameEvents['collisionOccurred'][] = [];
  game.events.on('enemyLaunched', (event) => launches.push(event));
  game.events.on('collisionOccurred', (event) => collisions.push(event));
  game.markCause(enemy, game.createCause('pulse'));
  Matter.Body.setVelocity(enemy.body, { x: 10, y: 0 });
  game.start();
  for (let i = 0; i < 240; i++) game.step();
  expect(launches).toHaveLength(1);
  expect(launches[0]).toMatchObject({ entityId: enemy.id, kind: 'heavy', source: 'pulse' });
  expect(
    collisions.some((event) => (event.a === enemy.id || event.b === enemy.id) && event.speed > 3),
  ).toBe(true);
  expect(
    collisions.every((event) =>
      Number.isFinite(event.normal.x + event.normal.y + event.position.x + event.position.y),
    ),
  ).toBe(true);
});
