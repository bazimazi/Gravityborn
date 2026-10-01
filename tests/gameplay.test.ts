import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { ChainTracker } from '../src/gameplay/chains';
import balance from '../src/data/balance.json';

describe('gravity combat', () => {
  it('scales a core collision with the core mass instead of the victim mass', () => {
    const strike = (mass: number): number => {
      const game = new Game(false);
      const target = game.world.spawn('heavy', { x: 640, y: 350 })!;
      target.health = 1000;
      target.maxHealth = 1000;
      Matter.Body.setPosition(game.player.body, { x: 590, y: 350 });
      Matter.Body.setMass(game.player.body, mass);
      game.player.invulnerability = 10;
      game.gravity.strength = 0;
      game.start();
      game.markCause(game.player, game.createCause('slingshot'));
      Matter.Body.setVelocity(game.player.body, { x: 9, y: 0 });
      for (let step = 0; step < 20 && target.health === 1000; step++) game.step();
      const damage = 1000 - target.health;
      game.world.dispose();
      return damage;
    };
    const light = strike(1);
    const heavy = strike(3);
    expect(light).toBeGreaterThan(0);
    expect(heavy / light).toBeCloseTo(3, 1);
  });
  it('kills enemies through wall impacts after a gravity flip without an attack', () => {
    const game = new Game(false);
    const enemy = game.world.spawn('chaser', { x: 1100, y: 360 })!;
    enemy.health = 20; // Finish a weakened enemy through a real solver collision.
    game.start();
    game.flip({ x: 1, y: 0 });
    Matter.Body.setVelocity(enemy.body, { x: 18, y: 0 });
    for (let i = 0; i < 40 && game.state === 'playing'; i++) game.step();
    expect(enemy.alive).toBe(false);
    expect(game.stats.kills).toBe(1);
    expect(game.state).toBe('won');
  });
  it('uses a heavy movable object as a weapon', () => {
    const game = new Game(false);
    const enemy = game.world.spawn('chaser', { x: 850, y: 365 })!;
    const rock = game.world.spawn('rock', { x: 770, y: 365 })!;
    game.start();
    game.flip({ x: 0, y: 0 });
    Matter.Body.setVelocity(rock.body, { x: 17, y: 0 });
    for (let i = 0; i < 15 && game.state === 'playing'; i++) game.step();
    expect(enemy.alive).toBe(false);
    expect(rock.alive).toBe(true);
  });
  it('propagates a barrel explosion through another barrel to an enemy with the same causal chain', () => {
    const game = new Game(false);
    const barrel = game.world.spawn('barrel', { x: 800, y: 350 })!;
    const second = game.world.spawn('barrel', { x: 855, y: 350 })!;
    const enemy = game.world.spawn('chaser', { x: 890, y: 350 })!;
    const rock = game.world.spawn('rock', { x: 735, y: 350 })!;
    const explosions: (number | null)[] = [];
    game.events.on('explosion', (event) => explosions.push(event.chainId));
    game.start();
    game.flip({ x: 0, y: 0 });
    Matter.Body.setVelocity(rock.body, { x: 17, y: 0 });
    for (let i = 0; i < 25 && game.state === 'playing'; i++) game.step();
    expect(barrel.alive).toBe(false);
    expect(second.alive).toBe(false);
    expect(enemy.alive).toBe(false);
    expect(explosions).toHaveLength(2);
    expect(explosions[0]).toBe(explosions[1]);
    expect(game.chains.best).toBeGreaterThanOrEqual(3);
  });
  it('bends a projectile with a well and allows it to kill its shooter', () => {
    const game = new Game(false);
    const enemy = game.world.spawn('shooter', { x: 920, y: 360 })!;
    enemy.health = 15;
    const projectile = game.world.spawn('projectile', { x: 830, y: 360 })!;
    projectile.ownerId = enemy.id;
    projectile.life = 1;
    game.start();
    expect(game.createWell({ x: 1000, y: 360 })).toBe(true);
    for (let i = 0; i < 120 && game.state === 'playing'; i++) game.step();
    expect(projectile.redirected).toBe(true);
    expect(enemy.alive).toBe(false);
    expect(game.stats.redirectedKills).toBe(1);
  });
  it('enforces well cooldown and expiration using simulation time', () => {
    const game = new Game();
    game.start();
    expect(game.createWell({ x: 500, y: 400 })).toBe(true);
    expect(game.createWell({ x: 600, y: 400 })).toBe(false);
    game.pause();
    const time = game.time;
    for (let i = 0; i < 100; i++) game.step();
    expect(game.time).toBe(time);
    expect(game.gravity.fields.size).toBe(1);
    game.resume();
    game.gravity.tick(balance.gravity.wellDuration);
    expect(game.gravity.fields.size).toBe(0);
  });
  it('restarts with clean bodies, timers, health, and run stats', () => {
    const game = new Game();
    game.start();
    game.flip({ x: -1, y: 0 });
    game.createWell({ x: 300, y: 300 });
    game.player.health = 0;
    game.step();
    expect(game.state).toBe('lost');
    game.reset();
    expect(game.state).toBe('ready');
    expect(game.player.health).toBe(100);
    expect(game.enemyCount).toBe(6);
    expect(game.gravity.fields.size).toBe(0);
    expect(game.stats.flips).toBe(0);
  });
});

it('bounds chain depth, deduplicates effects, and expires causal records', () => {
  const chains = new ChainTracker();
  const id = chains.start(0);
  expect(chains.extend(id, 'kill:1', 1, 0)).toBe(1);
  expect(chains.extend(id, 'kill:1', 2, 0)).toBe(1);
  expect(chains.extend(id, 'kill:2', 100, 0)).toBe(0);
  chains.tick(7);
  expect(chains.current).toBe(0);
  expect(chains.extend(id, 'kill:3', 1, 7)).toBe(0);
});
