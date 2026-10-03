import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild, type UpgradeChoice } from '../src/progression/build';
import { abilityById } from '../src/content/abilities';
import { relicById } from '../src/content/relics';
import { wellEvolutions } from '../src/content/well';
import { Expedition } from '../src/progression/expedition';

function choice(kind: UpgradeChoice['kind'], target: string): UpgradeChoice {
  const definition = kind === 'ability' ? abilityById.get(target)! : relicById.get(target)!;
  return {
    id: `${kind}:${target}`,
    kind,
    target,
    name: definition.name,
    description: definition.description,
  };
}
const wellChoice: UpgradeChoice = {
  id: 'well:well',
  kind: 'well',
  target: 'well',
  name: wellEvolutions[1].name,
  description: wellEvolutions[1].description,
};

it('does not spend a pending upgrade on an exhausted power or an already-owned relic', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'stale');
  build.pending = 2;
  game.abilities.levels.set('void_step', abilityById.get('void_step')!.maxLevel);
  build.addRelic('heavy_heart');
  build.choices = [choice('ability', 'void_step'), choice('relic', 'heavy_heart')];
  const before = {
    powers: game.abilities.snapshot(),
    build: build.snapshot(),
    mass: game.player.body.mass,
  };
  expect(build.choose('ability:void_step')).toBe(false);
  expect(build.choose('relic:heavy_heart')).toBe(false);
  expect({
    powers: game.abilities.snapshot(),
    build: build.snapshot(),
    mass: game.player.body.mass,
  }).toEqual(before);
  const replacement = build.offer();
  expect(replacement).toHaveLength(3);
  expect(replacement.map((item) => item.id)).not.toContain('ability:void_step');
  expect(replacement.map((item) => item.id)).not.toContain('relic:heavy_heart');
  expect(build.pending).toBe(2);
  game.world.dispose();
});

it('recovers a checkpoint containing an exhausted well offer and preserves its replacement draw', () => {
  const run = new Expedition(new Game(false));
  run.start('max-well-save');
  run.build.wellLevel = wellEvolutions.length;
  run.build.pending = 1;
  run.build.currency = 75;
  run.build.choices = [wellChoice];
  const recovered = new Expedition(new Game(false));
  expect(recovered.restore(JSON.parse(JSON.stringify(run.snapshot())))).toBe(true);
  expect(recovered.build.choose('well:well')).toBe(false);
  const replacement = structuredClone(recovered.build.offer());
  expect(replacement).toHaveLength(3);
  expect(replacement.some((item) => item.kind === 'well')).toBe(false);
  expect(recovered.build.pending).toBe(1);
  expect(recovered.build.currency).toBe(75);
  const again = new Expedition(new Game(false));
  expect(again.restore(JSON.parse(JSON.stringify(recovered.snapshot())))).toBe(true);
  expect(again.build.offer()).toEqual(replacement);
  expect(again.build.random.state).toBe(recovered.build.random.state);
  expect(again.build.choose(replacement[0].id)).toBe(true);
  expect(again.build.pending).toBe(0);
  for (const expedition of [run, recovered, again]) expedition.game.world.dispose();
});

it('retains a valid evolution offer without redrawing and rejects it after evolution is owned', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'saved-evolution');
  build.pending = 2;
  game.abilities.levels.set('pulse', abilityById.get('pulse')!.maxLevel);
  build.choices = [choice('ability', 'pulse')];
  const random = build.random.state;
  expect(build.offer()[0].name).toBe('Evolve: Gravity Nova');
  expect(build.random.state).toBe(random);
  expect(build.choose('ability:pulse')).toBe(true);
  expect(game.abilities.levels.get('nova')).toBe(1);
  build.choices = [choice('ability', 'pulse')];
  expect(build.choose('ability:pulse')).toBe(false);
  expect(build.pending).toBe(1);
  expect(build.offer().some((item) => item.target === 'pulse')).toBe(false);
  game.world.dispose();
});

it('refreshes duplicate or unacquired evolution offers without spending saved resources', () => {
  for (const choices of [
    [choice('ability', 'nova')],
    [choice('relic', 'heavy_heart'), choice('relic', 'heavy_heart')],
    [wellChoice, wellChoice],
  ]) {
    const game = new Game(false);
    const build = new RunBuild(game, 'invalid-offer');
    build.pending = 1;
    build.xp = 19;
    build.currency = 65;
    build.rerolls = 2;
    build.choices = choices;
    if (choices[0].target === 'nova') expect(build.choose('ability:nova')).toBe(false);
    const replacement = build.offer();
    expect(replacement).toHaveLength(3);
    expect(new Set(replacement.map((item) => item.id)).size).toBe(3);
    expect(replacement.some((item) => item.target === 'nova')).toBe(false);
    expect({
      pending: build.pending,
      xp: build.xp,
      currency: build.currency,
      rerolls: build.rerolls,
    }).toEqual({ pending: 1, xp: 19, currency: 65, rerolls: 2 });
    game.world.dispose();
  }
});
