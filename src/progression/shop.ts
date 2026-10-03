import { abilities, abilityById } from '../content/abilities';
import { equipment, equipmentById } from '../content/equipment';
import { mutations } from '../content/research';
import { relics, relicById } from '../content/relics';
import type { RunBuild } from './build';
import { canDevelopAbility } from './ability-options';

export interface ShopItem {
  id: string;
  price: number;
  sold: boolean;
}
const services = new Map([
  ['healing', { name: 'Core repair', description: 'Restore 40% of maximum integrity.', price: 30 }],
  [
    'reroll',
    {
      name: 'Choice reroll',
      description: 'Bank one reroll for a future level-up choice.',
      price: 25,
    },
  ],
  [
    'charge',
    {
      name: 'Gravity charge',
      description:
        'Bank 50 compressed energy for Stored Burst. Persists between chambers until discharged.',
      price: 20,
    },
  ],
]);
export function shopDescription(id: string): { name: string; description: string } | undefined {
  const [kind, target, ...extra] = id.split(':');
  if (extra.length) return undefined;
  if (kind === 'ability') return abilityById.get(target);
  if (kind === 'equipment') {
    const item = equipmentById.get(target);
    return (
      item && {
        name: item.name,
        description: `${item.description} Replaces your ${item.slot} for this expedition.`,
      }
    );
  }
  if (kind === 'mutation') {
    const item = mutations.find((item) => item.id === target);
    return (
      item && {
        name: item.name,
        description: `${item.description} Replaces your mutation for this expedition.`,
      }
    );
  }
  return services.get(id) ?? relicById.get(id);
}
export function shopInventory(build: RunBuild): ShopItem[] {
  const inventory: ShopItem[] = build.random
    .shuffle(relics.filter((relic) => !build.relics.includes(relic.id)))
    .slice(0, 2)
    .map((relic) => ({
      id: relic.id,
      price: relic.rarity === 'legendary' ? 100 : relic.rarity === 'rare' ? 65 : 40,
      sold: false,
    }));
  const learnedTags = new Set(
    [...build.game.abilities.levels.keys()].flatMap((id) => abilityById.get(id)?.tags ?? []),
  );
  const powers = abilities.filter(
    (ability) =>
      canDevelopAbility(ability, build.game.abilities.levels) &&
      !abilities.some((parent) => parent.evolution === ability.id) &&
      (build.game.abilities.levels.get(ability.id) ?? 0) < ability.maxLevel,
  );
  const compatible = powers.filter((ability) => ability.tags.some((tag) => learnedTags.has(tag)));
  if (powers.length)
    inventory.push({
      id: `ability:${build.random.pick(compatible.length ? compatible : powers).id}`,
      price: 55,
      sold: false,
    });
  const gear = equipment.filter((item) => !build.equipment.some((entry) => entry.id === item.id));
  if (gear.length)
    inventory.push({ id: `equipment:${build.random.pick(gear).id}`, price: 60, sold: false });
  const mutation = build.random.pick(mutations.filter((item) => item.id !== build.mutation));
  inventory.push({ id: `mutation:${mutation.id}`, price: 45, sold: false });
  for (const [id, service] of services) inventory.push({ id, price: service.price, sold: false });
  return inventory;
}
export function canBuy(build: RunBuild, item: ShopItem): boolean {
  if (item.sold || build.currency < item.price || !shopDescription(item.id)) return false;
  if (item.id === 'healing') return build.game.player.health < build.game.maxHealth;
  if (item.id === 'reroll') return build.rerolls < 10;
  if (item.id === 'charge') return build.game.abilities.stored < 100;
  if (relicById.has(item.id)) return !build.relics.includes(item.id);
  const [kind, target] = item.id.split(':');
  if (kind === 'ability')
    return (
      canDevelopAbility(abilityById.get(target)!, build.game.abilities.levels) &&
      (build.game.abilities.levels.get(target) ?? 0) < abilityById.get(target)!.maxLevel
    );
  if (kind === 'equipment') return !build.equipment.some((entry) => entry.id === target);
  return build.mutation !== target;
}
export function purchase(build: RunBuild, item: ShopItem): boolean {
  if (!canBuy(build, item)) return false;
  const [kind, target] = item.id.split(':');
  if (kind === 'ability') build.game.abilities.learn(target);
  else if (kind === 'equipment') {
    const definition = equipmentById.get(target)!;
    build.equipment = build.equipment.filter(
      (entry) => equipmentById.get(entry.id)!.slot !== definition.slot,
    );
    build.equipment.push({ id: target, level: 1, affix: '' });
  } else if (kind === 'mutation') build.mutation = target;
  else if (item.id === 'healing')
    build.game.player.health = Math.min(
      build.game.maxHealth,
      build.game.player.health + Math.ceil(build.game.maxHealth * 0.4),
    );
  else if (item.id === 'reroll') build.rerolls++;
  else if (item.id === 'charge')
    build.game.abilities.stored = Math.min(100, build.game.abilities.stored + 50);
  else build.addRelic(item.id);
  build.currency -= item.price;
  item.sold = true;
  build.apply();
  return true;
}
