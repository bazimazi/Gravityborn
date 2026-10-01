import { expect, it, vi } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import balance from '../src/data/balance.json';

function setup(id = 'beacon') {
  const game = new Game(false);
  game.world.spawn('heavy', { x: 1000, y: 600 });
  game.gravity.strength = 0;
  game.abilities.learn(id);
  game.start();
  expect(game.castAbility(id, { x: 500, y: 400 })).toBe(true);
  const machine = [...game.world.entities.values()].find(
    (entity) => entity.kind === 'gravity_machine',
  )!;
  const field = [...game.gravity.fields.values()].find(
    (field) => field.source === `ability:${id}`,
  )!;
  return { game, machine, field };
}
it('deploys real movable mass whose attraction and ownership follow its position', () => {
  const { game, machine, field } = setup();
  expect(machine.body.isStatic).toBe(false);
  expect(machine.body.mass).toBe(8);
  expect(game.gravity.sample({ x: 580, y: 400 }).x).toBeLessThan(0);
  const crate = game.world.spawn('crate', { x: 600, y: 400 })!;
  game.world.impulse(machine, { x: 8, y: -2 });
  for (let i = 0; i < 10; i++) game.step();
  game.abilities.tick(0);
  expect(machine.body.position.x).toBeGreaterThan(510);
  expect(field.position).toEqual(machine.body.position);
  expect(game.chains.source(crate.chainId)).toBe('beacon');
  game.world.dispose();
});
it('destroying or expiring a machine removes its field and never spawns a second automatic field', () => {
  const { game, machine, field } = setup();
  game.objects.update(machine);
  expect(game.gravity.fields.size).toBe(1);
  game.applyDamage(machine, 85, game.createCause());
  expect(machine.alive).toBe(false);
  game.abilities.tick(0);
  expect(game.gravity.fields.has(field.id)).toBe(false);
  game.world.dispose();
  const expired = setup();
  expired.game.time = 8.1;
  expired.game.abilities.tick(0);
  expect(expired.machine.alive).toBe(false);
  expect(expired.game.gravity.fields.size).toBe(0);
  expired.game.world.dispose();
});
it('the evolved machine applies tangential gravity through the shared field authority', () => {
  const { game, machine } = setup('orbital_engine');
  const acceleration = game.gravity.sample({
    x: machine.body.position.x + 100,
    y: machine.body.position.y,
  });
  expect(acceleration.x).toBeCloseTo(0);
  expect(acceleration.y).toBeLessThan(0);
  game.world.dispose();
});
it('rejects deployment at either production capacity before spending energy or assigning a cause', () => {
  for (const kind of ['bodies', 'fields']) {
    const game = new Game(false);
    game.abilities.learn('beacon');
    game.start();
    if (kind === 'bodies')
      while (game.world.entities.size < balance.physics.maxBodies)
        game.world.spawn('crate', { x: 600, y: 400 });
    else
      while (game.gravity.fields.size < balance.physics.maxFields)
        game.gravity.addField({
          source: 'budget',
          mode: 'zero',
          position: { x: 600, y: 400 },
          direction: { x: 0, y: 0 },
          strength: 1,
          radius: 10,
          remaining: 1,
          falloff: 'constant',
        });
    const cause = vi.spyOn(game, 'createCause');
    expect(game.castAbility('beacon', { x: 500, y: 400 })).toBe(false);
    expect(game.abilities.energy).toBe(100);
    expect(cause).not.toHaveBeenCalled();
    game.world.dispose();
  }
});
it('the Engineer starts with deployment and saved upgrades retain its evolution path', () => {
  const run = new Expedition(new Game(false));
  run.start('machines', 'engineer');
  expect(run.game.abilities.levels.has('beacon')).toBe(true);
  run.game.abilities.learn('beacon');
  run.game.abilities.learn('beacon');
  expect(run.game.abilities.learn('beacon')).toBe('orbital_engine');
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.game.abilities.levels.get('orbital_engine')).toBe(1);
  expect(restored.game.abilities.modifiers.evaluate('energyCost', 32)).toBeCloseTo(22.4);
  run.game.world.dispose();
  restored.game.world.dispose();
});
