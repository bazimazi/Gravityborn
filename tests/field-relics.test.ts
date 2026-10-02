import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import { abilityById } from '../src/content/abilities';

it('field clock modifiers apply to one cast snapshot without mutating authored periods', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'field-clock');
  build.addRelic('cycle_dial');
  game.abilities.learn('pulsing_well');
  game.abilities.cast('pulsing_well', { x: 800, y: 400 });
  const field = [...game.gravity.fields.values()][0];
  expect(field.remaining).toBe(4.5);
  game.time = 0.5;
  game.abilities.tick(0.5);
  expect(field.strength).toBeCloseTo(-0.006);
  expect(abilityById.get('pulsing_well')!.parameters!.strengthPeriod).toBe(2);
  build.addRelic('long_watch');
  game.time = 1;
  game.abilities.tick(0.5);
  expect(field.strength).toBeCloseTo(0.006);
  game.abilities.cast('pulsing_well', { x: 800, y: 400 }, true);
  const next = [...game.gravity.fields.values()][1];
  expect(next.remaining).toBe(6.75);
  game.time = 2;
  game.abilities.tick(1);
  expect(next.strength).toBeCloseTo(-0.006);
  game.world.dispose();
});

it('orbital relics alter geometry and direction; a Still Crown preserves a following pattern', () => {
  const game = new Game(false);
  Matter.Body.setPosition(game.player.body, { x: 300, y: 400 });
  const build = new RunBuild(game, 'field-geometry');
  build.addRelic('reverse_bearing');
  build.addRelic('tight_epicycle');
  game.abilities.learn('orbital_lantern');
  game.abilities.cast('orbital_lantern', { x: 800, y: 400 });
  const field = [...game.gravity.fields.values()][0];
  expect(field.radius).toBe(128);
  game.time = Math.PI / 4;
  game.abilities.tick(game.time);
  expect(field.position.x).toBeCloseTo(300);
  expect(field.position.y).toBeCloseTo(339.5);
  build.addRelic('still_crown');
  game.abilities.cast('orbital_lantern', { x: 800, y: 400 }, true);
  const still = [...game.gravity.fields.values()][1];
  Matter.Body.setPosition(game.player.body, { x: 500, y: 400 });
  game.time += 1;
  game.abilities.tick(1);
  expect(still.position.x).toBeCloseTo(560.5);
  expect(still.position.y).toBeCloseTo(400);
  expect(abilityById.get('orbital_lantern')!.parameters!.orbitSpeed).toBe(2);
  game.world.dispose();
});

it('field echoes share caps and cannot recursively echo themselves', () => {
  for (const occupied of [0, 45]) {
    const game = new Game(false);
    game.world.spawn('heavy', { x: 1050, y: 100 });
    const build = new RunBuild(game, 'field-echo');
    build.addRelic('refraction_lattice');
    game.abilities.learn('quadrupole');
    for (let i = 0; i < occupied; i++)
      game.gravity.addField({
        source: 'budget',
        mode: 'radial',
        position: { x: 50, y: 50 },
        direction: { x: 0, y: 1 },
        strength: 0.001,
        radius: 5,
        remaining: 20,
        falloff: 'linear',
      });
    const casts: string[][] = [];
    game.events.on('abilityUsed', (event) => casts.push(event.tags));
    game.start();
    expect(game.castAbility('quadrupole', { x: 650, y: 400 })).toBe(true);
    expect(game.abilities.energy).toBeCloseTo(100 - 48 * 1.15);
    for (let i = 0; i < 60; i++) game.step();
    expect(game.gravity.fields.size).toBe(occupied ? 49 : 8);
    expect(casts).toHaveLength(occupied ? 1 : 2);
    if (!occupied) expect(casts[1]).toContain('Echo');
    game.world.dispose();
  }
});

it('all field definitions expose the Field tag and field-only triggers leave impulse casts alone', () => {
  for (const ability of abilityById.values())
    if (ability.effect === 'field') expect(ability.tags).toContain('Field');
  const game = new Game(false);
  const build = new RunBuild(game, 'field-gates');
  build.addRelic('damping_lattice');
  const rock = game.world.spawn('rock', {
    x: game.player.body.position.x + 70,
    y: game.player.body.position.y,
  })!;
  Matter.Body.setVelocity(rock.body, { x: 8, y: 0 });
  game.abilities.learn('zero_bloom');
  game.start();
  game.castAbility('zero_bloom', { x: 900, y: 400 });
  expect(rock.body.velocity.x).toBe(4);
  expect(game.chains.source(rock.chainId)).toBe('relic');
  expect(game.abilities.modifiers.fire('OnAbilityCast', 10, ['Impact'])).toEqual([]);
  game.world.dispose();
});

it('field-attributed physical impacts earn Carrier Recovery', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'field-kill');
  build.addRelic('carrier_recovery');
  game.gravity.strength = 0;
  const rock = game.world.spawn('rock', { x: 700, y: 350 })!;
  const enemy = game.world.spawn('chaser', { x: 750, y: 350 })!;
  enemy.health = 1;
  Matter.Body.setVelocity(rock.body, { x: 12, y: 0 });
  game.abilities.learn('pulsing_well');
  game.abilities.cast('pulsing_well', { x: 800, y: 350 }, true);
  game.abilities.energy = 0;
  const kills: string[][] = [];
  game.events.on('killed', (event) => {
    if (event.kind === 'chaser') kills.push(event.damageTags);
  });
  game.start();
  for (let step = 0; step < 12 && enemy.alive; step++) game.step();
  expect(enemy.alive).toBe(false);
  expect(kills[0]).toContain('Field');
  expect(game.abilities.energy).toBeGreaterThanOrEqual(6);
  game.world.dispose();
});
