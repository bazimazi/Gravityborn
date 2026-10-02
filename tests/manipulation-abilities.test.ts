import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';

const point = { x: 600, y: 400 };
function setup(...powers: string[]) {
  const game = new Game(false);
  game.gravity.strength = 0;
  for (const power of powers) game.abilities.learn(power);
  return game;
}

it('Cut the Lines preserves payload velocity and cannot consume the same network twice', () => {
  const game = setup('skyhook', 'tether_cut');
  const body = game.world.spawn('rock', { x: 740, y: 400 })!;
  game.abilities.cast('skyhook', point, true);
  Matter.Body.setVelocity(body.body, { x: 4, y: -3 });
  expect(game.abilities.cast('tether_cut', point)).toBe(true);
  expect(Matter.Body.getVelocity(body.body)).toEqual({ x: 4, y: -3 });
  expect(game.abilities.tethers).toHaveLength(0);
  expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(0);
  expect(game.abilities.cast('tether_cut', point, true)).toBe(false);
  expect(game.abilities.energy).toBe(92);
  game.world.dispose();
});

it('Tension Release sums network kicks once per body and honors current spring length and global speed', () => {
  const game = setup('winch', 'tension_release');
  const a = game.world.spawn('rock', { x: 610, y: 400 })!;
  const b = game.world.spawn('rock', { x: 790, y: 400 })!;
  game.abilities.cast('winch', point, true);
  game.time = 2;
  // At t=2 the rest length is 105 even if no intervening ability tick ran.
  game.abilities.cast('tension_release', point, true);
  expect(a.body.velocity.x).toBeGreaterThan(0);
  expect(b.body.velocity.x).toBeLessThan(0);
  expect(a.body.velocity.x).toBeCloseTo(-b.body.velocity.x);
  expect(a.body.velocity.x).toBeLessThanOrEqual(18);
  expect(game.chains.source(a.chainId)).toBe('tension_release');
  expect(game.abilities.tethers).toHaveLength(0);
  game.world.dispose();
});

it('relaxed links and stale pooled endpoints give no release impulse or credit', () => {
  const game = setup('skyhook', 'tension_release');
  const shot = game.world.spawn('projectile', { x: 680, y: 400 })!;
  game.abilities.cast('skyhook', point, true);
  game.abilities.cast('tension_release', point, true);
  expect(shot.body.velocity).toEqual({ x: 0, y: 0 });
  expect(shot.chainId).toBeNull();
  expect(shot.redirected).toBe(false);
  game.abilities.cast('skyhook', point, true);
  game.world.remove(shot);
  expect(game.world.spawn('projectile', { x: 740, y: 400 })).toBe(shot);
  expect(game.abilities.cast('tension_release', point, true)).toBe(false);
  expect(shot.chainId).toBeNull();
  game.world.dispose();
});

it('Anchor Recall moves only the fixed endpoint and preserves expiry before solver-driven movement', () => {
  const game = setup('skyhook', 'anchor_recall');
  const body = game.world.spawn('rock', { x: 680, y: 400 })!;
  game.abilities.cast('skyhook', point, true);
  const link = game.abilities.tethers[0];
  game.time = 2;
  const destination = { x: 800, y: 450 };
  expect(game.abilities.cast('anchor_recall', destination)).toBe(true);
  expect(link.body.pointB).toEqual(destination);
  expect(body.body.position).toEqual({ x: 680, y: 400 });
  expect(link.expires).toBe(6);
  game.abilities.tick(0);
  game.world.step();
  expect(body.body.position.x).toBeGreaterThan(680);
  expect(game.chains.source(body.chainId)).toBe('anchor_recall');
  game.world.addWall(900, 450, 40, 100);
  expect(game.abilities.cast('anchor_recall', { x: 900, y: 450 }, true)).toBe(false);
  expect(link.body.pointB).toEqual(destination);
  game.world.dispose();
});

it('spin, reverse spin and braking change angular motion while preserving linear momentum', () => {
  const game = setup('torque', 'counter_torque', 'gyroscopic_brake');
  const plate = game.world.spawn('metal_plate', point)!;
  Matter.Body.setVelocity(plate.body, { x: 2, y: 3 });
  game.abilities.cast('torque', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBeCloseTo(0.2);
  expect(Matter.Body.getVelocity(plate.body)).toEqual({ x: 2, y: 3 });
  game.world.step();
  expect(plate.body.angle).toBeGreaterThan(0);
  game.abilities.cast('counter_torque', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBeLessThan(0.01);
  game.abilities.cast('counter_torque', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBeLessThan(-0.19);
  const before = Matter.Body.getVelocity(plate.body);
  game.abilities.cast('gyroscopic_brake', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBe(0);
  expect(Matter.Body.getVelocity(plate.body)).toEqual(before);
  game.world.dispose();
});

it('spin honors angular caps, inertia locks, stationary causality and projectile flight ownership', () => {
  const game = setup('torque', 'gyroscopic_brake');
  const shot = game.world.spawn('projectile', point)!;
  game.abilities.cast('gyroscopic_brake', point, true);
  expect(shot.chainId).toBeNull();
  for (let i = 0; i < 10; i++) game.abilities.cast('torque', point, true);
  expect(Matter.Body.getAngularVelocity(shot.body)).toBeCloseTo(0.3);
  expect(shot.redirected).toBe(false);
  Matter.Body.setInertia(shot.body, Infinity);
  expect(game.abilities.cast('gyroscopic_brake', point, true)).toBe(false);
  expect(game.player.body.inertia).toBe(Infinity);
  game.world.dispose();
});

it('momentum exchange swaps mass times velocity without altering gravity response', () => {
  const game = setup('momentum_exchange');
  const a = game.world.spawn('rock', point)!;
  const b = game.world.spawn('crate', { x: 670, y: 400 })!;
  game.world.setMass(a, 4);
  game.world.setMass(b, 2);
  a.gravityScale = -1;
  Matter.Body.setVelocity(a.body, { x: 3, y: 2 });
  Matter.Body.setVelocity(b.body, { x: -2, y: 1 });
  game.abilities.cast('momentum_exchange', point, true);
  expect(Matter.Body.getVelocity(a.body)).toEqual({ x: -1, y: 0.5 });
  expect(Matter.Body.getVelocity(b.body)).toEqual({ x: 6, y: 4 });
  expect(a.gravityScale).toBe(-1);
  game.world.dispose();
});

it('momentum balance conserves total momentum across different masses and excludes frozen matter', () => {
  const game = setup('momentum_balance');
  const a = game.world.spawn('rock', point)!;
  const b = game.world.spawn('crate', { x: 670, y: 400 })!;
  const frozen = game.world.spawn('heavy', { x: 600, y: 470 })!;
  Matter.Body.setStatic(frozen.body, true);
  game.world.setMass(a, 4);
  game.world.setMass(b, 2);
  Matter.Body.setVelocity(a.body, { x: 6, y: -3 });
  Matter.Body.setVelocity(b.body, { x: -3, y: 6 });
  game.abilities.cast('momentum_balance', point, true);
  expect(Matter.Body.getVelocity(a.body)).toEqual({ x: 3, y: 0 });
  expect(Matter.Body.getVelocity(b.body)).toEqual({ x: 3, y: 0 });
  expect(frozen.chainId).toBeNull();
  game.world.dispose();
});

it('radial redirection preserves speed, skips center and stationary bodies, and reverses with Inward Compass', () => {
  const game = setup('radial_redirect');
  const shot = game.world.spawn('projectile', { x: 700, y: 400 })!;
  const still = game.world.spawn('rock', { x: 600, y: 470 })!;
  const center = game.world.spawn('crate', point)!;
  Matter.Body.setVelocity(shot.body, { x: 0, y: 8 });
  Matter.Body.setVelocity(center.body, { x: 2, y: 0 });
  game.abilities.cast('radial_redirect', point, true);
  expect(Matter.Body.getVelocity(shot.body)).toEqual({ x: 8, y: 0 });
  expect(shot.redirected).toBe(true);
  expect(center.chainId).toBeNull();
  expect(still.chainId).toBeNull();
  new RunBuild(game, 'inward').addRelic('inward_compass');
  game.abilities.cast('radial_redirect', point, true);
  expect(Matter.Body.getVelocity(shot.body)).toEqual({ x: -8, y: 0 });
  game.world.dispose();
});

it('rotation relics modify retention and impulse while Gyroscopic Brake still stops', () => {
  const game = setup('torque', 'gyroscopic_brake');
  const build = new RunBuild(game, 'rotor');
  build.addRelic('reverse_gyro');
  build.addRelic('torsion_spring');
  const plate = game.world.spawn('metal_plate', point)!;
  Matter.Body.setAngularVelocity(plate.body, 0.2);
  game.abilities.cast('torque', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBeCloseTo(0.1);
  game.abilities.cast('gyroscopic_brake', point, true);
  expect(Matter.Body.getAngularVelocity(plate.body)).toBe(0);
  game.world.dispose();
});

it('a rotating plate edge produces a real impact kill and Rotor Dynamo reward', () => {
  const game = setup('torque');
  const build = new RunBuild(game, 'rotating-contact');
  build.addRelic('rotor_dynamo');
  const plate = game.world.spawn('metal_plate', point)!;
  const enemy = game.world.spawn('chaser', { x: 638, y: 435 })!;
  enemy.health = 1;
  game.abilities.cast('torque', point, true);
  expect(Matter.Body.getVelocity(plate.body)).toEqual({ x: 0, y: 0 });
  game.abilities.energy = 0;
  const kills: string[][] = [];
  game.events.on('killed', (event) => kills.push(event.damageTags));
  game.start();
  for (let i = 0; i < 20 && enemy.alive; i++) game.step();
  expect(enemy.alive).toBe(false);
  expect(kills[0]).toContain('Spin');
  expect(game.abilities.stored).toBe(15);
  expect(game.abilities.energy).toBeGreaterThanOrEqual(5);
  game.world.dispose();
});

it('spring harvesting and cut shields only fire after a valid network operation', () => {
  const game = setup('skyhook', 'tether_cut', 'tension_release');
  const build = new RunBuild(game, 'network-triggers');
  build.addRelic('spring_harvester');
  build.addRelic('cutaway_shield');
  game.world.spawn('rock', { x: 740, y: 400 });
  game.start();
  expect(game.castAbility('tension_release', point)).toBe(false);
  expect(game.abilities.stored).toBe(0);
  game.abilities.cast('skyhook', point, true);
  expect(game.castAbility('tension_release', point)).toBe(true);
  expect(game.abilities.stored).toBe(20);
  game.abilities.cast('skyhook', point, true);
  expect(game.castAbility('tether_cut', point)).toBe(true);
  expect(game.player.invulnerability).toBe(0.8);
  game.world.dispose();
});

it('Momentum Escrow checks the post-payment reserve and Redline Bearings checks real core speed', () => {
  const game = setup('momentum_balance', 'torque');
  const build = new RunBuild(game, 'momentum-reserve');
  build.addRelic('momentum_escrow');
  build.addRelic('redline_bearings');
  game.world.spawn('rock', point);
  game.world.spawn('crate', { x: 680, y: 400 });
  game.start();
  game.abilities.energy = 40;
  expect(game.castAbility('momentum_balance', point)).toBe(true);
  expect(game.abilities.energy).toBe(22);
  game.abilities.energy = 20;
  game.abilities.cooldowns.clear();
  expect(game.castAbility('momentum_balance', point)).toBe(false);
  Matter.Body.setVelocity(game.player.body, { x: 6, y: 0 });
  expect(game.castAbility('torque', point)).toBe(true);
  expect(game.abilities.energy).toBeCloseTo(10.4);
  game.world.dispose();
});
