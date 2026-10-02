import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import { abilityById } from '../src/content/abilities';
import { validateAbilities } from '../src/content/validate';

const point = { x: 600, y: 400 };
function setup(...powers: string[]) {
  const game = new Game(false);
  game.gravity.strength = 0;
  for (const power of powers) game.abilities.learn(power);
  return game;
}
function cluster(game: Game, count = 4) {
  return Array.from(
    { length: count },
    (_, i) => game.world.spawn('rock', { x: 630 + i * 45, y: 400 })!,
  );
}

it('star networks share one hub while rings close every endpoint into a loop', () => {
  for (const power of ['star_bind', 'ring_bind']) {
    const game = setup(power);
    const bodies = cluster(game);
    expect(game.abilities.cast(power, point)).toBe(true);
    const links = game.abilities.tethers;
    expect(links).toHaveLength(power === 'star_bind' ? 3 : 4);
    if (power === 'star_bind') expect(links.every((link) => link.a === bodies[0])).toBe(true);
    else
      for (const body of bodies)
        expect(links.filter((link) => link.a === body || link.b === body)).toHaveLength(2);
    expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(links.length);
    game.world.dispose();
  }
});

it('ring preflight and network budgets are atomic before payment and cooldown', () => {
  const game = setup('ring_bind', 'tether');
  cluster(game, 2);
  expect(game.abilities.cast('ring_bind', point)).toBe(false);
  expect(game.abilities.energy).toBe(100);
  expect(game.abilities.cooldowns.size).toBe(0);
  game.world.spawn('crate', { x: 650, y: 470 });
  for (let i = 0; i < 10; i++) game.abilities.cast('tether', point, true);
  expect(game.abilities.cast('ring_bind', point)).toBe(false);
  expect(game.abilities.tethers).toHaveLength(10);
  expect(game.abilities.energy).toBe(100);
  expect(game.abilities.cooldowns.size).toBe(0);
  game.world.dispose();
});

it('core train includes the player exactly once and transmits actual constraint motion', () => {
  const game = setup('core_train');
  Matter.Body.setPosition(game.player.body, { x: 450, y: 400 });
  const bodies = cluster(game, 3);
  game.abilities.cast('core_train', point, true);
  expect(game.abilities.tethers).toHaveLength(3);
  expect(game.abilities.tethers[0].a).toBe(game.player);
  const start = bodies[0].body.position.x;
  for (let i = 0; i < 30; i++) {
    game.time += 1 / 120;
    game.abilities.tick(1 / 120);
    game.world.step();
  }
  expect(bodies[0].body.position.x).toBeLessThan(start);
  expect(game.player.body.position.x).toBeGreaterThan(450);
  expect(game.chains.source(bodies[0].chainId)).toBe('core_train');
  game.world.dispose();
});

it('fixed anchors remain in world space while a grapple reels the core toward them', () => {
  const game = setup('gravity_grapple');
  Matter.Body.setPosition(game.player.body, { x: 300, y: 400 });
  expect(game.abilities.cast('gravity_grapple', point, true)).toBe(true);
  const link = game.abilities.tethers[0];
  expect(link.b).toBeUndefined();
  expect(link.body.bodyB).toBeUndefined();
  for (let i = 0; i < 120; i++) {
    game.time += 1 / 120;
    game.abilities.tick(1 / 120);
    game.world.step();
  }
  expect(game.abilities.tethers).toHaveLength(1);
  expect(game.player.body.position.x).toBeGreaterThan(300);
  expect(link.body.pointB).toEqual(point);
  expect(link.body.length).toBeCloseTo(180 - 140 / 3);
  game.time = 3.1;
  game.abilities.tick(0);
  expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(0);
  game.world.dispose();
});

it('anchoring rejects walls, out-of-range grapples and frozen cores without spending', () => {
  const game = setup('gravity_grapple');
  Matter.Body.setPosition(game.player.body, { x: 100, y: 400 });
  expect(game.abilities.cast('gravity_grapple', point)).toBe(false);
  const nearby = { x: 300, y: 400 };
  game.world.addWall(300, 400, 30, 100);
  expect(game.abilities.cast('gravity_grapple', nearby)).toBe(false);
  expect(game.abilities.cast('gravity_grapple', { x: -1, y: 400 })).toBe(false);
  Matter.Body.setStatic(game.player.body, true);
  expect(game.abilities.cast('gravity_grapple', { x: 200, y: 400 })).toBe(false);
  expect(game.abilities.energy).toBe(100);
  expect(game.abilities.cooldowns.size).toBe(0);
  expect(game.abilities.tethers).toHaveLength(0);
  game.world.dispose();
});

it('winch and spreader lengths use absolute simulation time independently of tick size', () => {
  for (const [power, middle] of [
    ['winch', 105],
    ['spreader', 120],
  ] as const) {
    const game = setup(power);
    cluster(game, 2);
    game.abilities.cast(power, point, true);
    game.time = 2;
    game.abilities.tick(0.01);
    expect(game.abilities.tethers[0].body.length).toBe(middle);
    game.abilities.tick(1.9);
    expect(game.abilities.tethers[0].body.length).toBe(middle);
    game.world.dispose();
  }
});

it('anchored projectiles release on generation change and a frozen endpoint stays attached until expiry', () => {
  const game = setup('skyhook');
  const shot = game.world.spawn('projectile', { x: 730, y: 400 })!;
  game.abilities.cast('skyhook', point, true);
  Matter.Body.setStatic(shot.body, true);
  game.abilities.tick(0);
  expect(game.abilities.tethers).toHaveLength(1);
  expect(shot.redirected).toBe(false);
  Matter.Body.setStatic(shot.body, false);
  game.abilities.tick(0);
  expect(shot.redirected).toBe(true);
  game.world.remove(shot);
  expect(game.world.spawn('projectile', point)).toBe(shot);
  game.abilities.tick(0);
  expect(game.abilities.tethers).toHaveLength(0);
  expect(shot.redirected).toBe(false);
  game.world.dispose();
});

it('spool, damping and terminal relics modify a bounded cast snapshot including both winch lengths', () => {
  const game = setup('winch', 'suspension');
  const build = new RunBuild(game, 'tether-relations');
  cluster(game, 6);
  build.addRelic('short_spool');
  build.addRelic('dashpot');
  build.addRelic('extra_terminal');
  game.abilities.cast('winch', point, true);
  expect(game.abilities.tethers).toHaveLength(2);
  const link = game.abilities.tethers[0];
  expect(link.startLength).toBe(108);
  expect(link.endLength).toBe(20);
  expect(link.body.stiffness).toBeCloseTo(0.052);
  expect(link.body.damping).toBe(0.2);
  build.addRelic('live_wire');
  expect(link.body.damping).toBe(0.2);
  game.abilities.cast('suspension', point, true);
  expect(game.abilities.tethers).toHaveLength(6);
  expect(game.abilities.tethers[2].body.damping).toBe(0);
  expect(abilityById.get('winch')!.parameters!.tetherLength).toBe(180);
  game.world.dispose();
});

it('clockwork reels finish the same trajectory sooner and tether tags cover original evolutions', () => {
  const game = setup('winch');
  const build = new RunBuild(game, 'tether-clock');
  build.addRelic('clockwork_reel');
  cluster(game, 2);
  game.abilities.cast('winch', point);
  expect(game.abilities.cooldowns.get('winch')).toBeCloseTo(6.4);
  game.time = 1.2;
  game.abilities.tick(0);
  expect(game.abilities.tethers[0].body.length).toBe(105);
  for (const definition of abilityById.values())
    if (definition.effect === 'tether') expect(definition.tags).toContain('Tether');
  game.world.dispose();
});

it('invalid tether topology, target counts and length parameters fail content validation', () => {
  const definition = structuredClone(abilityById.get('ring_bind')!);
  expect(validateAbilities([definition])).toEqual([]);
  definition.parameters!.chainTargets = 2;
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
  definition.parameters!.chainTargets = 3;
  definition.parameters!.tetherDamping = -1;
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
  definition.parameters!.tetherDamping = 0.1;
  definition.parameters!.tetherEndLength = 900;
  expect(validateAbilities([definition]).length).toBeGreaterThan(0);
});

it('tether echoes enforce the shared link budget and cannot repeat recursively', () => {
  for (const occupied of [0, 10]) {
    const game = setup('tether', 'star_bind');
    const build = new RunBuild(game, 'knotted-echo');
    cluster(game, 4);
    game.world.spawn('heavy', { x: 1000, y: 100 });
    for (let i = 0; i < occupied; i++) game.abilities.cast('tether', point, true);
    build.addRelic('knotted_echo');
    build.addRelic('lifeline');
    game.start();
    // A two-body tether uses one free slot; its echo consumes the last slot.
    expect(game.castAbility('tether', point)).toBe(true);
    expect(game.player.invulnerability).toBe(0.5);
    for (let i = 0; i < 30; i++) game.step();
    expect(game.abilities.tethers).toHaveLength(occupied + 2);
    expect(game.abilities.energy).toBeLessThan(80);
    game.world.dispose();
  }
});

it('a tether-driven impact stores charge through Tension Capacitor', () => {
  const game = setup('skyhook');
  const build = new RunBuild(game, 'tension-kill');
  build.addRelic('tension_capacitor');
  const rock = game.world.spawn('rock', { x: 700, y: 350 })!;
  const enemy = game.world.spawn('chaser', { x: 750, y: 350 })!;
  enemy.health = 1;
  Matter.Body.setVelocity(rock.body, { x: 12, y: 0 });
  game.abilities.cast('skyhook', { x: 600, y: 350 }, true);
  const kills: string[][] = [];
  game.events.on('killed', (event) => kills.push(event.damageTags));
  game.start();
  for (let i = 0; i < 12 && enemy.alive; i++) game.step();
  expect(enemy.alive).toBe(false);
  expect(kills[0]).toContain('Tether');
  expect(game.abilities.stored).toBe(12);
  game.world.dispose();
});
