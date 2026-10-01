import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { shopInventory } from '../src/progression/shop';
import { equipmentById } from '../src/content/equipment';

function trader(): Expedition {
  const run = new Expedition(new Game(false));
  run.start('salvage');
  run.phase = 'shop';
  run.build.currency = 1000;
  run.shop = shopInventory(run.build);
  return run;
}
it('stocks build-compatible powers and all seven purchase categories deterministically', () => {
  const run = trader();
  expect(run.shop).toEqual(trader().shop);
  expect(run.shop).toHaveLength(8);
  const ids = run.shop.map((item) => item.id);
  for (const kind of ['ability:', 'equipment:', 'mutation:'])
    expect(ids.some((id) => id.startsWith(kind))).toBe(true);
  expect(ids).toEqual(expect.arrayContaining(['healing', 'reroll', 'charge']));
});
it('purchases each category once and refuses redundant repair or unaffordable goods', () => {
  const run = trader();
  expect(run.buy('healing')).toBe(false);
  run.game.player.health = 20;
  for (const item of run.shop) {
    const currency = run.build.currency;
    expect(run.buy(item.id)).toBe(true);
    expect(run.build.currency).toBe(currency - item.price);
    expect(run.buy(item.id)).toBe(false);
  }
  expect(run.game.player.health).toBeGreaterThan(20);
  expect(run.build.rerolls).toBe(1);
  expect(run.game.abilities.stored).toBe(50);
  expect(run.build.mutation).not.toBe('');
  expect(run.build.equipment).toHaveLength(1);
  const poor = trader();
  poor.build.currency = 0;
  expect(poor.buy(poor.shop[0].id)).toBe(false);
});
it('replaces equipment in its slot and reloads mixed stock without repurchasing sold goods', () => {
  const run = trader();
  const item = run.shop.find((item) => item.id.startsWith('equipment:'))!;
  const target = equipmentById.get(item.id.split(':')[1])!;
  const previous = [...equipmentById.values()].find(
    (entry) => entry.slot === target.slot && entry.id !== target.id,
  )!;
  run.build.equipment.push({ id: previous.id, level: 3, affix: '' });
  expect(run.buy(item.id)).toBe(true);
  expect(run.build.equipment.map((entry) => entry.id)).toEqual([target.id]);
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.shop).toEqual(run.shop);
  expect(restored.buy(item.id)).toBe(false);
  expect(restored.build.equipment).toEqual(run.build.equipment);
});
