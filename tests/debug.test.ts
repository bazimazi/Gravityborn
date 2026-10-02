import { expect, it, vi } from 'vitest';
import { Game } from '../src/gameplay/game';
import { DebugSession } from '../src/gameplay/debug';
import { Expedition } from '../src/progression/expedition';
import { upgradeMetadata } from '../src/presentation/expedition';
import { abilityById } from '../src/content/abilities';

it('inspector grants validate content, cap stats, and mark assisted expeditions', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const debug = new DebugSession(game, run);
  expect(debug.giveCurrency(100)).toBe(false);
  run.start('debug');
  expect(debug.giveAbility('forged')).toBe(false);
  expect(debug.giveRelic('forged')).toBe(false);
  expect(debug.setPlayer('mass', NaN)).toBe(false);
  expect(debug.giveAbility('collapse')).toBe(true);
  expect(debug.giveRelic('heavy_heart')).toBe(true);
  expect(debug.giveRelic('heavy_heart')).toBe(false);
  expect(debug.giveCurrency(100)).toBe(true);
  expect(run.build.currency).toBe(100);
  debug.setPlayer('mass', 100000);
  expect(game.player.body.mass).toBe(100);
  debug.setPlayer('maxHealth', 200);
  debug.setPlayer('health', 20000);
  expect(game.player.health).toBe(200);
  debug.setPlayer('energy', -100);
  expect(game.abilities.energy).toBe(0);
  expect(run.metrics.assisted).toBe(1);
});
it('inspector sandbox relics reset with the world and kill commands leave neutral matter intact', () => {
  const game = new Game(false);
  const debug = new DebugSession(game, new Expedition(game));
  debug.giveRelic('heavy_heart');
  expect(game.player.body.mass).toBeCloseTo(5.6);
  game.reset(false);
  expect(debug.giveRelic('heavy_heart')).toBe(true);
  const boss = game.world.spawn('magnetar', { x: 800, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 500, y: 400 })!;
  debug.killEnemies();
  expect(boss.alive).toBe(false);
  expect(rock.alive).toBe(true);
  expect(game.player.health).toBeGreaterThan(0);
});
it('upgrade cards expose rarity, current level, tags, and the resulting evolution description', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('readable-choice');
  const choice = {
    id: 'ability:pulse',
    kind: 'ability' as const,
    target: 'pulse',
    name: 'Pulse',
    description: '',
  };
  const metadata = upgradeMetadata(run, choice);
  expect(metadata).toContain('COMMON');
  expect(metadata).toContain('LEVEL 1 → 2');
  expect(metadata).toContain('Gravity');
  game.abilities.learn('pulse');
  game.abilities.learn('pulse');
  expect(upgradeMetadata(run, choice)).toContain('LEGENDARY');
  expect(upgradeMetadata(run, choice)).toContain('EVOLVES');
  // This checks card content. Select the evolution from the actual pool instead
  // of depending on a lucky draw as the authored catalog grows.
  const shuffle = vi
    .spyOn(run.build.random, 'shuffle')
    .mockImplementation((pool) =>
      [...pool].sort(
        (a, b) =>
          Number((b as { id: string }).id === choice.id) -
          Number((a as { id: string }).id === choice.id),
      ),
    );
  const offer = run.build.offer().find((entry) => entry.id === choice.id);
  expect(offer).toBeDefined();
  expect(offer!.description).toBe(abilityById.get('nova')!.description);
  shuffle.mockRestore();
  game.world.dispose();
});
