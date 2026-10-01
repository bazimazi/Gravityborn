import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import { matchesSynergy } from '../src/progression/synergies';
import { synergies } from '../src/content/relics';

it('evolution retains ancestor synergies and applies their tagged modifiers exactly once', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'evolved-synergy');
  game.abilities.learn('theft');
  for (let i = 0; i < 3; i++) game.abilities.learn('pulse');
  expect(game.abilities.levels.has('nova')).toBe(true);
  game.abilities.levels.delete('pulse'); // Evolved-only loadouts can still match the family.
  build.apply();
  build.apply();
  expect(build.activeSynergies).toContain('Gravitational Overload');
  expect(game.abilities.modifiers.evaluate('strength', 10, ['Impact'])).toBe(16);
  expect(game.abilities.modifiers.evaluate('strength', 10, ['Void'])).toBe(10);
});
it('tag requirements combine power and relic identities without requiring a specific paired ID', () => {
  const prison = synergies.find((item) => item.id === 'prison')!;
  expect(matchesSynergy(prison, new Set(['binary']))).toBe(false);
  expect(matchesSynergy(prison, new Set(['binary', 'lock']))).toBe(true);
  expect(matchesSynergy(prison, new Set(['planet']), ['Control'])).toBe(true);
  expect(matchesSynergy(prison, new Set(['lock']), ['Control'])).toBe(false);
});
it('equipped items and active mutations contribute tags, and removing them removes their synergy', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'equipment-tags');
  game.abilities.levels.clear();
  game.abilities.learn('planet');
  build.apply();
  expect(build.activeSynergies).not.toContain('Orbital Prison');
  build.equipment = [{ id: 'lattice_core', level: 1, affix: '' }];
  build.apply();
  expect(build.tags).toContain('Control');
  expect(build.activeSynergies).toContain('Orbital Prison');
  const saved = build.snapshot();
  build.equipment = [];
  build.apply();
  expect(build.activeSynergies).not.toContain('Orbital Prison');
  build.mutation = 'dual';
  build.apply();
  expect(build.activeSynergies).toContain('Orbital Prison');
  expect(build.tags.filter((tag) => tag === 'Gravity')).toHaveLength(1);
  build.restore(saved);
  build.apply();
  expect(build.mutation).toBe('');
  expect(build.activeSynergies).toContain('Orbital Prison');
  game.world.dispose();
});
it('Escape Window grants brief cast protection with a clock preserved through build changes', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'escape-synergy');
  game.abilities.learn('slingshot');
  game.abilities.learn('lock');
  build.apply();
  game.start();
  expect(game.castAbility('slingshot', { x: 600, y: 400 })).toBe(true);
  expect(game.player.invulnerability).toBe(0.65);
  game.player.invulnerability = 0;
  build.apply();
  game.abilities.cooldowns.clear();
  game.castAbility('slingshot', { x: 600, y: 400 });
  expect(game.player.invulnerability).toBe(0.2); // Slingshot's built-in shield only.
  game.time = 6;
  game.abilities.cooldowns.clear();
  game.castAbility('slingshot', { x: 600, y: 400 });
  expect(game.player.invulnerability).toBe(0.65);
});
it('Entropy Engine responds to damage tags, not the victim tags, and caps charge via cooldown', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'entropy-synergy');
  game.abilities.learn('theft');
  game.abilities.learn('burst');
  build.apply();
  game.start();
  const kill = (kind: 'heavy' | 'chaser', type: string) => {
    const target = game.world.spawn(kind, { x: 800, y: 400 })!;
    target.health = 1;
    game.applyDamage(target, 10, game.createCause('burst'), type);
  };
  kill('heavy', 'Thermal');
  expect(game.abilities.stored).toBe(0);
  kill('chaser', 'Impact');
  expect(game.abilities.stored).toBe(12);
  kill('chaser', 'Impact');
  expect(game.abilities.stored).toBe(12);
  game.time = 1;
  game.abilities.stored = 95;
  kill('chaser', 'Impact');
  expect(game.abilities.stored).toBe(100);
});
