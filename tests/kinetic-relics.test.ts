import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';

it('Flywheel adds a bounded orbital kick on flips and its cooldown survives build refresh', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'flywheel');
  build.addRelic('flywheel');
  const rock = game.world.spawn('rock', {
    x: game.player.body.position.x + 80,
    y: game.player.body.position.y,
  })!;
  game.start();
  game.flip({ x: 1, y: 0 });
  expect(rock.body.velocity.y).toBeGreaterThan(0);
  expect(game.chains.tags(rock.chainId)).toContain('Orbit');
  const velocity = { ...rock.body.velocity };
  build.apply();
  game.flip({ x: 0, y: -1 });
  expect(rock.body.velocity).toEqual(velocity);
  game.time = 2.1;
  game.flip({ x: -1, y: 0 });
  expect(rock.body.velocity.y).toBeGreaterThan(velocity.y);
  expect(game.abilities.modifiers.evaluate('energyRegen', 8)).toBe(6);
  game.world.dispose();
});

it('Emergency Brake affects nearby moving matter once per cooldown and leaves stationary and distant bodies unclaimed', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'brake');
  build.addRelic('emergency_brake');
  const point = game.player.body.position;
  const shot = game.world.spawn('projectile', { x: point.x + 80, y: point.y })!;
  const still = game.world.spawn('rock', { x: point.x + 130, y: point.y })!;
  const distant = game.world.spawn('rock', { x: 1050, y: 100 })!;
  Matter.Body.setVelocity(shot.body, { x: 10, y: -5 });
  Matter.Body.setVelocity(distant.body, { x: 8, y: 0 });
  game.applyDamage(game.player, 1, game.createCause('enemy'));
  expect(shot.body.velocity).toEqual({ x: 2, y: -1 });
  expect(shot.redirected).toBe(true);
  expect(still.chainId).toBeNull();
  expect(distant.body.velocity.x).toBe(8);
  game.player.invulnerability = 0;
  game.applyDamage(game.player, 1, game.createCause('enemy'));
  expect(shot.body.velocity).toEqual({ x: 2, y: -1 });
  game.world.dispose();
});

it('Return Receipt reverses real shots after a solver collision', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'receipt');
  build.addRelic('return_receipt');
  game.gravity.strength = 0;
  game.world.spawn('heavy', { x: 1000, y: 600 });
  const rock = game.world.spawn('rock', { x: 50, y: 250 })!;
  const shot = game.world.spawn('projectile', {
    x: game.player.body.position.x + 80,
    y: game.player.body.position.y - 80,
  })!;
  Matter.Body.setVelocity(rock.body, { x: -10, y: 0 });
  Matter.Body.setVelocity(shot.body, { x: 5, y: 0 });
  game.start();
  for (let i = 0; i < 20 && !shot.redirected; i++) game.step();
  expect(shot.redirected).toBe(true);
  expect(shot.body.velocity.x).toBeCloseTo(-5);
  expect(game.chains.source(shot.chainId)).toBe('relic');
  expect(game.chains.tags(shot.chainId)).toContain('Projectile');
  game.world.dispose();
});

it('Stable Orbit waits for an energy reserve and Moon Fragment requires an orbital kill', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'orbital-relics');
  build.addRelic('stable_orbit');
  build.addRelic('moon_fragment');
  const rock = game.world.spawn('rock', {
    x: game.player.body.position.x + 80,
    y: game.player.body.position.y,
  })!;
  game.world.spawn('heavy', { x: 1050, y: 600 });
  game.abilities.energy = 0;
  game.gravity.strength = 0;
  game.start();
  game.step();
  expect(rock.body.speed).toBe(0);
  game.abilities.energy = 100;
  game.step();
  expect(rock.body.velocity.y).toBeGreaterThan(0);
  Matter.Body.setVelocity(rock.body, { x: 0, y: 0 });
  const enemy = game.world.spawn('chaser', { x: 1000, y: 200 })!;
  game.applyDamage(enemy, 85, game.createCause('relic', ['Orbit']), 'Orbit');
  expect(rock.body.velocity.y).toBeGreaterThan(0);
  game.world.dispose();
});

it('kinetic relic tradeoffs and three synergies survive saved build recovery', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'kinetic-combos');
  for (const id of [
    'densify',
    'orbital_strike',
    'quarter_turn',
    'beam',
    'featherweight',
    'constellation',
  ])
    game.abilities.learn(id);
  for (const id of ['planetary_core', 'buoyant_capacitor', 'inertial_fuse']) build.addRelic(id);
  const saved = build.snapshot();
  build.restore(saved);
  expect(build.activeSynergies).toEqual(
    expect.arrayContaining(['Weighted Orbit', 'Ricochet Geometry', 'Light Filament']),
  );
  expect(game.player.gravityScale).toBe(-0.6);
  expect(game.player.body.mass).toBe(game.player.definition.mass * 0.6);
  expect(game.abilities.maxEnergy).toBe(135);
  expect(game.abilities.modifiers.evaluate('duration', 4, ['Mass'])).toBe(9);
  expect(game.abilities.modifiers.evaluate('energyCost', 20, ['Control'])).toBe(16);
  game.start();
  game.abilities.learn('iron_core');
  game.castAbility('iron_core', game.player.body.position);
  expect(game.player.invulnerability).toBe(0.6);
  game.world.dispose();
});

it('a real density-attributed impact pays Heavy Dividend and preserves the Mass kill tag', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'mass-impact');
  build.addRelic('heavy_dividend');
  game.gravity.strength = 0;
  const rock = game.world.spawn('rock', { x: 700, y: 350 })!;
  const enemy = game.world.spawn('chaser', { x: 750, y: 350 })!;
  enemy.health = 1;
  const kills: string[][] = [];
  game.events.on('killed', (event) => {
    if (event.kind === 'chaser') kills.push(event.damageTags);
  });
  game.abilities.learn('densify');
  Matter.Body.setVelocity(rock.body, { x: 12, y: 0 });
  game.abilities.cast('densify', rock.body.position, true);
  game.abilities.energy = 0;
  game.start();
  for (let step = 0; step < 12 && enemy.alive; step++) game.step();
  expect(enemy.alive).toBe(false);
  expect(kills[0]).toContain('Mass');
  expect(game.abilities.energy).toBeGreaterThanOrEqual(15);
  game.world.dispose();
});
