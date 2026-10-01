import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { enemyDefinitions, eliteModifiers, type SpecialEnemy } from '../src/content/enemies';

for (const kind of Object.keys(enemyDefinitions) as SpecialEnemy[])
  it(`${kind} survives a complete behavior cycle with finite physics`, () => {
    const game = new Game(false);
    const entity = game.world.spawn(kind, { x: 700, y: 350 })!;
    game.player.invulnerability = 100;
    game.start();
    for (let i = 0; i < 960; i++) {
      if (i % 120 === 0) game.flip(i % 240 ? { x: 1, y: 0 } : { x: 0, y: -1 });
      game.step();
      for (const body of game.world.entities.values())
        expect(Number.isFinite(body.body.position.x + body.body.position.y)).toBe(true);
    }
    expect(game.gravity.fields.size).toBeLessThanOrEqual(50);
    if (kind === 'anchor') expect(entity.body.position).toEqual({ x: 700, y: 350 });
    game.world.dispose();
  });

it('cleans up enemy fields on death and restores a parasitized host', () => {
  const game = new Game(false);
  const anchor = game.world.spawn('anchor', { x: 700, y: 350 })!;
  const parasite = game.world.spawn('parasite', { x: 600, y: 350 })!;
  game.start();
  game.step();
  expect(anchor.gravityScale).toBe(-1.8);
  game.applyDamage(parasite, 80, game.createCause());
  expect(anchor.gravityScale).toBe(1);
  expect(game.gravity.fields.size).toBe(1);
  game.applyDamage(anchor, 85, game.createCause());
  game.applyDamage(anchor, 85, game.createCause());
  expect(game.gravity.fields.size).toBe(0);
});

it('phase enemies pass through entities but remain bounded by walls', () => {
  const game = new Game(false);
  const entity = game.world.spawn('phase', { x: 1110, y: 350 })!;
  entity.life = 2.1;
  game.start();
  Matter.Body.setVelocity(entity.body, { x: 18, y: 0 });
  for (let i = 0; i < 30; i++) game.step();
  expect(entity.body.position.x).toBeLessThan(1150);
  expect(entity.gravityScale).toBe(0);
  expect(entity.body.collisionFilter.mask).toBe(1);
});

for (const modifier of eliteModifiers)
  it(`${modifier} elites apply rules without leaking fields after death`, () => {
    const game = new Game(false);
    const entity = game.world.spawn('chaser', { x: 700, y: 350 })!;
    game.enemies.setElite(entity, modifier);
    game.start();
    game.step();
    if (modifier === 'heavy') expect(entity.body.mass).toBe(10);
    if (modifier === 'inverted') expect(entity.gravityScale).toBe(-1);
    if (modifier === 'anchor') expect(entity.body.isStatic).toBe(true);
    game.applyDamage(entity, 85, game.createCause());
    expect(entity.alive).toBe(false);
    expect(
      [...game.gravity.fields.values()].filter((field) => field.source === `enemy:${entity.id}`),
    ).toHaveLength(0);
  });
