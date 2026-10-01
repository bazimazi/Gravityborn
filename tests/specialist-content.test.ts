import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';

it('specialist fields filter real material and projectile responses without bending unrelated matter', () => {
  for (const [id, affected, untouched] of [
    ['magnet_well', ['metal'], ['stone']],
    ['scrap_cyclone', ['metal'], ['crystal']],
    ['magnetic_relay', ['metal'], ['stone']],
    ['crystal_surge', ['crystal'], ['metal']],
    ['ballistic_tunnel', ['plasma', 'Projectile'], ['metal']],
    ['shot_sink', ['plasma', 'Projectile'], ['stone']],
  ] as const) {
    const game = new Game(false);
    game.abilities.learn(id);
    expect(game.abilities.cast(id, { x: 700, y: 400 })).toBe(true);
    const field = [...game.gravity.fields.values()].find(
      (field) => field.source === `ability:${id}`,
    )!;
    const point = { x: field.position.x + 40, y: field.position.y };
    expect(game.gravity.sample(point, 1, affected)).not.toEqual({ x: 0, y: game.gravity.strength });
    expect(game.gravity.sample(point, 1, untouched)).toEqual({ x: 0, y: game.gravity.strength });
    game.world.dispose();
  }
});

it('material rails launch the selected bodies and stasis leaves other matter free', () => {
  for (const id of ['stonebreaker', 'gravity_rail']) {
    const game = new Game(false);
    Matter.Body.setPosition(game.player.body, { x: 400, y: 400 });
    const rock = game.world.spawn('rock', { x: 600, y: 400 })!;
    const crate = game.world.spawn('crate', { x: 650, y: 400 })!;
    game.abilities.learn(id);
    expect(game.abilities.cast(id, { x: 900, y: 400 })).toBe(true);
    expect((id === 'stonebreaker' ? rock : crate).body.velocity.x).toBeGreaterThan(0);
    expect((id === 'stonebreaker' ? crate : rock).body.velocity.x).toBe(0);
    game.world.dispose();
  }
  const game = new Game(false);
  const shot = game.world.spawn('projectile', { x: 600, y: 400 })!;
  const rock = game.world.spawn('rock', { x: 650, y: 400 })!;
  game.abilities.learn('shot_stasis');
  game.abilities.cast('shot_stasis', shot.body.position);
  expect(shot.body.isStatic).toBe(true);
  expect(rock.body.isStatic).toBe(false);
  game.time = 2.1;
  game.abilities.tick(0);
  expect(shot.body.isStatic).toBe(false);
  game.world.dispose();
});

it('Void Step affects only the core and restores its previous response without giving damage immunity', () => {
  const game = new Game(false);
  const rock = game.world.spawn('rock', {
    x: game.player.body.position.x + 20,
    y: game.player.body.position.y,
  })!;
  game.player.gravityScale = -0.5;
  game.abilities.learn('void_step');
  game.abilities.cast('void_step', game.player.body.position);
  expect(game.player.gravityScale).toBe(0);
  expect(rock.gravityScale).toBe(1);
  game.applyDamage(game.player, 10, game.createCause('environment'));
  expect(game.player.health).toBe(90);
  game.time = 3.1;
  game.abilities.tick(0);
  expect(game.player.gravityScale).toBe(-0.5);
  game.world.dispose();
});

it('Null Engine suppresses gravity only while its physical source survives', () => {
  const game = new Game(false);
  game.abilities.learn('null_engine');
  game.abilities.cast('null_engine', { x: 600, y: 400 });
  const machine = [...game.world.entities.values()].find(
    (entity) => entity.kind === 'gravity_machine',
  )!;
  expect(game.gravity.sample({ x: 650, y: 400 })).toEqual({ x: 0, y: 0 });
  game.world.remove(machine);
  game.abilities.tick(0);
  expect(game.gravity.sample({ x: 650, y: 400 }).y).toBe(game.gravity.strength);
  game.world.dispose();
});

it('the planet evolution reaches a three-body solar system under shared body and field budgets', () => {
  const game = new Game(false);
  for (let index = 0; index < 4; index++) game.abilities.learn('planet');
  for (let index = 0; index < 2; index++) game.abilities.learn('binary');
  expect(game.abilities.learn('binary')).toBe('solar_system');
  const before = game.world.entities.size;
  expect(game.abilities.cast('solar_system', { x: 750, y: 450 })).toBe(true);
  expect(game.world.entities.size).toBe(before + 3);
  expect(game.gravity.fields.size).toBe(6);
  game.world.dispose();
});

it('well relics compose pair limits and compression without multiplying pair count', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'well-relics');
  build.wellLevel = 3;
  build.addRelic('twin_gate');
  build.addRelic('wide_horizon');
  build.addRelic('pinpoint_compactor');
  game.start();
  expect(game.createWell({ x: 700, y: 400 })).toBe(true);
  expect(
    [...game.gravity.fields.values()].filter((field) => field.source === 'player-well'),
  ).toHaveLength(2);
  expect(game.abilities.modifiers.evaluate('wellCompression', 0)).toBe(2);
  expect(game.wellCooldown).toBeGreaterThan(5.5);
  game.world.dispose();
});

it('relic fields acquire late entrants, retain orbital damage tags, and respect gravity suppression', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'relic-cause');
  build.addRelic('crown');
  game.world.spawn('anchor', { x: 1050, y: 200 });
  const blocker = game.gravity.addField({
    source: 'test',
    mode: 'zero',
    position: { ...game.player.body.position },
    direction: { x: 0, y: 1 },
    strength: 1,
    radius: 400,
    remaining: 20,
    falloff: 'constant',
  });
  const shot = game.world.spawn('projectile', {
    x: game.player.body.position.x + 70,
    y: game.player.body.position.y,
  })!;
  game.start();
  game.step();
  expect(shot.chainId).toBeNull();
  game.gravity.removeField(blocker);
  game.step();
  expect(game.chains.source(shot.chainId)).toBe('relic');
  expect(game.chains.tags(shot.chainId)).toContain('Orbit');
  game.world.dispose();
});
