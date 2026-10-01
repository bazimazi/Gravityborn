import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import balance from '../src/data/balance.json';

it('body response effects stack independently, preserve existing inversion and expire separately', () => {
  const game = new Game(false);
  const rock = game.world.spawn('rock', { x: 600, y: 400 })!;
  const anchor = game.world.spawn('anchor', { x: 640, y: 400 })!;
  rock.gravityScale = -1;
  game.start();
  for (const id of ['polarity', 'resonance_mark', 'phase_pocket']) game.abilities.learn(id);
  expect(game.castAbility('polarity', rock.body.position)).toBe(true);
  expect(rock.gravityScale).toBe(1);
  expect(anchor.chainId).toBeNull();
  expect(game.castAbility('resonance_mark', rock.body.position)).toBe(true);
  expect(rock.gravityScale).toBe(2);
  expect(game.castAbility('phase_pocket', rock.body.position)).toBe(true);
  expect(rock.gravityScale).toBe(0);
  game.time = 3.1;
  game.abilities.tick(0);
  expect(rock.gravityScale).toBe(2);
  game.time = 4.1;
  game.abilities.tick(0);
  expect(rock.gravityScale).toBe(-2);
  game.time = 5.1;
  game.abilities.tick(0);
  expect(rock.gravityScale).toBe(-1);
  expect(rock.gravityFactors.size).toBe(0);
  game.world.dispose();
});

it('response recasts refresh one factor and never affect a recycled projectile generation', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 600, y: 400 })!;
  game.abilities.learn('polarity');
  game.abilities.cast('polarity', shot.body.position, true);
  game.time = 2;
  game.abilities.cast('polarity', shot.body.position, true);
  expect(shot.gravityFactors.size).toBe(1);
  game.time = 4.1;
  game.abilities.tick(0);
  expect(shot.gravityScale).toBe(-1);
  game.world.remove(shot);
  const replacement = game.world.spawn('projectile', { x: 600, y: 400 })!;
  expect(replacement).toBe(shot);
  replacement.gravityFactors.set('test', 0.5);
  game.time = 6.1;
  game.abilities.tick(0);
  expect(replacement.gravityScale).toBe(0.5);
  game.world.dispose();
});

it('kinetic powers change real velocities and credit only bodies whose motion changes', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 600, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 650, y: 400 })!;
  game.start();
  Matter.Body.setVelocity(shot.body, { x: 10, y: -4 });
  game.abilities.learn('kinetic_brake');
  game.abilities.learn('counterthrow');
  expect(game.castAbility('kinetic_brake', shot.body.position)).toBe(true);
  expect(Matter.Body.getVelocity(shot.body).x).toBeCloseTo(1.5);
  expect(Matter.Body.getVelocity(shot.body).y).toBeCloseTo(-0.6);
  expect(game.chains.source(shot.chainId)).toBe('kinetic_brake');
  expect(rock.chainId).toBeNull();
  expect(game.castAbility('counterthrow', shot.body.position)).toBe(true);
  expect(Matter.Body.getVelocity(shot.body).x).toBeCloseTo(-1.8);
  expect(Matter.Body.getVelocity(shot.body).y).toBeCloseTo(0.72);
  expect(game.chains.source(shot.chainId)).toBe('counterthrow');
  game.world.dispose();
});

it('physical tethers pull bodies together, carry attribution and remove constraints on expiry', () => {
  const game = new Game(false);
  game.gravity.strength = 0;
  const a = game.world.spawn('rock', { x: 650, y: 400 })!;
  const b = game.world.spawn('rock', { x: 850, y: 400 })!;
  game.abilities.learn('tether');
  game.start();
  expect(game.castAbility('tether', { x: 750, y: 400 })).toBe(true);
  expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(1);
  for (let step = 0; step < 60; step++) {
    game.abilities.tick(1 / 120);
    game.world.step();
  }
  expect(Math.abs(a.body.position.x - b.body.position.x)).toBeLessThan(160);
  expect(game.chains.source(a.chainId)).toBe('tether');
  expect(game.chains.source(b.chainId)).toBe('tether');
  game.time = 4.1;
  game.abilities.tick(0);
  expect(game.abilities.tethers).toHaveLength(0);
  expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(0);
  game.world.dispose();
});

it('tethers preflight target and link budgets; dead or recycled endpoints break their links', () => {
  const game = new Game(false);
  game.abilities.learn('tether');
  game.start();
  const a = game.world.spawn('projectile', { x: 650, y: 400 })!;
  expect(game.castAbility('tether', a.body.position)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  game.world.spawn('rock', { x: 800, y: 400 });
  for (let index = 0; index < balance.physics.maxTethers; index++)
    expect(game.abilities.cast('tether', a.body.position, true)).toBe(true);
  expect(game.castAbility('tether', a.body.position)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  expect(game.abilities.cooldowns.has('tether')).toBe(false);
  game.world.remove(a);
  game.world.spawn('projectile', { x: 650, y: 400 });
  game.abilities.tick(0);
  expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(0);
  expect(game.abilities.tethers).toHaveLength(0);
  game.world.dispose();
});

it('Constellation links four targets and evolution uses the new catalog entries', () => {
  const game = new Game(false);
  for (let index = 0; index < 4; index++) game.world.spawn('rock', { x: 550 + index * 70, y: 350 });
  for (let level = 0; level < 3; level++) game.abilities.learn('tether');
  expect(game.abilities.learn('tether')).toBe('constellation');
  expect(game.abilities.cast('constellation', { x: 650, y: 350 })).toBe(true);
  expect(game.abilities.tethers).toHaveLength(3);
  game.world.dispose();
});
