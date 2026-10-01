import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { regions } from '../src/content/regions';
import { enemyDefinitions, enemyDescriptions } from '../src/content/enemies';

it('Lancer warns before launching toward the captured position, including after a skipped window', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('lancer', { x: 800, y: 400 })!;
  Matter.Body.setPosition(game.player.body, { x: 400, y: 400 });
  game.enemies.update(enemy);
  game.time = 2;
  game.enemies.update(enemy);
  expect(enemy.body.speed).toBe(0);
  game.time = 2.2;
  game.enemies.update(enemy);
  expect(enemy.attackAim).toEqual({ x: 400, y: 400 });
  Matter.Body.setPosition(game.player.body, { x: 800, y: 700 });
  game.time = 2.8;
  game.enemies.update(enemy);
  expect(enemy.body.velocity.x).toBe(-13);
  expect(enemy.body.velocity.y).toBe(0);
  expect(game.chains.source(enemy.chainId)).toBe('enemy');
  game.world.dispose();
});

it('Flux Mite composes alternating gravity with external inversion while remaining solid', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('flux_mite', { x: 800, y: 400 })!;
  enemy.gravityFactors.set('external', -1);
  game.enemies.update(enemy);
  expect(enemy.gravityScale).toBe(-1);
  enemy.life = 1.6;
  game.enemies.update(enemy);
  expect(enemy.gravityScale).toBe(1);
  expect(enemy.body.collisionFilter.mask).toBe(0xffffffff);
  enemy.life = 3.1;
  game.enemies.update(enemy);
  expect(enemy.gravityScale).toBe(-1);
  game.world.dispose();
});

it('Magnetic Sentinel reverses the same metal-only field and cleans it up on death', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('magnetic_sentinel', { x: 800, y: 400 })!;
  const position = { x: 900, y: 400 };
  game.enemies.update(enemy);
  expect(game.gravity.sample(position, 1, ['metal']).x).toBeLessThan(0);
  expect(game.gravity.sample(position, 1, ['stone']).x).toBe(0);
  enemy.life = 3.1;
  game.enemies.update(enemy);
  expect(game.gravity.fields.size).toBe(1);
  expect(game.gravity.sample(position, 1, ['metal']).x).toBeGreaterThan(0);
  enemy.health = 1;
  game.applyDamage(enemy, 10, game.createCause());
  expect(game.gravity.fields.size).toBe(0);
  game.world.dispose();
});

it('Brood Husk releases protected offspring on death and respects the shared brood limit', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('splitter', { x: 800, y: 400 })!;
  game.applyDamage(enemy, 85, game.createCause());
  let brood = [...game.world.entities.values()].filter((entity) => entity.kind === 'swarm');
  expect(brood).toHaveLength(2);
  expect(brood.every((child) => child.invulnerability > 0)).toBe(true);
  for (let i = brood.length; i < 15; i++) game.world.spawn('swarm', { x: 600, y: 300 });
  const second = game.world.spawn('splitter', { x: 800, y: 400 })!;
  game.applyDamage(second, 85, game.createCause());
  brood = [...game.world.entities.values()].filter((entity) => entity.kind === 'swarm');
  expect(brood).toHaveLength(16);
  const third = game.world.spawn('splitter', { x: 800, y: 400 })!;
  game.applyDamage(third, 85, game.createCause());
  expect(
    [...game.world.entities.values()].filter((entity) => entity.kind === 'swarm'),
  ).toHaveLength(16);
  game.world.dispose();
});

it('Momentum Broker visibly marks loose matter then exchanges actual velocities', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('momentum_broker', { x: 800, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 730, y: 400 })!;
  Matter.Body.setVelocity(enemy.body, { x: 2, y: -3 });
  Matter.Body.setVelocity(rock.body, { x: -7, y: 4 });
  game.enemies.update(enemy);
  game.time = 0.8;
  game.enemies.update(enemy);
  expect(enemy.attackAim).toEqual(rock.body.position);
  game.time = 1.3;
  game.enemies.update(enemy);
  expect(enemy.body.velocity).toEqual({ x: -7, y: 4 });
  expect(rock.body.velocity).toEqual({ x: 2, y: -3 });
  expect(game.chains.source(rock.chainId)).toBe('enemy');
  expect(enemy.attackAim).toBeUndefined();
  game.world.dispose();
});

it('Momentum Broker cannot exchange with an escaped mark or attack without warning', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('momentum_broker', { x: 800, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 730, y: 400 })!;
  Matter.Body.setVelocity(rock.body, { x: 7, y: 0 });
  game.enemies.update(enemy);
  game.time = 2;
  game.enemies.update(enemy);
  expect(enemy.body.speed).toBe(0);
  game.time = 5.6;
  game.enemies.update(enemy);
  expect(enemy.attackAim).toBeDefined();
  Matter.Body.setPosition(rock.body, { x: 300, y: 400 });
  game.time = 6.1;
  game.enemies.update(enemy);
  expect(enemy.body.speed).toBe(0);
  expect(rock.body.velocity.x).toBe(7);
  game.world.dispose();
});

it('Barricade Weaver creates at most three movable plates, replenishing only destroyed ones', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('cratewright', { x: 800, y: 400 })!;
  Matter.Body.setPosition(game.player.body, { x: 300, y: 400 });
  game.enemies.update(enemy);
  const plates = () =>
    [...game.world.entities.values()].filter((entity) => entity.kind === 'metal_plate');
  for (let i = 0; i < 4; i++) {
    game.time = 1.3 + 5.1 * i;
    game.enemies.update(enemy);
    if (i < 3) Matter.Body.setPosition(plates()[i].body, { x: 450, y: 150 + i * 160 });
  }
  expect(plates()).toHaveLength(3);
  expect(plates().every((plate) => !plate.body.isStatic && plate.ownerId === enemy.id)).toBe(true);
  game.world.remove(plates()[0]);
  game.time = 22;
  game.enemies.update(enemy);
  expect(plates()).toHaveLength(3);
  enemy.health = 1;
  game.applyDamage(enemy, 10, game.createCause());
  expect(plates()).toHaveLength(3);
  game.world.dispose();
});

it('Barricade Weaver cannot build on occupied space', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('cratewright', { x: 800, y: 400 })!;
  Matter.Body.setPosition(game.player.body, { x: 300, y: 400 });
  game.world.spawn('rock', { x: 690, y: 400 });
  game.enemies.update(enemy);
  game.time = 1.3;
  game.enemies.update(enemy);
  expect([...game.world.entities.values()].some((entity) => entity.kind === 'metal_plate')).toBe(
    false,
  );
  game.world.dispose();
});

it('all 25 base enemies have regional encounters and counterplay descriptions', () => {
  const kinds = ['chaser', 'shooter', 'heavy', ...Object.keys(enemyDefinitions)];
  expect(kinds).toHaveLength(25);
  for (const kind of kinds) {
    expect(
      regions.some((region) => region.enemies.includes(kind as keyof typeof enemyDefinitions)),
    ).toBe(true);
    expect(enemyDescriptions[kind as keyof typeof enemyDescriptions]?.length).toBeGreaterThan(40);
  }
});
