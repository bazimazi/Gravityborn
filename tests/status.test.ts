import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { statusBadges } from '../src/presentation/status';

function setup(...powers: string[]) {
  const game = new Game(false);
  game.gravity.strength = 0;
  for (const id of powers) game.abilities.learn(id);
  game.start();
  return game;
}

it('reports temporary core coatings, mass and gravity response with their remaining lifetimes', () => {
  const game = setup('glass_spring', 'iron_core', 'void_step');
  const initialMass = game.player.body.mass;
  expect(game.castAbility('glass_spring', game.player.body.position)).toBe(true);
  expect(game.castAbility('iron_core', game.player.body.position)).toBe(true);
  expect(game.castAbility('void_step', game.player.body.position)).toBe(true);
  expect(game.player.body.restitution).toBe(1.05);
  expect(game.player.body.mass).toBeCloseTo(initialMass * 3);
  expect(game.player.gravityScale).toBe(0);
  expect(game.abilities.activePlayerEffects()).toEqual([
    { id: 'glass_spring', remaining: 4 },
    { id: 'iron_core', remaining: 4 },
    { id: 'void_step', remaining: 3 },
  ]);
  expect(statusBadges(game).map((item) => item.label)).toEqual([
    'Glass Spring 4.0s',
    'Iron Core 4.0s',
    'Void Step 3.0s',
  ]);
  game.time = 2;
  game.pause();
  expect(statusBadges(game)[0].label).toBe('Glass Spring 2.0s');
  const before = game.abilities.snapshot();
  const physicalBefore = game.player.body.restitution;
  statusBadges(game);
  expect(game.abilities.snapshot()).toEqual(before);
  expect(game.player.body.restitution).toBe(physicalBefore);
  game.time = 4;
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  game.abilities.tick(0);
  expect(game.player.body.restitution).toBe(game.player.surfaceBase.restitution);
  expect(game.player.body.mass).toBeCloseTo(initialMass);
  expect(game.player.gravityScale).toBe(1);
  game.world.dispose();
});

it('does not report object-only effects as core buffs and refreshes without duplicate badges', () => {
  const game = setup('glass_spring', 'elastic_coat', 'densify');
  const point = { x: 800, y: 400 };
  const rock = game.world.spawn('rock', point)!;
  expect(game.castAbility('elastic_coat', point)).toBe(true);
  expect(game.castAbility('densify', point)).toBe(true);
  expect(rock.surfaceOverrides.has('surface:elastic_coat')).toBe(true);
  expect(rock.massFactors.has('mass:densify')).toBe(true);
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  game.abilities.cast('glass_spring', game.player.body.position, true);
  game.time = 2;
  game.abilities.cast('glass_spring', game.player.body.position, true);
  expect(game.abilities.activePlayerEffects()).toEqual([{ id: 'glass_spring', remaining: 4 }]);
  game.time = 4.5;
  game.abilities.tick(0);
  expect(statusBadges(game).filter((item) => item.label.startsWith('Glass Spring'))).toHaveLength(
    1,
  );
  expect(game.abilities.activePlayerEffects()[0].remaining).toBe(1.5);
  game.reset(false);
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  expect(statusBadges(game)).toEqual([]);
  game.world.dispose();
});

it('does not report removed physical factors or effects on a dead or recycled core', () => {
  const game = setup('iron_core');
  game.castAbility('iron_core', game.player.body.position);
  const factors = game.player.massFactors;
  factors.delete('mass:iron_core');
  game.world.refreshMass(game.player);
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  game.abilities.cast('iron_core', game.player.body.position, true);
  expect(game.abilities.activePlayerEffects()).toHaveLength(1);
  game.player.generation++;
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  game.player.generation--;
  game.world.remove(game.player);
  expect(game.abilities.activePlayerEffects()).toEqual([]);
  game.world.dispose();
});
