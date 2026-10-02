import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { abilityById } from '../src/content/abilities';
import { validateAbilities } from '../src/content/validate';

function cast(id: string, point = { x: 800, y: 400 }) {
  const game = new Game(false);
  Matter.Body.setPosition(game.player.body, { x: 300, y: 400 });
  game.abilities.learn(id);
  expect(game.abilities.cast(id, point)).toBe(true);
  return game;
}

it('pulsing fields reverse actual acceleration on their authored clock', () => {
  const game = cast('pulsing_well');
  game.gravity.strength = 0;
  const point = { x: 900, y: 400 };
  expect(game.gravity.sample(point).x).toBeLessThan(0);
  game.time = 1;
  game.abilities.tick(1);
  expect(game.gravity.sample(point).x).toBeGreaterThan(0);
  game.time = 2;
  game.abilities.tick(1);
  expect(game.gravity.sample(point).x).toBeLessThan(0);
  game.time = 6;
  game.abilities.tick(4);
  expect(game.gravity.fields.size).toBe(0);
  game.world.dispose();
});

it('growing and shrinking fields update spatial queries and only claim bodies inside their current influence', () => {
  const game = cast('zero_bloom');
  const rock = game.world.spawn('rock', { x: 1000, y: 400 })!;
  game.abilities.tick(0);
  expect(game.gravity.sample(rock.body.position).y).toBeGreaterThan(0);
  expect(rock.chainId).toBeNull();
  game.time = 4.5;
  game.abilities.tick(4.5);
  expect(game.gravity.sample(rock.body.position)).toEqual({ x: 0, y: 0 });
  expect(game.chains.source(rock.chainId)).toBe('zero_bloom');
  const shrinking = cast('contracting_well');
  const sample = { x: 1050, y: 400 };
  expect(shrinking.gravity.sample(sample).x).toBeLessThan(0);
  shrinking.time = 4;
  shrinking.abilities.tick(4);
  expect(shrinking.gravity.sample(sample).x).toBe(0);
  game.world.dispose();
  shrinking.world.dispose();
});

it('the dipole drives matter through its gap and multi-source casts reserve the complete field budget', () => {
  const game = cast('dipole');
  expect(game.gravity.fields.size).toBe(2);
  expect(game.gravity.sample({ x: 800, y: 400 }).x).toBeGreaterThan(0);
  const baseline = [...game.gravity.fields.values()][0];
  for (let i = 0; i < 45; i++)
    game.gravity.addField({ ...baseline, source: 'budget', position: { x: 50, y: 50 } });
  game.abilities.learn('quadrupole');
  const energy = game.abilities.energy;
  expect(game.abilities.cast('quadrupole', { x: 800, y: 400 })).toBe(false);
  expect(game.gravity.fields.size).toBe(47);
  expect(game.abilities.energy).toBe(energy);
  expect(game.abilities.cooldowns.has('quadrupole')).toBe(false);
  game.world.dispose();
});

it('orbiting sources follow their core and rotate independently of global gravity', () => {
  const game = cast('orbital_lantern');
  const field = [...game.gravity.fields.values()][0];
  expect(field.position).toEqual({ x: 410, y: 400 });
  Matter.Body.setPosition(game.player.body, { x: 500, y: 500 });
  game.time = Math.PI / 4;
  game.abilities.tick(game.time);
  expect(field.position.x).toBeCloseTo(500);
  expect(field.position.y).toBeCloseTo(610);
  expect(game.gravity.direction).toEqual({ x: 0, y: 1 });
  const sweep = cast('sweeping_current');
  sweep.time = 0.5;
  sweep.abilities.tick(0.5);
  const direction = [...sweep.gravity.fields.values()][0].direction;
  expect(direction.x).toBeCloseTo(0);
  expect(direction.y).toBeCloseTo(1);
  game.world.dispose();
  sweep.world.dispose();
});

it('returning field paths are independent of tick size and retain their force direction on return', () => {
  const a = cast('return_wave');
  const b = cast('return_wave');
  a.time = 3;
  a.abilities.tick(3);
  for (let i = 1; i <= 360; i++) {
    b.time = i / 120;
    b.abilities.tick(1 / 120);
  }
  const af = [...a.gravity.fields.values()][0];
  const bf = [...b.gravity.fields.values()][0];
  expect(af.position).toEqual({ x: 480, y: 400 });
  expect(af.position).toEqual(bf.position);
  expect(af.direction).toEqual({ x: 1, y: 0 });
  a.world.dispose();
  b.world.dispose();
});

it('attached fields follow existing matter and cannot follow a recycled projectile generation', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 800, y: 400 })!;
  game.abilities.learn('gravity_brand');
  game.abilities.cast('gravity_brand', shot.body.position);
  const field = [...game.gravity.fields.values()][0];
  Matter.Body.setPosition(shot.body, { x: 850, y: 450 });
  game.abilities.tick(0);
  expect(field.position).toEqual(shot.body.position);
  game.world.remove(shot);
  expect(game.world.spawn('projectile', { x: 800, y: 400 })).toBe(shot);
  game.abilities.tick(0);
  expect(game.gravity.fields.size).toBe(0);
  game.world.dispose();
});

it('attachment failure is free and magnetic satellites leave stone unaffected', () => {
  const empty = new Game(false);
  empty.abilities.learn('gravity_brand');
  expect(empty.abilities.cast('gravity_brand', { x: 800, y: 400 })).toBe(false);
  expect(empty.abilities.energy).toBe(100);
  expect(empty.abilities.cooldowns.size).toBe(0);
  const satellites = cast('metal_satellites');
  const point = { x: 950, y: 400 };
  expect(satellites.gravity.sample(point, 1, ['metal']).x).toBeLessThan(0);
  expect(satellites.gravity.sample(point, 1, ['stone']).x).toBe(0);
  empty.world.dispose();
  satellites.world.dispose();
});

it('invalid field programs cannot bypass authored limits or attach to incompatible effects', () => {
  const definition = abilityById.get('pulsing_well')!;
  for (const parameters of [
    { fieldCount: 5 },
    { radiusStart: 0 },
    { strengthPeriod: -1 },
    { returning: true },
    { attach: true, travelSpeed: 10 },
    { orbitSpeed: Infinity },
  ]) {
    expect(validateAbilities([{ ...definition, parameters }]).length).toBeGreaterThan(0);
  }
  expect(validateAbilities([{ ...definition, mode: 'zero' }]).length).toBeGreaterThan(0);
  expect(validateAbilities([{ ...definition, effect: 'impulse' }]).length).toBeGreaterThan(0);
});
