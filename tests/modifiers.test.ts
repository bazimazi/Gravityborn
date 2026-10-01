import { expect, it } from 'vitest';
import { ModifierSet } from '../src/progression/modifiers';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import Matter from 'matter-js';
import { conditionsMatch, type ModifierCondition } from '../src/progression/modifiers';

it('evaluates threshold boundaries, conjunctive conditions and missing context safely', () => {
  for (const [comparison, matches] of [
    ['lt', false],
    ['lte', true],
    ['gt', false],
    ['gte', true],
    ['eq', true],
  ] as const) {
    const conditions: ModifierCondition[] = [{ stat: 'speed', comparison, value: 6 }];
    expect(conditionsMatch(conditions, { speed: 6 })).toBe(matches);
    expect(conditionsMatch(conditions, {})).toBe(false);
    expect(conditionsMatch(conditions, { speed: NaN })).toBe(false);
  }
  const modifiers = new ModifierSet(() => ({ healthRatio: 0.2, speed: 7 }));
  modifiers.add({
    id: 'conditional',
    stat: 'damage',
    operation: 'multiply',
    value: 2,
    tags: ['Impact'],
    conditions: [
      { stat: 'healthRatio', comparison: 'lt', value: 0.35 },
      { stat: 'speed', comparison: 'gte', value: 6 },
    ],
  });
  expect(modifiers.evaluate('damage', 10, ['Impact'])).toBe(20);
  expect(modifiers.evaluate('damage', 10, ['Void'])).toBe(10);
  expect(modifiers.evaluate('damage', 10, ['Impact'], { healthRatio: 0.2, speed: 2 })).toBe(10);
});
it('unsatisfied conditions do not consume a trigger cooldown', () => {
  const modifiers = new ModifierSet();
  modifiers.rules.set('cell', {
    id: 'cell',
    trigger: 'OnGravityChange',
    effect: 'energy',
    value: 18,
    cooldown: 3,
    conditions: [{ stat: 'energyRatio', comparison: 'lt', value: 0.25 }],
  });
  expect(modifiers.fire('OnGravityChange', 0, [], { energyRatio: 1 })).toEqual([]);
  expect(modifiers.fire('OnGravityChange', 0.1, [], { energyRatio: 0.1 })).toHaveLength(1);
  expect(modifiers.fire('OnGravityChange', 3, [], { energyRatio: 0.1 })).toEqual([]);
  expect(modifiers.fire('OnGravityChange', 3.1, [], { energyRatio: 0.1 })).toHaveLength(1);
});
it('conditional relics follow current movement, proximity and scaled resource ceilings', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'conditional');
  for (const id of ['redshift', 'quiet_orbit', 'last_light', 'battery']) build.addRelic(id);
  build.passives.push('integrity');
  build.apply();
  game.player.health = 36;
  game.abilities.energy = 65;
  expect(game.abilities.context()).toMatchObject({
    healthRatio: 0.3,
    energyRatio: 0.5,
    nearbyEnemies: 0,
  });
  expect(game.abilities.modifiers.evaluate('energyRegen', 8)).toBe(12);
  Matter.Body.setVelocity(game.player.body, { x: 6, y: 0 });
  expect(game.abilities.modifiers.evaluate('impactDamage', 1)).toBe(1.6);
  const enemy = game.world.spawn('chaser', { x: 420, y: 470 })!;
  expect(game.abilities.modifiers.evaluate('energyRegen', 8)).toBe(8);
  game.applyDamage(enemy, 85, game.createCause());
  expect(game.player.health).toBe(46);
  expect(game.abilities.modifiers.evaluate('energyRegen', 8)).toBe(12);
});
it('casts use one pre-payment condition snapshot and restore conditional relics by stable IDs', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'snapshot');
  build.addRelic('full_spectrum');
  const saved = JSON.parse(JSON.stringify(build.snapshot()));
  const restored = new RunBuild(game, 'snapshot');
  restored.restore(saved);
  restored.apply();
  game.abilities.modifiers.add({
    id: 'conditional-cooling',
    stat: 'cooldown',
    operation: 'multiply',
    value: 0.5,
    conditions: [{ stat: 'energyRatio', comparison: 'gte', value: 0.8 }],
  });
  game.abilities.energy = 80;
  game.start();
  expect(game.castAbility('pulse', game.player.body.position)).toBe(true);
  expect(game.abilities.energy).toBeLessThan(80);
  expect(game.abilities.cooldowns.get('pulse')).toBe(1.75);
  expect(restored.relics).toContain('full_spectrum');
});

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
