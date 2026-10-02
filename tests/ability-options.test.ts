import { expect, it, vi } from 'vitest';
import { abilityById } from '../src/content/abilities';
import { Game } from '../src/gameplay/game';
import { RunBuild, type UpgradeChoice } from '../src/progression/build';
import { canDevelopAbility } from '../src/progression/ability-options';
import { canBuy, purchase, shopInventory } from '../src/progression/shop';

const dependencies = [
  ['planet_split', 'planet'],
  ['tether_cut', 'tether'],
  ['tension_release', 'constellation'],
  ['anchor_recall', 'skyhook'],
] as const;
it.each(dependencies)(
  '%s enters offers and can be purchased only after acquiring %s',
  (id, source) => {
    const game = new Game(false);
    const build = new RunBuild(game, 'prerequisites');
    build.pending = 1;
    build.currency = 100;
    const prioritize = vi
      .spyOn(build.random, 'shuffle')
      .mockImplementation((items) =>
        [...items].sort(
          (a, b) =>
            Number((b as UpgradeChoice).target === id) - Number((a as UpgradeChoice).target === id),
        ),
      );
    expect(build.offer().some((choice) => choice.target === id)).toBe(false);
    const stockSelection = vi
      .spyOn(build.random, 'pick')
      .mockImplementation(
        (items) => items.find((item) => (item as { id: string }).id === id) ?? items[0],
      );
    expect(shopInventory(build).some((item) => item.id === `ability:${id}`)).toBe(false);
    const stock = { id: `ability:${id}`, price: 55, sold: false };
    expect(canBuy(build, stock)).toBe(false);
    expect(purchase(build, stock)).toBe(false);
    expect(build.currency).toBe(100);
    expect(stock.sold).toBe(false);
    game.abilities.learn(source);
    expect(shopInventory(build).some((item) => item.id === `ability:${id}`)).toBe(true);
    build.choices = [];
    expect(build.offer().some((choice) => choice.target === id)).toBe(true);
    expect(purchase(build, stock)).toBe(true);
    expect(game.abilities.levels.get(id)).toBe(1);
    expect(build.currency).toBe(45);
    expect(stock.sold).toBe(true);
    prioritize.mockRestore();
    stockSelection.mockRestore();
    game.world.dispose();
  },
);

it('requires actual construct creation, distinguishing anchored tethers and existing ownership', () => {
  const levels = new Map([
    ['tether', 1],
    ['orbital_lantern', 1],
  ]);
  expect(canDevelopAbility(abilityById.get('tether_cut')!, levels)).toBe(true);
  expect(canDevelopAbility(abilityById.get('anchor_recall')!, levels)).toBe(false);
  expect(canDevelopAbility(abilityById.get('planet_split')!, levels)).toBe(false);
  levels.set('gravity_grapple', 1);
  expect(canDevelopAbility(abilityById.get('anchor_recall')!, levels)).toBe(true);
  levels.set('binary', 1);
  expect(canDevelopAbility(abilityById.get('planet_split')!, levels)).toBe(true);
  levels.clear();
  levels.set('planet_split', 1);
  expect(canDevelopAbility(abilityById.get('planet_split')!, levels)).toBe(true);
  expect(canDevelopAbility(abilityById.get('tether_cut')!, levels)).toBe(false);
});

it('refreshes ineligible legacy offers without spending a choice and preserves the replacement on recovery', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'old-offer');
  build.pending = 1;
  build.choices = [
    {
      id: 'ability:planet_split',
      kind: 'ability',
      target: 'planet_split',
      name: 'Planet Split',
      description: 'Legacy offer',
    },
  ];
  const recovered = new RunBuild(game, 'different-seed');
  recovered.restore(JSON.parse(JSON.stringify(build.snapshot())));
  expect(recovered.choose('ability:planet_split')).toBe(false);
  expect(recovered.pending).toBe(1);
  const replacements = structuredClone(recovered.offer());
  expect(replacements).toHaveLength(3);
  expect(replacements.some((choice) => choice.target === 'planet_split')).toBe(false);
  const again = new RunBuild(game, 'another-seed');
  again.restore(JSON.parse(JSON.stringify(recovered.snapshot())));
  expect(again.offer()).toEqual(replacements);
  expect(again.choose(replacements[0].id)).toBe(true);
  expect(again.pending).toBe(0);
  game.world.dispose();
});
