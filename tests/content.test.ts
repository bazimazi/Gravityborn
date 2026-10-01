import { expect, it } from 'vitest';
import { abilities, abilityById, type AbilityDefinition } from '../src/content/abilities';
import { validateAbilities, validateContent } from '../src/content/validate';
import { abilityFeedback } from '../src/content/ability-feedback';
import { Game } from '../src/gameplay/game';
import Matter from 'matter-js';
import { encounters } from '../src/content/events';

it('all shipped content has valid values, unique identifiers and resolvable references', () => {
  expect(validateContent()).toEqual([]);
});
it('rejects duplicate event choices, unknown gravity rules and nonfinite costs', () => {
  const bad = {
    id: 'leave',
    name: 'Invalid',
    description: '',
    currencyCost: NaN,
    phenomenon: 'missing' as never,
  };
  encounters.push({ id: 'test_event', name: 'Test', text: '', choices: [bad, bad] });
  try {
    const issues = validateContent().filter((issue) =>
      issue.path.startsWith('encounters.test_event'),
    );
    expect(issues.some((issue) => issue.message.includes('unique'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('gravity rule'))).toBe(true);
    expect(issues.some((issue) => issue.path.endsWith('currencyCost'))).toBe(true);
  } finally {
    encounters.pop();
  }
});
it('authoring validation detects cycles, missing evolutions, invalid parameters and feedback', () => {
  const pulse = {
    ...abilities[0],
    id: 'sample',
    evolution: 'sample',
    radius: NaN,
    parameters: { planetCount: 9 },
    feedback: { color: 'red' },
  };
  const issues = validateAbilities([pulse, { ...pulse }]);
  for (const field of ['evolution', 'radius', 'parameters.planetCount', 'feedback.color'])
    expect(issues.some((issue) => issue.path.endsWith(field))).toBe(true);
  expect(issues.some((issue) => issue.message.includes('unique'))).toBe(true);
  expect(
    validateAbilities([{ ...abilities[0], evolution: 'missing' }]).some((issue) =>
      issue.path.endsWith('evolution'),
    ),
  ).toBe(true);
});
function authored(definition: AbilityDefinition, execute: (game: Game) => void): void {
  abilityById.set(definition.id, definition);
  const game = new Game(false);
  game.abilities.learn(definition.id);
  game.start();
  game.gravity.strength = 0;
  try {
    execute(game);
  } finally {
    game.world.dispose();
    abilityById.delete(definition.id);
  }
}
it('a definition alone can configure selective gravity, falloff and audiovisual feedback', () => {
  const definition: AbilityDefinition = {
    ...abilityById.get('repulsor')!,
    id: 'author_test',
    parameters: { affects: ['metal'], falloff: 'constant' },
    feedback: { color: '#abcdef', startFrequency: 120, endFrequency: 60, soundDuration: 0.4 },
  };
  expect(validateAbilities([definition])).toEqual([]);
  authored(definition, (game) => {
    const metal = game.world.spawn('metal_plate', { x: 530, y: 350 })!;
    const stone = game.world.spawn('rock', { x: 500, y: 400 })!;
    expect(game.castAbility(definition.id, { x: 500, y: 350 })).toBe(true);
    game.abilities.tick(1 / 120);
    expect(game.gravity.sample(metal.body.position, 1, ['metal']).x).toBeGreaterThan(0);
    expect(game.gravity.sample(stone.body.position, 1, ['stone'])).toEqual({ x: 0, y: 0 });
    expect(metal.chainId).not.toBeNull();
    expect(stone.chainId).toBeNull();
    expect(abilityFeedback(definition.id)).toMatchObject(definition.feedback!);
  });
});
it('definitions control planet multiplicity and momentum reversal without special IDs', () => {
  authored(
    { ...abilityById.get('planet')!, id: 'author_planets', parameters: { planetCount: 3 } },
    (game) => {
      game.castAbility('author_planets', { x: 600, y: 400 });
      expect(
        [...game.world.entities.values()].filter((entity) => entity.kind === 'rock'),
      ).toHaveLength(3);
      expect(game.gravity.fields.size).toBe(6);
    },
  );
  authored(
    {
      ...abilityById.get('pulse')!,
      id: 'author_momentum',
      strength: 0,
      evolution: undefined,
      parameters: { momentumScale: -0.5 },
    },
    (game) => {
      const rock = game.world.spawn('rock', { x: 400, y: 470 })!;
      Matter.Body.setVelocity(rock.body, { x: 8, y: 0 });
      game.castAbility('author_momentum', game.player.body.position);
      expect(Matter.Body.getVelocity(rock.body).x).toBeCloseTo(-4);
    },
  );
});
it('cast capacity checks reserve exactly the required fields and bodies before charging energy', () => {
  const game = new Game(false);
  game.start();
  const field = {
    source: 'test',
    mode: 'radial' as const,
    position: { x: 500, y: 350 },
    direction: { x: 0, y: 1 },
    strength: 0.001,
    radius: 100,
    falloff: 'linear' as const,
    remaining: 10,
  };
  for (let i = 0; i < 49; i++) game.gravity.addField(field);
  game.abilities.learn('planet');
  expect(game.castAbility('planet', field.position)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  game.abilities.learn('repulsor');
  expect(game.castAbility('repulsor', field.position)).toBe(true);
  expect(game.gravity.fields.size).toBe(50);
  expect(game.castAbility('pulse', field.position)).toBe(true);
});
