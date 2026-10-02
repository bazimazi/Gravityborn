import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { abilityById } from '../src/content/abilities';
import { validateAbilities } from '../src/content/validate';

const point = { x: 600, y: 400 };
function setup(...ids: string[]) {
  const game = new Game(false);
  game.gravity.strength = 0;
  for (const id of ids) game.abilities.learn(id);
  return game;
}

it('coatings compose per property and restore previous coatings and updated base values', () => {
  const game = setup('elastic_coat', 'deadening_foam');
  const rock = game.world.spawn('rock', point)!;
  game.abilities.cast('elastic_coat', point, true);
  game.abilities.cast('deadening_foam', point, true);
  expect(rock.body.restitution).toBe(0);
  expect(rock.body.friction).toBe(0.8);
  game.world.setSurface(rock, 'restitution', 0.9);
  expect(rock.body.restitution).toBe(0);
  game.time = 4.1;
  game.abilities.tick(0);
  expect(rock.body.restitution).toBe(1.05);
  expect(rock.body.frictionAir).toBe(0);
  expect(rock.body.friction).toBe(rock.surfaceBase.friction);
  game.time = 5.1;
  game.abilities.tick(0);
  expect(rock.body.restitution).toBe(0.9);
  expect(rock.surfaceOverrides.size).toBe(0);
  game.world.dispose();
});

it('refreshing the same coat changes precedence without duplicate expiry entries', () => {
  const game = setup('elastic_coat', 'deadening_foam');
  const rock = game.world.spawn('rock', point)!;
  game.abilities.cast('elastic_coat', point, true);
  game.abilities.cast('deadening_foam', point, true);
  game.time = 2;
  game.abilities.cast('elastic_coat', point, true);
  expect(rock.body.restitution).toBe(1.05);
  expect(rock.body.friction).toBe(0.8);
  game.time = 5.1;
  game.abilities.tick(0);
  expect(rock.body.restitution).toBe(1.05);
  game.time = 7.1;
  game.abilities.tick(0);
  expect(rock.body.restitution).toBe(rock.surfaceBase.restitution);
  game.world.dispose();
});

it('expiry during boss stasis restores the physical base after unlock', () => {
  const game = setup('elastic_coat');
  const rock = game.world.spawn('rock', point)!;
  game.abilities.cast('elastic_coat', point, true);
  Matter.Body.setStatic(rock.body, true);
  game.time = 6;
  game.abilities.tick(0);
  expect(rock.surfacePending).toBe(true);
  Matter.Body.setStatic(rock.body, false);
  game.world.step();
  expect(rock.body.restitution).toBe(rock.surfaceBase.restitution);
  expect(rock.body.frictionAir).toBe(rock.surfaceBase.frictionAir);
  game.world.dispose();
});

it('lock release retains live coatings and recycled shots reset all surface properties', () => {
  const game = setup('vacuum_polish', 'lock');
  const shot = game.world.spawn('projectile', point)!;
  game.abilities.cast('vacuum_polish', point, true);
  game.abilities.cast('lock', point, true);
  game.time = 2;
  game.abilities.tick(0);
  expect(shot.body.isStatic).toBe(false);
  expect(shot.body.friction).toBe(0);
  game.world.remove(shot);
  const recycled = game.world.spawn('projectile', point)!;
  expect(recycled).toBe(shot);
  expect(recycled.body.friction).toBe(0.05);
  expect(recycled.body.frictionStatic).toBe(0.5);
  game.time = 6;
  game.abilities.tick(0);
  expect(recycled.body.frictionAir).toBe(recycled.definition.frictionAir);
  expect(recycled.surfaceOverrides.size).toBe(0);
  game.world.dispose();
});

it('strong drag slows actual solver motion while polish preserves momentum', () => {
  const speeds: number[] = [];
  for (const id of ['vacuum_polish', 'inertia_tar']) {
    const game = setup(id);
    const rock = game.world.spawn('rock', point)!;
    Matter.Body.setVelocity(rock.body, { x: 6, y: 0 });
    game.abilities.cast(id, point, true);
    for (let i = 0; i < 30; i++) game.world.step();
    speeds.push(Matter.Body.getVelocity(rock.body).x);
    game.world.dispose();
  }
  expect(speeds[0]).toBeCloseTo(6);
  expect(speeds[1]).toBeGreaterThan(0);
  expect(speeds[1]).toBeLessThan(speeds[0] * 0.2);
});

it('elastic coating produces a stronger real wall rebound within the velocity limit', () => {
  const rebounds: number[] = [];
  for (const coated of [false, true]) {
    const game = setup('elastic_coat');
    const rock = game.world.spawn('rock', point)!;
    game.world.addWall(700, 400, 20, 300);
    game.world.setSurface(rock, 'frictionAir', 0);
    if (coated) game.abilities.cast('elastic_coat', point, true);
    Matter.Body.setVelocity(rock.body, { x: 6, y: 0 });
    for (let i = 0; i < 40; i++) game.world.step();
    rebounds.push(Matter.Body.getVelocity(rock.body).x);
    game.world.dispose();
  }
  expect(rebounds[0]).toBeLessThan(0);
  expect(rebounds[1]).toBeLessThan(rebounds[0]);
  expect(Math.abs(rebounds[1])).toBeLessThanOrEqual(18);
});

it('surface filters select metal, projectiles or the core and reject empty casts without payment', () => {
  const game = setup('magnetic_grease', 'shot_drag', 'glass_spring');
  expect(game.abilities.cast('shot_drag', point)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  const rock = game.world.spawn('rock', point)!;
  const metal = game.world.spawn('metal_plate', { x: 650, y: 400 })!;
  const shot = game.world.spawn('projectile', { x: 610, y: 450 })!;
  game.abilities.cast('magnetic_grease', point, true);
  expect(metal.body.frictionAir).toBe(0);
  expect(rock.surfaceOverrides.size).toBe(0);
  game.abilities.cast('shot_drag', point, true);
  expect(shot.body.frictionAir).toBe(0.12);
  expect(shot.redirected).toBe(false);
  game.abilities.cast('glass_spring', point, true);
  expect(game.player.body.restitution).toBe(1.05);
  expect(rock.surfaceOverrides.size).toBe(0);
  game.world.dispose();
});

it('split moons inherit coatings without extending expiry and redundant coats do not steal credit', () => {
  const game = setup('planet', 'planet_split', 'elastic_coat');
  game.abilities.cast('planet', point, true);
  const parent = [...game.world.entities.values()].find((e) => e.kind === 'rock')!;
  game.abilities.cast('elastic_coat', point, true);
  game.markCause(parent, game.createCause('pulse'));
  game.abilities.cast('elastic_coat', point, true);
  expect(game.chains.source(parent.chainId)).toBe('pulse');
  game.time = 2;
  game.abilities.cast('planet_split', point, true);
  const moons = [...game.world.entities.values()].filter((e) => e.kind === 'fragment');
  expect(moons).toHaveLength(2);
  for (const moon of moons) expect(moon.body.restitution).toBe(1.05);
  game.time = 5.1;
  game.abilities.tick(0);
  for (const moon of moons) expect(moon.body.restitution).toBe(parent.surfaceBase.restitution);
  game.world.dispose();
});

it('content validation rejects unknown, unbounded and misplaced surface properties', () => {
  const definition = structuredClone(abilityById.get('elastic_coat')!);
  expect(validateAbilities([definition])).toEqual([]);
  definition.parameters!.surface!.restitution = 9;
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
  definition.parameters!.surface = { frictionAir: NaN };
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
  definition.parameters!.surface = {};
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
  definition.effect = 'impulse';
  definition.parameters!.surface = { frictionAir: 0 };
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
});
