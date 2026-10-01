import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';

it('summoned constructs reject walls and outside-arena points without spending or partial spawning', () => {
  for (const id of ['planet', 'binary', 'beacon', 'orbital_engine']) {
    const game = new Game(false);
    game.abilities.learn(id);
    game.start();
    const count = game.world.entities.size;
    let casts = 0;
    let causes = 0;
    game.events.on('abilityUsed', () => casts++);
    const create = game.createCause.bind(game);
    game.createCause = (source) => {
      causes++;
      return create(source);
    };
    game.world.addWall(700, 400, 30, 200);
    // Binary's right body collides even though its central aim is clear.
    const wallTarget = { x: id === 'binary' ? 645 : 700, y: 400 };
    for (const target of [
      wallTarget,
      { x: -100, y: 400 },
      { x: 1300, y: 400 },
      { x: 600, y: 900 },
    ]) {
      expect(game.castAbility(id, target)).toBe(false);
      expect(game.abilities.energy).toBe(100);
      expect(game.abilities.cooldowns.has(id)).toBe(false);
      expect(game.world.entities.size).toBe(count);
      expect(game.gravity.fields.size).toBe(0);
    }
    expect(casts).toBe(0);
    expect(causes).toBe(0);
    expect(game.castAbility(id, { x: 500, y: 400 })).toBe(true);
    expect(casts).toBe(1);
    expect(causes).toBe(1);
    game.world.dispose();
  }
});

it('clearance follows rotated and moving walls and static seals without phantom bodies', () => {
  const game = new Game(false);
  game.world.addWall(750, 400, 200, 20);
  const wall = game.world.walls.at(-1)!;
  Matter.Body.rotate(wall, Math.PI / 4);
  // Both points lie in the wall AABB; only the first overlaps the actual polygon.
  expect(game.world.circleClear({ x: 790, y: 440 }, 10)).toBe(false);
  expect(game.world.circleClear({ x: 790, y: 350 }, 10)).toBe(true);
  Matter.Body.setPosition(wall, { x: 1000, y: 400 });
  expect(game.world.circleClear({ x: 790, y: 440 }, 10)).toBe(true);
  const seal = game.world.spawn('rift_seal', { x: 750, y: 500 })!;
  expect(game.world.circleClear(seal.body.position, 25)).toBe(false);
  game.world.remove(seal);
  expect(game.world.circleClear({ x: 750, y: 500 }, 25)).toBe(true);
  expect(game.world.circleClear({ x: NaN, y: 500 }, 25)).toBe(false);
  game.world.dispose();
});
