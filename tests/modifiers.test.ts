import { expect, it } from 'vitest';
import { ModifierSet } from '../src/progression/modifiers';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';

it('bounds runaway endless-build multiplication while retaining tag isolation and negative gravity', () => {
  const modifiers = new ModifierSet();
  for (let i = 0; i < 1000; i++)
    modifiers.add({ id: `mass:${i}`, stat: 'mass', operation: 'multiply', value: 10 });
  expect(modifiers.evaluate('mass', 4)).toBe(100);
  modifiers.add({ id: 'void', stat: 'damage', operation: 'multiply', value: 100, tags: ['Void'] });
  expect(modifiers.evaluate('damage', 10, ['Void'])).toBe(85);
  expect(modifiers.evaluate('damage', 10, ['Impact'])).toBe(10);
  modifiers.add({ id: 'negative', stat: 'gravityResponse', operation: 'override', value: -1 });
  expect(modifiers.evaluate('gravityResponse', 1)).toBe(-1);
});
it('keeps an extensively stacked build playable and serializable', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'endless-bounds');
  for (let i = 0; i < 300; i++) build.passives.push('integrity', 'cooling', 'force');
  build.apply();
  game.world.spawn('heavy', { x: 800, y: 350 });
  game.start();
  expect(game.maxHealth).toBe(2000);
  game.castAbility('pulse', game.player.body.position);
  expect(game.abilities.cooldowns.get('pulse')).toBe(0.25);
  for (let i = 0; i < 120; i++) game.step();
  expect(Number.isFinite(game.player.body.position.x + game.player.body.position.y)).toBe(true);
  const restored = new RunBuild(new Game(false), 'endless-bounds');
  restored.restore(JSON.parse(JSON.stringify(build.snapshot())));
  restored.apply();
  expect(restored.game.maxHealth).toBe(2000);
});
