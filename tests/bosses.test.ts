import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { type BossKind } from '../src/content/bosses';

function encounter(kind: BossKind) {
  const game = new Game(false);
  const boss = game.world.spawn(kind, { x: 700, y: 350 })!;
  game.start();
  game.bosses.update(boss);
  return { game, boss };
}
it('Magnetar alternates metal-only attraction and repulsion', () => {
  const { game, boss } = encounter('magnetar');
  game.gravity.strength = 0;
  game.time = 3;
  game.bosses.update(boss);
  expect(game.gravity.sample({ x: 800, y: 350 }, 1, ['metal']).x).toBeLessThan(0);
  expect(game.gravity.sample({ x: 800, y: 350 }, 1, ['stone']).x).toBe(0);
  game.gravity.tick(3);
  game.time = 8;
  game.bosses.update(boss);
  expect(game.gravity.sample({ x: 800, y: 350 }, 1, ['metal']).x).toBeGreaterThan(0);
});
it('Chronarch releases suspended matter in reverse and cleans stasis on death', () => {
  const { game, boss } = encounter('chronarch');
  const rock = game.world.spawn('rock', { x: 600, y: 350 })!;
  Matter.Body.setVelocity(rock.body, { x: 4, y: -2 });
  game.time = 3;
  game.bosses.update(boss);
  expect(rock.body.isStatic).toBe(true);
  expect(game.player.body.isStatic).toBe(false);
  game.time = 4.1;
  game.bosses.update(boss);
  expect(rock.body.isStatic).toBe(false);
  expect(rock.body.velocity.x).toBeCloseTo(-4);
  game.time = 8;
  game.bosses.update(boss);
  expect(rock.body.isStatic).toBe(true);
  while (boss.alive) game.applyDamage(boss, 85, game.createCause());
  expect(rock.body.isStatic).toBe(false);
  expect(Number.isFinite(rock.body.mass)).toBe(true);
});
it('Tidal Engine changes the axis of its opposing force pair', () => {
  const { game, boss } = encounter('tidal');
  game.time = 3;
  game.bosses.update(boss);
  const first = [...game.gravity.fields.values()];
  expect(first.map((field) => field.position.y)).toEqual([180, 620]);
  expect(first[0].strength * first[1].strength).toBeLessThan(0);
  game.gravity.tick(3);
  game.time = 8;
  game.bosses.update(boss);
  expect([...game.gravity.fields.values()].map((field) => field.position.x)).toEqual([270, 930]);
});
it('Comet commits to its telegraphed target so a player can sidestep the dash', () => {
  const { game, boss } = encounter('comet');
  Matter.Body.setPosition(game.player.body, { x: 400, y: 350 });
  game.time = 1.2;
  game.bosses.update(boss);
  expect(game.bosses.active?.aim).toEqual({ x: 400, y: 350 });
  Matter.Body.setPosition(game.player.body, { x: 700, y: 650 });
  game.time = 3;
  game.bosses.update(boss);
  expect(boss.body.velocity.x).toBeLessThan(-10);
  expect(Math.abs(boss.body.velocity.y)).toBeLessThan(0.1);
  expect(game.bosses.active?.aim).toBeUndefined();
});
it('Void Weaver expands its pattern by phase and restores normal gravity after its pockets expire', () => {
  const { game, boss } = encounter('weaver');
  boss.health = 150;
  game.time = 3;
  game.bosses.update(boss);
  const fields = [...game.gravity.fields.values()];
  expect(fields).toHaveLength(4);
  const zero = fields.find((field) => field.mode === 'zero')!;
  expect(game.gravity.sample(zero.position)).toEqual({ x: 0, y: 0 });
  game.gravity.tick(4);
  expect(game.gravity.fields.size).toBe(0);
  expect(game.gravity.sample(zero.position).y).toBeGreaterThan(0);
});
