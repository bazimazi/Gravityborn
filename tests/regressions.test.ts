import Matter from 'matter-js';
import { expect, it } from 'vitest';
import balance from '../src/data/balance.json';
import { Game } from '../src/gameplay/game';
import { GravitySystem } from '../src/physics/gravity';
import { PhysicsWorld } from '../src/physics/world';

it('does not create causal credit by selecting the already-active gravity direction', () => {
  const game = new Game();
  game.start();
  expect(game.flip({ x: 0, y: 1 })).toBe(false);
  expect(game.stats.flips).toBe(0);
  expect([...game.world.entities.values()].every((entity) => entity.chainId === null)).toBe(true);
});

it('sustained enemy contact remains dangerous after the first contact begins', () => {
  const game = new Game(false);
  game.gravity.strength = 0;
  game.world.spawn('chaser', { x: 344, y: 470 });
  game.start();
  for (let step = 0; step < 240; step++) game.step();
  expect(game.player.health).toBeLessThanOrEqual(100 - balance.player.contactDamage * 2);
});

it('attributes objects entering an existing well to its original causal chain', () => {
  const game = new Game();
  game.start();
  game.createWell({ x: 850, y: 350 });
  const barrel = [...game.world.entities.values()].find((entity) => entity.kind === 'barrel')!;
  const projectile = game.world.spawn('projectile', { x: 840, y: 350 })!;
  game.step();
  expect(projectile.chainId).toBe(barrel.chainId);
  expect(projectile.redirected).toBe(true);
});

it('clamps externally supplied extreme velocity before collision integration', () => {
  const world = new PhysicsWorld(new GravitySystem(0, 0.01));
  world.addWall(200, 100, 50, 200);
  const projectile = world.spawn('projectile', { x: 150, y: 100 })!;
  Matter.Body.setVelocity(projectile.body, { x: 1e8, y: 0 });
  world.step();
  expect(projectile.body.position.x).toBeLessThan(175);
  expect(Matter.Body.getSpeed(projectile.body)).toBeLessThanOrEqual(balance.physics.maxVelocity);
});

it('enforces the local gravity-source budget', () => {
  const gravity = new GravitySystem(0, 1);
  const field = {
    source: 'test',
    mode: 'radial' as const,
    position: { x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    strength: 1,
    radius: 10,
    falloff: 'linear' as const,
    remaining: 10,
  };
  for (let index = 0; index < balance.physics.maxFields; index++) gravity.addField(field);
  expect(() => gravity.addField(field)).toThrow('budget');
});

it('rebuilds invalid geometry at its last finite position without losing entity identity', () => {
  const world = new PhysicsWorld(new GravitySystem(0, 0.01));
  const player = world.spawn('player', { x: 200, y: 200 })!;
  const id = player.id;
  player.health = 73;
  player.body.position.x = NaN;
  player.body.vertices[0].x = Infinity;
  world.step();
  expect(world.entities.get(id)).toBe(player);
  expect(player.health).toBe(73);
  expect(player.body.position).toEqual({ x: 200, y: 200 });
  expect(player.body.vertices.every((vertex) => Number.isFinite(vertex.x + vertex.y))).toBe(true);
  world.step();
  expect(Number.isFinite(player.body.speed)).toBe(true);
});
