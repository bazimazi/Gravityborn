import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';

it('mass powers compose with elite mass, refresh without multiplying and expire independently', () => {
  const game = new Game(false);
  const body = game.world.spawn('heavy', { x: 600, y: 400 })!;
  game.enemies.setElite(body, 'heavy');
  const base = body.body.mass;
  for (const id of ['densify', 'featherweight']) game.abilities.learn(id);
  expect(game.abilities.cast('densify', body.body.position, true)).toBe(true);
  expect(body.body.mass).toBe(base * 3);
  game.abilities.cast('featherweight', body.body.position, true);
  expect(body.body.mass).toBe(base * 0.75);
  game.time = 1;
  game.abilities.cast('densify', body.body.position, true);
  expect(body.body.mass).toBe(base * 0.75);
  game.time = 4.1;
  game.abilities.tick(0);
  expect(body.body.mass).toBe(base * 3);
  game.time = 6.1;
  game.abilities.tick(0);
  expect(body.body.mass).toBe(base);
  game.world.dispose();
});

it('mass expiry while frozen restores base mass when Matter releases the lock', () => {
  const game = new Game(false);
  const body = game.world.spawn('rock', { x: 600, y: 400 })!;
  const base = body.body.mass;
  game.abilities.learn('densify');
  game.abilities.cast('densify', body.body.position, true);
  Matter.Body.setStatic(body.body, true);
  game.time = 6;
  game.abilities.tick(0);
  expect(body.massPending).toBe(true);
  expect(body.body.mass).toBe(Infinity);
  Matter.Body.setStatic(body.body, false);
  game.world.step();
  expect(body.body.mass).toBe(base);
  expect(body.massPending).toBe(false);
  game.world.dispose();
});

it('mass-altered lock release keeps the active factor and retains player rotation lock', () => {
  const game = new Game(false);
  const body = game.world.spawn('rock', { x: 600, y: 400 })!;
  for (const id of ['densify', 'lock', 'iron_core']) game.abilities.learn(id);
  game.abilities.cast('densify', body.body.position, true);
  game.abilities.cast('lock', body.body.position, true);
  game.time = 2;
  game.abilities.tick(0);
  expect(body.body.isStatic).toBe(false);
  expect(body.body.mass).toBe(body.massBase * 3);
  game.abilities.cast('iron_core', game.player.body.position, true);
  expect(game.player.body.mass).toBe(game.player.massBase * 3);
  expect(game.player.body.inertia).toBe(Infinity);
  game.world.setMass(game.player, 10);
  expect(game.player.body.mass).toBe(30);
  game.time = 7;
  game.abilities.tick(0);
  expect(game.player.body.mass).toBe(10);
  expect(game.player.body.inertia).toBe(Infinity);
  game.world.dispose();
});

it('projectile density filters, upgrades and recycled generations preserve physical mass', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 600, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 630, y: 400 })!;
  game.abilities.learn('paper_shots');
  game.abilities.cast('paper_shots', shot.body.position, true);
  expect(shot.body.mass).toBeCloseTo(shot.massBase * 0.1);
  expect(shot.redirected).toBe(false);
  expect(rock.body.mass).toBe(rock.massBase);
  const levelOne = shot.body.mass;
  game.abilities.learn('paper_shots');
  game.abilities.cast('paper_shots', shot.body.position, true);
  expect(shot.body.mass).toBeLessThan(levelOne);
  game.world.remove(shot);
  const next = game.world.spawn('projectile', { x: 600, y: 400 })!;
  expect(next).toBe(shot);
  game.time = 6;
  game.abilities.tick(0);
  expect(next.body.mass).toBe(next.definition.mass);
  expect(next.massFactors.size).toBe(0);
  game.world.dispose();
});

it('Orbital Strike adds perpendicular momentum; Counter Orbit resets into the opposite tangent', () => {
  const game = new Game(false);
  const rock = game.world.spawn('rock', { x: 650, y: 400 })!;
  for (const id of ['orbital_strike', 'counter_orbit']) game.abilities.learn(id);
  Matter.Body.setVelocity(rock.body, { x: 4, y: 0 });
  game.abilities.cast('orbital_strike', { x: 600, y: 400 }, true);
  expect(rock.body.velocity.x).toBe(4);
  expect(rock.body.velocity.y).toBeGreaterThan(0);
  game.abilities.cast('counter_orbit', { x: 600, y: 400 }, true);
  expect(rock.body.velocity.x).toBe(0);
  expect(rock.body.velocity.y).toBeLessThan(0);
  expect(game.chains.source(rock.chainId)).toBe('counter_orbit');
  game.world.dispose();
});

it('velocity turns preserve speed, turn by the authored angle at every level and leave stationary matter unclaimed', () => {
  const game = new Game(false);
  const rock = game.world.spawn('rock', { x: 600, y: 400 })!;
  const still = game.world.spawn('crate', { x: 630, y: 400 })!;
  for (let level = 1; level <= 3; level++) {
    game.abilities.learn('quarter_turn');
    Matter.Body.setVelocity(rock.body, { x: 8, y: 0 });
    game.abilities.cast('quarter_turn', rock.body.position, true);
    expect(rock.body.velocity.x).toBeCloseTo(0);
    expect(rock.body.velocity.y).toBeCloseTo(8);
    expect(still.chainId).toBeNull();
  }
  game.world.dispose();
});

it('volley steering redirects only moving shots, preserves speed and rejects ambiguous zero-length aim', () => {
  const game = new Game(false);
  const point = { x: game.player.body.position.x + 60, y: game.player.body.position.y };
  const shot = game.world.spawn('projectile', point)!;
  const rock = game.world.spawn('rock', { x: point.x + 40, y: point.y })!;
  Matter.Body.setVelocity(shot.body, { x: 3, y: 4 });
  Matter.Body.setVelocity(rock.body, { x: 3, y: 4 });
  game.abilities.learn('volley_conductor');
  expect(game.abilities.cast('volley_conductor', game.player.body.position)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  game.abilities.cast('volley_conductor', { x: point.x + 300, y: point.y });
  expect(shot.body.velocity).toEqual({ x: 5, y: 0 });
  expect(shot.redirected).toBe(true);
  expect(rock.body.velocity).toEqual({ x: 3, y: 4 });
  game.world.dispose();
});

it('orbital victory recognition includes relic-driven orbit kills without inventing ability mastery', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('orbital-relic', 'manipulator', undefined, 0, { mode: 'quick' });
  run.enter(run.available[0].id);
  for (let i = 0; i < 4; i++)
    game.events.emit('killed', {
      kind: 'chaser',
      position: { x: 600, y: 400 },
      chainId: 1,
      chainLength: 1,
      source: 'relic',
      elite: false,
      boss: false,
      damageTags: i < 3 ? ['Impact', 'Orbit', 'Orbit'] : ['Impact'],
    });
  expect(run.metrics.orbitKills).toBe(3);
  expect(run.mastery.relic).toBeUndefined();
  run.current = run.map.find((node) => node.type === 'boss')!;
  run.current.next = [];
  run.phase = 'reward';
  run.build.pending = 0;
  expect(run.advance()).toBe(true);
  expect(run.metrics.orbitalWins).toBe(1);
  game.world.dispose();
});
