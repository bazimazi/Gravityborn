import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { PhysicsWorld } from '../src/physics/world';
import { GravitySystem } from '../src/physics/gravity';

function setup() {
  const gravity = new GravitySystem(0, 0.009);
  const world = new PhysicsWorld(gravity);
  world.focus = { x: 0, y: 0 };
  const prop = world.spawn('crate', { x: 900, y: 400 })!;
  for (let index = 0; index < 150; index++) world.step();
  expect(prop.body.isSleeping).toBe(true);
  return { world, gravity, prop };
}
it('only distant stationary neutral matter sleeps; nearby bodies and actors keep full updates', () => {
  const { world, prop } = setup();
  const nearby = world.spawn('crate', { x: 150, y: 50 })!;
  const enemy = world.spawn('chaser', { x: 900, y: 600 })!;
  const pickup = world.spawn('xp', { x: 900, y: 700 })!;
  const moving = world.spawn('rock', { x: 900, y: 100 })!;
  for (let index = 0; index < 150; index++) {
    Matter.Body.setVelocity(moving.body, { x: 0.5, y: 0 });
    world.step();
  }
  expect(prop.body.isSleeping).toBe(true);
  for (const entity of [nearby, enemy, pickup, moving]) expect(entity.body.isSleeping).toBe(false);
  world.focus = { x: 800, y: 400 };
  world.step();
  expect(prop.body.isSleeping).toBe(false);
  world.dispose();
});
it('gravity changes wake dormant matter on the next physics step', () => {
  const { world, gravity, prop } = setup();
  gravity.addField({
    source: 'test',
    mode: 'radial',
    position: { x: 1000, y: 400 },
    direction: { x: 0, y: 0 },
    strength: 0.006,
    radius: 250,
    remaining: 5,
    falloff: 'linear',
  });
  world.step();
  expect(prop.body.isSleeping).toBe(false);
  expect(prop.body.velocity.x).toBeGreaterThan(0);
  world.dispose();
});
it('ending a zero-gravity pocket restores acceleration immediately', () => {
  const { world, gravity, prop } = setup();
  gravity.strength = 0.00125;
  const field = gravity.addField({
    source: 'test',
    mode: 'zero',
    position: prop.body.position,
    direction: { x: 0, y: 0 },
    strength: 1,
    radius: 250,
    remaining: 5,
    falloff: 'constant',
  });
  world.step();
  expect(prop.body.isSleeping).toBe(true);
  gravity.removeField(field);
  world.step();
  expect(prop.body.isSleeping).toBe(false);
  expect(prop.body.velocity.y).toBeGreaterThan(0);
  world.dispose();
});
it('even a slow collision wakes a sleeping prop before resolving its impact', () => {
  const { world, prop } = setup();
  const other = world.spawn('crate', { x: 863, y: 400 })!;
  Matter.Body.setVelocity(other.body, { x: 0.1, y: 0 });
  world.step();
  expect(prop.body.isSleeping).toBe(false);
  expect(world.collisions.some((collision) => collision.a === prop || collision.b === prop)).toBe(
    true,
  );
  world.dispose();
});
it('applied impulses, physical links and moving geometry wake distant props', () => {
  for (const cause of ['impulse', 'link', 'wall']) {
    const { world, prop } = setup();
    if (cause === 'impulse') world.impulse(prop, { x: 2, y: 0 });
    if (cause === 'link') {
      const other = world.spawn('rock', { x: 800, y: 400 })!;
      Matter.Composite.add(
        world.engine.world,
        Matter.Constraint.create({
          bodyA: prop.body,
          bodyB: other.body,
          length: 60,
          stiffness: 0.01,
        }),
      );
    }
    if (cause === 'wall') world.addWall(1100, 400, 25, 200);
    world.step();
    expect(prop.body.isSleeping).toBe(false);
    if (cause === 'wall') {
      for (let index = 0; index < 150; index++) world.step();
      expect(prop.body.isSleeping).toBe(true);
      Matter.Body.setPosition(world.walls[0], { x: 1080, y: 400 });
      world.step();
      expect(prop.body.isSleeping).toBe(false);
    }
    world.dispose();
  }
});
