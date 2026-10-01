import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';

it('drops physical XP and shards, then collects them through contact exactly once', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('resources');
  run.phase = 'room';
  const victim = game.world.spawn('chaser', { x: 700, y: 350 })!;
  game.world.spawn('heavy', { x: 1000, y: 350 });
  game.start();
  game.applyDamage(victim, 85, game.createCause('pulse'));
  expect(run.build.xp).toBe(0);
  expect(run.build.currency).toBe(0);
  const xp = [...game.world.entities.values()].find((entity) => entity.kind === 'xp')!;
  const shard = [...game.world.entities.values()].find((entity) => entity.kind === 'shard')!;
  expect(xp.body.mass).toBeLessThan(1);
  expect(xp.value).toBeGreaterThan(0);
  Matter.Body.setPosition(xp.body, { ...game.player.body.position });
  Matter.Body.setPosition(shard.body, { ...game.player.body.position });
  game.step();
  expect(run.build.xp).toBe(xp.value);
  expect(run.build.currency).toBe(5);
  game.step();
  expect(run.build.currency).toBe(5);
  expect(xp.alive).toBe(false);
});
it('gravity vacuum pulls a resource across the room without collecting it remotely', () => {
  const game = new Game(false);
  game.world.spawn('heavy', { x: 1000, y: 350 });
  const xp = game.world.spawn('xp', { x: 460, y: 470 })!;
  xp.value = 20;
  game.abilities.learn('vacuum');
  game.start();
  game.gravity.strength = 0;
  game.castAbility('vacuum', game.player.body.position);
  game.step();
  expect(xp.body.velocity.x).toBeLessThan(0);
  expect(xp.alive).toBe(true);
});
it('magnetic fields attract metal while leaving stone unaffected', () => {
  const game = new Game(false);
  const magnet = game.world.spawn('magnet', { x: 600, y: 350 })!;
  game.gravity.strength = 0;
  game.objects.update(magnet);
  expect(game.gravity.sample({ x: 650, y: 350 }, 1, ['metal']).x).toBeLessThan(0);
  expect(game.gravity.sample({ x: 650, y: 350 }, 1, ['stone'])).toEqual({ x: 0, y: 0 });
});
it('destroying a crystal removes its field and breaking an energy cell recharges the core', () => {
  const game = new Game(false);
  const crystal = game.world.spawn('crystal', { x: 500, y: 350 })!;
  game.objects.update(crystal);
  expect(game.gravity.fields.size).toBe(1);
  game.applyDamage(crystal, 85, game.createCause());
  expect(game.gravity.fields.size).toBe(0);
  const cell = game.world.spawn('energy_cell', { ...game.player.body.position })!;
  game.abilities.energy = 20;
  game.applyDamage(cell, 85, game.createCause());
  expect(game.abilities.energy).toBe(55);
});
it('armed mines react to nearby hostiles and remain part of explosion chains', () => {
  const game = new Game(false);
  const mine = game.world.spawn('mine', { x: 700, y: 350 })!;
  game.world.spawn('heavy', { x: 740, y: 350 });
  mine.life = 2;
  let explosions = 0;
  game.events.on('explosion', () => explosions++);
  game.start();
  game.step();
  expect(mine.alive).toBe(false);
  expect(explosions).toBe(1);
});

it('crushes an immobile anchor with sustained gravity pressure from a rock', () => {
  const game = new Game(false);
  const anchor = game.world.spawn('anchor', { x: 1050, y: 350 })!;
  game.world.spawn('rock', { x: 998, y: 350 });
  game.start();
  game.createWell(anchor.body.position);
  for (let i = 0; i < 600 && anchor.alive; i++) game.step();
  expect(anchor.alive).toBe(false);
});
