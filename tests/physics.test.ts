import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { GravitySystem } from '../src/physics/gravity';
import { PhysicsWorld } from '../src/physics/world';
import balance from '../src/data/balance.json';

describe('fixed-step physics', () => {
  it('accelerates mass-independent bodies according to their configured response', () => {
    const world = new PhysicsWorld(new GravitySystem(0.001, 0.01));
    const crate = world.spawn('crate', { x: 100, y: 100 })!;
    const rock = world.spawn('rock', { x: 300, y: 100 })!;
    world.step();
    expect(Matter.Body.getVelocity(crate.body).y).toBeCloseTo(
      Matter.Body.getVelocity(rock.body).y,
      3,
    );
    expect(rock.body.mass).toBeGreaterThan(crate.body.mass);
    world.dispose();
  });
  it('keeps fast projectiles inside arena walls and records incoming collision speed', () => {
    const world = new PhysicsWorld(new GravitySystem(0, 0.01));
    world.addWall(200, 100, 50, 300);
    const projectile = world.spawn('projectile', { x: 100, y: 100 })!;
    Matter.Body.setVelocity(projectile.body, { x: 18, y: 0 });
    let incomingSpeed = 0;
    for (let i = 0; i < 20; i++) {
      world.step();
      incomingSpeed = Math.max(
        incomingSpeed,
        ...world.collisions.map((collision) => collision.speed),
      );
      expect(projectile.body.position.x).toBeLessThan(200);
    }
    expect(incomingSpeed).toBeGreaterThan(10);
    world.dispose();
  });
  it('clamps extreme overlapping field acceleration and impulse velocity', () => {
    const gravity = new GravitySystem(0, balance.physics.maxAcceleration);
    for (let i = 0; i < 10; i++)
      gravity.addField({
        source: 'stress',
        mode: 'radial',
        position: { x: 200, y: 100 },
        direction: { x: 0, y: 0 },
        strength: 100,
        radius: 200,
        falloff: 'constant',
        remaining: 10,
      });
    const world = new PhysicsWorld(gravity);
    const rock = world.spawn('rock', { x: 100, y: 100 })!;
    world.impulse(rock, { x: 1e10, y: 1e10 });
    for (let i = 0; i < 200; i++) world.step();
    expect(Number.isFinite(rock.body.position.x)).toBe(true);
    expect(Matter.Body.getSpeed(rock.body)).toBeLessThanOrEqual(
      balance.physics.maxVelocity + 0.001,
    );
    world.dispose();
  });
  it('reuses projectile bodies without retaining owner, health, or chain state', () => {
    const world = new PhysicsWorld(new GravitySystem(0, 1));
    const projectile = world.spawn('projectile', { x: 0, y: 0 })!;
    projectile.chainId = 42;
    projectile.ownerId = 99;
    projectile.redirected = true;
    world.remove(projectile);
    const reused = world.spawn('projectile', { x: 50, y: 50 })!;
    expect(reused.body.id).toBe(projectile.body.id);
    expect(reused.chainId).toBeNull();
    expect(reused.ownerId).toBeNull();
    expect(reused.redirected).toBe(false);
    expect(reused.health).toBe(1);
    expect(reused.body.position).toEqual({ x: 50, y: 50 });
    world.dispose();
  });
  it('enforces a live body budget', () => {
    const world = new PhysicsWorld(new GravitySystem(0, 1));
    for (let i = 0; i < balance.physics.maxBodies; i++) world.spawn('crate', { x: i * 50, y: 0 });
    expect(world.spawn('crate', { x: 0, y: 0 })).toBeUndefined();
    world.dispose();
  });
});
