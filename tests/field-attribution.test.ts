import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { GravitySystem, type GravityField } from '../src/physics/gravity';

const point = { x: 600, y: 400 };
function suppressor(
  mode: 'zero' | 'directional',
  direction = { x: 1, y: 0 },
): Omit<GravityField, 'id'> {
  return {
    source: 'environment',
    mode,
    position: point,
    direction,
    strength: mode === 'zero' ? 1 : 0.1,
    radius: 500,
    falloff: 'constant',
    remaining: 20,
  };
}

it('well and power fields cannot claim shots when suppressed or already saturated in their direction', () => {
  for (const source of ['well', 'repulsor'])
    for (const mode of ['zero', 'directional'] as const) {
      const game = new Game(false);
      game.gravity.strength = 0;
      const shot = game.world.spawn('projectile', point)!;
      const id = game.gravity.addField(suppressor(mode, { x: source === 'well' ? 1 : -1, y: 0 }));
      game.start();
      if (source === 'well') expect(game.createWell({ x: 700, y: 400 })).toBe(true);
      else {
        game.abilities.learn(source);
        expect(game.castAbility(source, { x: 700, y: 400 })).toBe(true);
        game.abilities.tick(1 / 120);
      }
      expect(shot.chainId).toBeNull();
      expect(shot.redirected).toBe(false);
      game.gravity.removeField(id);
      // A previously suppressed field begins owning motion when its suppression is removed.
      game.world.spawn('anchor', { x: 1000, y: 200 });
      game.step();
      expect(game.chains.source(shot.chainId)).toBe(source);
      expect(shot.redirected).toBe(true);
      game.world.dispose();
    }
});

it('field influence matches removing each field, including overlapping suppression and signed responses', () => {
  const definitions: Omit<GravityField, 'id'>[] = [
    { ...suppressor('directional'), strength: 0.005, affects: ['metal'] },
    { ...suppressor('directional'), direction: { x: -1, y: 1 }, strength: 0.004 },
    { ...suppressor('zero'), strength: 0.3 },
    { ...suppressor('zero'), strength: 1, radius: 60 },
    { ...suppressor('zero'), strength: 1, radius: 20 },
    { ...suppressor('directional'), mode: 'radial', strength: -0.02, falloff: 'linear' },
    { ...suppressor('directional'), mode: 'vortex', strength: 0.03, falloff: 'inverseSquare' },
  ];
  const gravity = new GravitySystem(0.00125, 0.009);
  const ids = definitions.map((definition) => gravity.addField(definition));
  for (const response of [-2, 0, 1])
    for (const tags of [['metal'], ['stone']])
      for (const position of [point, { x: 640, y: 400 }, { x: 720, y: 480 }, { x: 1500, y: 400 }]) {
        const actual = gravity.sample(position, response, tags);
        const influences = gravity.influencingFields(position, response, tags);
        for (let index = 0; index < definitions.length; index++) {
          const without = new GravitySystem(0.00125, 0.009);
          definitions.forEach((definition, other) => {
            if (other !== index) without.addField(definition);
          });
          const counterfactual = without.sample(position, response, tags);
          expect(influences.has(ids[index])).toBe(
            Math.hypot(actual.x - counterfactual.x, actual.y - counterfactual.y) >= 1e-8,
          );
        }
      }
});

it('newer effective powers own motion and a redundant zero field cannot steal attribution', () => {
  const game = new Game(false);
  const shot = game.world.spawn('projectile', point)!;
  game.start();
  for (const id of ['vortex', 'repulsor']) {
    game.abilities.learn(id);
    expect(game.castAbility(id, { x: 700, y: 400 })).toBe(true);
    game.abilities.tick(1 / 120);
    expect(game.chains.source(shot.chainId)).toBe(id);
  }
  const previous = shot.chainId;
  game.gravity.addField(suppressor('zero'));
  game.abilities.learn('zero');
  expect(game.castAbility('zero', point)).toBe(true);
  game.abilities.tick(1 / 120);
  expect(shot.chainId).toBe(previous);
  game.world.dispose();
});
