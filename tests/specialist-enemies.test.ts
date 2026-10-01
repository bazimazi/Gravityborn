import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { regions } from '../src/content/regions';
import { codexView } from '../src/presentation/codex';
import { newProfile } from '../src/progression/profile';

it('Rail Warden locks its visible aim, then throws nearby matter toward that old position', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('railgunner', { x: 800, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 720, y: 400 })!;
  Matter.Body.setPosition(game.player.body, { x: 400, y: 400 });
  game.enemies.update(enemy);
  game.time = 0.8;
  game.enemies.update(enemy);
  expect(enemy.attackAim).toEqual({ x: 400, y: 400 });
  Matter.Body.setPosition(game.player.body, { x: 720, y: 700 });
  game.time = 1.3;
  game.enemies.update(enemy);
  expect(rock.body.velocity.x).toBeLessThan(-5);
  expect(rock.body.velocity.y).toBe(0);
  expect(game.chains.source(rock.chainId)).toBe('enemy');
  expect(enemy.attackAim).toBeUndefined();
  game.world.dispose();
});

it('Rail Warden waits for a warning window and never invents ammunition', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('railgunner', { x: 800, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 720, y: 400 })!;
  game.enemies.update(enemy);
  game.time = 4;
  game.enemies.update(enemy);
  expect(rock.body.velocity.x).toBe(0);
  game.time = 4.2;
  game.enemies.update(enemy);
  expect(enemy.attackAim).toBeDefined();
  game.world.remove(rock);
  const before = game.world.entities.size;
  game.time = 4.8;
  game.enemies.update(enemy);
  expect(game.world.entities.size).toBe(before);
  game.world.dispose();
});

it('Null Shepherd weakens gravity around itself and releases its aura on death', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('null_shepherd', { x: 800, y: 400 })!;
  game.enemies.update(enemy);
  const sample = game.gravity.sample({ x: 850, y: 400 });
  expect(sample.y).toBeCloseTo(game.gravity.strength * 0.25);
  enemy.health = 1;
  game.applyDamage(enemy, 10, game.createCause());
  expect(game.gravity.fields.size).toBe(0);
  expect(game.gravity.sample({ x: 850, y: 400 }).y).toBe(game.gravity.strength);
  game.world.dispose();
});

it('Salvager repairs only after breaking nearby scrap, observes its cooldown and ignores indestructible rocks', () => {
  const game = new Game(false);
  const enemy = game.world.spawn('salvager', { x: 800, y: 400 })!;
  enemy.health = 30;
  const rock = game.world.spawn('rock', { x: 790, y: 400 })!;
  const crate = game.world.spawn('crate', { x: 740, y: 400 })!;
  game.enemies.update(enemy);
  game.time = 1.3;
  game.enemies.update(enemy);
  expect(crate.alive).toBe(false);
  expect(rock.alive).toBe(true);
  expect(enemy.health).toBe(48);
  const next = game.world.spawn('crate', { x: 740, y: 400 })!;
  game.time = 2;
  game.enemies.update(enemy);
  expect(next.alive).toBe(true);
  game.time = 4;
  game.enemies.update(enemy);
  expect(next.alive).toBe(false);
  expect(enemy.health).toBe(66);
  game.world.dispose();
});

it('new enemies occur in authored regional pools and their discoveries reveal tactical codex advice', () => {
  const profile = newProfile();
  for (const kind of ['railgunner', 'null_shepherd', 'salvager'] as const) {
    expect(regions.some((region) => region.enemies.includes(kind))).toBe(true);
    profile.discoveries.push(`enemy:${kind}`);
  }
  const view = codexView(profile);
  expect(view).toContain('Sidestep after its aim locks');
  expect(view).toContain('gravity-damping aura');
  expect(view).toContain('Deny its scrap supply');
});
