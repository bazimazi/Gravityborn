import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile } from '../src/progression/profile';
import { isEndlessMode, planetaryRoute } from '../src/content/modes';
import { challengeCode, readChallengeCode } from '../src/progression/challenge-code';
import { replayRevision } from '../src/progression/archive';

function planets(game: Game) {
  return [...game.world.entities.values()].filter(
    (entity) => entity.kind === 'rock' || entity.kind === 'fragment',
  );
}
function setup() {
  const game = new Game(false);
  for (const id of ['planet', 'planet_split', 'densify', 'polarity']) game.abilities.learn(id);
  expect(game.abilities.cast('planet', { x: 800, y: 400 }, true)).toBe(true);
  return game;
}

it('Planet Split requires an owned summoned planet and leaves resources untouched on failure', () => {
  const game = new Game(false);
  game.abilities.learn('planet_split');
  game.world.spawn('rock', { x: 800, y: 400 });
  expect(game.abilities.cast('planet_split', { x: 800, y: 400 })).toBe(false);
  expect(game.abilities.energy).toBe(100);
  expect(game.abilities.cooldowns.size).toBe(0);
  expect(planets(game)).toHaveLength(1);
  game.world.dispose();
});

it('Planet Split conserves base mass and inherited momentum while temporary mass and response effects retain their expiry', () => {
  const game = setup();
  const parent = planets(game)[0];
  Matter.Body.setVelocity(parent.body, { x: 2, y: 4 });
  game.abilities.cast('densify', parent.body.position, true);
  game.abilities.cast('polarity', parent.body.position, true);
  const mass = parent.body.mass;
  const response = parent.gravityScale * parent.definition.gravityResponse;
  game.time = 2;
  expect(game.abilities.cast('planet_split', parent.body.position)).toBe(true);
  const children = planets(game);
  expect(parent.alive).toBe(false);
  expect(children).toHaveLength(2);
  expect(children.reduce((sum, child) => sum + child.body.mass, 0)).toBeCloseTo(mass);
  expect(
    children.reduce((sum, child) => sum + child.body.velocity.x * child.body.mass, 0),
  ).toBeCloseTo(2 * mass);
  for (const child of children) {
    expect(child.body.velocity.y).toBe(4);
    expect(child.gravityScale * child.definition.gravityResponse).toBeCloseTo(response);
    expect(child.definition.breakable).toBe(true);
    expect(game.chains.source(child.chainId)).toBe('planet_split');
  }
  expect(game.gravity.fields.size).toBe(4);
  game.time = 5.1;
  game.abilities.tick(0);
  for (const child of children) {
    expect(child.body.mass).toBeCloseTo(parent.massBase / 2);
    expect(child.gravityScale * child.definition.gravityResponse).toBeCloseTo(-response);
  }
  game.time = 8.1;
  game.abilities.tick(0);
  expect(planets(game)).toHaveLength(0);
  expect(game.gravity.fields.size).toBe(0);
  game.world.dispose();
});

it('Planet Split preflights both children against geometry and field capacity before consuming its parent', () => {
  for (const blocked of ['wall', 'fields'] as const) {
    const game = setup();
    const parent = planets(game)[0];
    if (blocked === 'wall') game.world.addWall(850, 400, 20, 100);
    else
      for (let i = 0; i < 47; i++)
        game.gravity.addField({
          source: 'test',
          mode: 'radial',
          position: { x: 100, y: 100 },
          direction: { x: 0, y: 1 },
          strength: 0.001,
          radius: 10,
          falloff: 'linear',
          remaining: 20,
        });
    expect(game.abilities.cast('planet_split', parent.body.position)).toBe(false);
    expect(parent.alive).toBe(true);
    expect(planets(game)).toHaveLength(1);
    expect(game.abilities.energy).toBe(100);
    expect(game.abilities.cooldowns.size).toBe(0);
    game.world.dispose();
  }
});

it('repeated splitting never extends the original lifetime and destroyed moons lose both fields', () => {
  const game = setup();
  game.time = 6;
  game.abilities.cast('planet_split', planets(game)[0].body.position, true);
  game.time = 7;
  game.abilities.cast('planet_split', planets(game)[0].body.position, true);
  expect(planets(game)).toHaveLength(3);
  const child = planets(game)[0];
  child.health = 1;
  game.applyDamage(child, 10, game.createCause());
  game.abilities.tick(0);
  expect(game.gravity.fields.size).toBe(4);
  game.time = 8.1;
  game.abilities.tick(0);
  expect(planets(game)).toHaveLength(0);
  expect(game.gravity.fields.size).toBe(0);
  game.world.dispose();
});

it('Planet Split refuses body saturation and mass clamping that would create extra matter', () => {
  for (const blocked of ['bodies', 'tiny', 'saturated'] as const) {
    const game = setup();
    const parent = planets(game)[0];
    if (blocked === 'bodies')
      while (game.world.entities.size < 220) game.world.spawn('crate', { x: 100, y: 100 });
    else {
      game.world.setMass(parent, blocked === 'tiny' ? 0.01 : 500);
      if (blocked === 'saturated') game.abilities.cast('densify', parent.body.position, true);
    }
    expect(game.abilities.cast('planet_split', parent.body.position)).toBe(false);
    expect(parent.alive).toBe(true);
    expect(game.abilities.energy).toBe(100);
    game.world.dispose();
  }
});

it('Planetary Endless requires its unlock, starts in the colonies and keeps planetary physics alongside event changes', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('planetfall', 'manipulator', newProfile(), 0, { mode: 'planetary' });
  expect(run.mode).toBe('standard');
  const profile = newProfile();
  profile.skills.push('endless');
  run.start('planetfall', 'manipulator', profile, 0, { mode: 'planetary' });
  expect(isEndlessMode(run.mode)).toBe(true);
  expect(run.startBiome).toBe(planetaryRoute()[0]);
  expect(game.abilities.levels.has('planet')).toBe(true);
  expect(game.abilities.levels.has('planet_split')).toBe(true);
  run.phenomenon = 'dense';
  run.enter(run.available[0].id);
  expect(game.rules.endlessStage).toBe(1);
  expect(game.rules.activePhenomena).toEqual(['dense', 'collision']);
  game.step();
  expect(
    [...game.gravity.fields.values()].filter((field) => field.source === 'phenomenon'),
  ).toHaveLength(2);
  game.world.dispose();
});

it('Planetary Endless cycles its authored route, restores checkpoints and shares its recipe', () => {
  const profile = newProfile();
  profile.skills.push('endless');
  const run = new Expedition(new Game(false));
  run.start('planetfall', 'manipulator', profile, 0, { mode: 'planetary' });
  const route = planetaryRoute();
  for (let index = 1; index <= 4; index++) {
    run.current = run.map.find((node) => node.type === 'boss')!;
    run.phase = 'reward';
    expect(run.advance()).toBe(true);
    expect(run.won).toBe(false);
    expect(run.biome).toBe(route[index % route.length]);
    expect(run.depth).toBe(index);
  }
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.mode).toBe('planetary');
  expect(restored.available).toEqual(run.available);
  const recipe = {
    seed: run.seed,
    mode: run.mode,
    classId: run.classId,
    biome: run.startBiome,
    contract: run.contract,
    difficulty: run.difficulty,
  };
  expect(readChallengeCode(challengeCode(recipe, replayRevision)).recipe).toEqual(recipe);
  run.game.world.dispose();
  restored.game.world.dispose();
});
