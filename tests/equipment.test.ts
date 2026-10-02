import { expect, it } from 'vitest';
import { equipment, equipmentSlots } from '../src/content/equipment';
import { mutations, researchNodes } from '../src/content/research';
import {
  newProfile,
  craftEquipment,
  upgradeEquipment,
  reforgeEquipment,
  purchaseResearch,
  canPurchaseResearch,
  readProfile,
} from '../src/progression/profile';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';

it('requires a guardian victory before buying Endless research, including after save recovery', () => {
  const profile = newProfile();
  profile.research = 20;
  profile.skills = ['mastery'];
  expect(canPurchaseResearch(profile, 'endless')).toBe(false);
  expect(purchaseResearch(profile, 'endless')).toBe(false);
  expect(profile.research).toBe(20);
  // A guardian killed in an otherwise defeated expedition still qualifies.
  profile.metrics.bosses = 1;
  const restored = readProfile(JSON.parse(JSON.stringify(profile)));
  expect(canPurchaseResearch(restored, 'endless')).toBe(true);
  expect(purchaseResearch(restored, 'endless')).toBe(true);
  expect(restored.research).toBe(12);
  expect(purchaseResearch(restored, 'endless')).toBe(false);
  expect(restored.research).toBe(12);
});

it('accepts legacy expedition victories while retaining research cost and prerequisite gates', () => {
  const profile = newProfile();
  profile.wins = 1;
  profile.research = 20;
  expect(purchaseResearch(profile, 'endless')).toBe(false);
  profile.skills = ['mastery'];
  profile.research = 7;
  expect(purchaseResearch(profile, 'endless')).toBe(false);
  profile.research = 8;
  expect(purchaseResearch(profile, 'endless')).toBe(true);
  expect(profile.research).toBe(0);
  // Existing purchases remain learned when reading a pre-gate save.
  profile.wins = 0;
  expect(readProfile(profile).skills).toContain('endless');
});

it('crafts, upgrades, and reforges equipment with bounded spending and requirements', () => {
  const profile = newProfile();
  profile.shards = 200;
  profile.research = 100;
  expect(craftEquipment(profile, 'basalt_core')).toBe(true);
  const shards = profile.shards;
  expect(craftEquipment(profile, 'basalt_core')).toBe(false);
  expect(profile.shards).toBe(shards);
  expect(profile.loadout.core).toBe('basalt_core');
  for (let i = 0; i < 4; i++) expect(upgradeEquipment(profile, 'basalt_core')).toBe(true);
  expect(upgradeEquipment(profile, 'basalt_core')).toBe(false);
  expect(reforgeEquipment(profile, 'basalt_core', 'swift')).toBe(false);
  expect(purchaseResearch(profile, 'affixes')).toBe(false);
  expect(purchaseResearch(profile, 'scavenger')).toBe(true);
  expect(purchaseResearch(profile, 'affixes')).toBe(true);
  expect(reforgeEquipment(profile, 'basalt_core', 'swift')).toBe(true);
  expect(reforgeEquipment(profile, 'basalt_core', 'swift')).toBe(false);
  expect(readProfile(profile)).toEqual(profile);
});
it('applies three-piece set bonuses once and freezes loadout for an active run', () => {
  const profile = newProfile();
  profile.shards = 1000;
  for (const slot of ['core', 'shell', 'gravity']) craftEquipment(profile, `basalt_${slot}`);
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('set', 'manipulator', profile);
  expect(game.abilities.modifiers.values.has('set:basalt')).toBe(true);
  const mass = game.player.body.mass;
  profile.loadout.core = 'hollow_core';
  run.build.apply();
  expect(game.player.body.mass).toBe(mass);
  const restored = new Expedition(new Game(false));
  expect(restored.restore(JSON.parse(JSON.stringify(run.snapshot())))).toBe(true);
  expect(restored.build.equipment).toEqual(run.build.equipment);
  expect(restored.game.player.body.mass).toBe(mass);
});
for (const item of equipment)
  it(`${item.name} has a valid slot and produces finite derived physics`, () => {
    const profile = newProfile();
    profile.shards = 1000;
    craftEquipment(profile, item.id);
    const game = new Game(false);
    const run = new Expedition(game);
    run.start('equipment', 'manipulator', profile);
    expect(equipmentSlots).toContain(item.slot);
    expect(Number.isFinite(game.player.body.mass)).toBe(true);
    expect(game.maxHealth).toBeGreaterThan(0);
    expect(run.build.equipment).toHaveLength(1);
    expect(run.enter(run.available[0].id)).toBe(true);
    game.step();
    expect(Number.isFinite(game.player.body.position.x + game.player.body.position.y)).toBe(true);
    game.world.dispose();
  });
for (const mutation of mutations)
  it(`${mutation.name} applies its rules and survives checkpoint restoration`, () => {
    const profile = newProfile();
    profile.skills = ['mutations'];
    profile.mutation = mutation.id;
    const game = new Game(false);
    const run = new Expedition(game);
    run.start('mutation', 'manipulator', profile);
    expect(run.build.mutation).toBe(mutation.id);
    if (mutation.id === 'negative') expect(game.player.gravityScale).toBe(-1);
    const restored = new Expedition(new Game(false));
    expect(restored.restore(run.snapshot())).toBe(true);
    expect(restored.build.mutation).toBe(mutation.id);
    run.enter(run.available[0].id);
    game.step();
    game.flip({ x: 1, y: 0 });
    game.player.health = 20;
    game.step();
    expect(Number.isFinite(game.player.body.position.x + game.player.body.position.y)).toBe(true);
  });
it('research gates later starting regions and grants limited upgrade rerolls', () => {
  expect(new Set(researchNodes.map((node) => node.tree)).size).toBe(6);
  const profile = newProfile();
  profile.research = 100;
  const run = new Expedition(new Game(false));
  run.start('regions', 'manipulator', profile, 7);
  expect(run.biome).toBe(0);
  purchaseResearch(profile, 'navigation');
  purchaseResearch(profile, 'survey');
  purchaseResearch(profile, 'reroll');
  purchaseResearch(profile, 'reroll_plus');
  run.start('regions', 'manipulator', profile, 7);
  expect(run.biome).toBe(7);
  expect(run.startBiome).toBe(7);
  run.build.gainXP(100);
  run.build.offer();
  expect(run.build.reroll()).toBe(true);
  expect(run.build.reroll()).toBe(true);
  expect(run.build.reroll()).toBe(false);
});
