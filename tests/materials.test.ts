import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import balance from '../src/data/balance.json';

function chamber(): Game {
  const game = new Game(false);
  game.reset(false, { ...game.room, walls: [], manualCompletion: true });
  game.start();
  game.gravity.strength = 0;
  return game;
}
it('electrical discharge follows metal relays and credits the initiating power', () => {
  const game = chamber();
  const cell = game.world.spawn('energy_cell', { x: 500, y: 350 })!;
  game.world.spawn('metal_plate', { x: 620, y: 350 });
  game.world.spawn('metal_plate', { x: 710, y: 350 });
  const target = game.world.spawn('shooter', { x: 800, y: 350 })!;
  target.health = 20;
  const kills: string[] = [];
  game.events.on('killed', (event) => {
    if (event.kind === 'shooter') kills.push(event.source);
  });
  game.applyDamage(cell, 30, game.createCause('well'));
  game.materials.tick();
  expect(target.alive).toBe(false);
  expect(kills).toEqual(['well']);
  expect(target.chainDepth).toBe(4);
});
it('insulating gaps and solid walls interrupt conductive chains', () => {
  for (const barrier of ['rubber', 'wall']) {
    const game = chamber();
    const cell = game.world.spawn('energy_cell', { x: 500, y: 350 })!;
    game.world.spawn('metal_plate', { x: 620, y: 350 });
    if (barrier === 'rubber') game.world.spawn('rubber', { x: 710, y: 350 });
    else {
      game.world.spawn('metal_plate', { x: 710, y: 350 });
      game.world.addWall(755, 350, 10, 160);
    }
    const target = game.world.spawn('shooter', { x: 800, y: 350 })!;
    game.applyDamage(cell, 30, game.createCause());
    game.materials.tick();
    expect(target.health).toBe(target.maxHealth);
  }
});
it('explosions ignite fuel, fire follows contact, and ice extinguishes it', () => {
  const game = chamber();
  const barrel = game.world.spawn('barrel', { x: 500, y: 350 })!;
  const crate = game.world.spawn('crate', { x: 650, y: 350 })!;
  const second = game.world.spawn('crate', { x: 850, y: 350 })!;
  const ice = game.world.spawn('ice', { x: 1000, y: 350 })!;
  game.markCause(barrel, game.createCause('flip'));
  game.detonate(barrel);
  game.step();
  expect(game.materials.isBurning(crate)).toBe(true);
  game.materials.collide(crate, second);
  expect(game.materials.isBurning(second)).toBe(true);
  game.materials.collide(second, ice);
  expect(game.materials.isBurning(second)).toBe(false);
  expect(ice.health).toBe(ice.maxHealth - balance.materials.meltDamage);
  expect(second.chainId).toBe(crate.chainId);
});
it('burning waits while paused and produces an attributed barrel explosion', () => {
  const game = chamber();
  const barrel = game.world.spawn('barrel', { x: 700, y: 350 })!;
  let explosions = 0;
  const chain = game.createCause('pulse');
  game.events.on('explosion', (event) => {
    if (event.chainId === chain) explosions++;
  });
  game.materials.ignite(barrel, chain, 2);
  game.pause();
  for (let i = 0; i < 600; i++) game.step();
  expect(barrel.health).toBe(barrel.maxHealth);
  game.resume();
  for (let i = 0; i < 600 && barrel.alive; i++) game.step();
  expect(barrel.alive).toBe(false);
  expect(explosions).toBe(1);
  game.reset(false);
  expect(game.materials.isBurning(barrel)).toBe(false);
});
it('material propagation respects depth and per-frame arc limits', () => {
  const game = chamber();
  const crate = game.world.spawn('crate', { x: 500, y: 350 })!;
  game.materials.ignite(crate, game.createCause(), balance.combat.maxChainDepth + 1);
  expect(game.materials.isBurning(crate)).toBe(false);
  const cell = game.world.spawn('energy_cell', { x: 600, y: 350 })!;
  for (let i = 0; i < 40; i++) game.world.spawn('metal_plate', { x: 600 + i, y: 370 });
  let arcs = 0;
  game.events.on('materialReaction', (event) => {
    if (event.kind === 'arc') arcs++;
  });
  game.applyDamage(cell, 30, game.createCause());
  game.materials.tick();
  expect(arcs).toBe(balance.materials.maxArcs);
  game.materials.tick();
  expect(arcs).toBe(balance.materials.maxArcs);
});
