import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { freshMastery, masteryLevel, mergeMastery, readMastery } from '../src/progression/mastery';
import { newProfile, readProfile, settleRun } from '../src/progression/profile';
import { challenges } from '../src/content/challenges';
import { masteryMilestones } from '../src/content/mastery';
import { abilityById } from '../src/content/abilities';
import { validateAbilities } from '../src/content/validate';

const point = { x: 600, y: 400 };
function controlledRoom() {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('control-mastery');
  run.phase = 'room';
  game.gravity.strength = 0;
  game.abilities.learn('suspension');
  game.abilities.learn('tether_cut');
  game.abilities.learn('gyroscopic_brake');
  const enemy = game.world.spawn('chaser', { x: 1000, y: 400 })!;
  game.start();
  return { game, run, enemy };
}
function payloads(game: Game) {
  return [
    { x: 600, y: 300 },
    { x: 600, y: 500 },
    { x: 700, y: 400 },
  ].map((position) => game.world.spawn('metal_plate', position)!);
}

it('credits actual severed links without claiming their payload kills or changing motion', () => {
  const { game, run } = controlledRoom();
  const bodies = payloads(game);
  expect(game.castAbility('suspension', point)).toBe(true);
  const cause = game.createCause('pulse');
  for (const body of bodies) {
    Matter.Body.setVelocity(body.body, { x: 2, y: -3 });
    game.markCause(body, cause);
  }
  expect(game.castAbility('tether_cut', point)).toBe(true);
  expect(game.abilities.tethers).toHaveLength(0);
  expect(run.mastery.tether_cut).toMatchObject({
    casts: 1,
    controlTargets: 3,
    controlPeak: 3,
    kills: 0,
  });
  for (const body of bodies) {
    expect(Matter.Body.getVelocity(body.body)).toEqual({ x: 2, y: -3 });
    expect(game.chains.source(body.chainId)).toBe('pulse');
  }
  game.abilities.cooldowns.clear();
  expect(game.castAbility('tether_cut', point)).toBe(false);
  expect(run.mastery.tether_cut.casts).toBe(1);
  game.world.dispose();
});

it('ignores unchanged bodies, echo effects and interventions after all hostiles are gone', () => {
  const { game, run, enemy } = controlledRoom();
  const bodies = payloads(game);
  for (const body of bodies.slice(0, 2)) Matter.Body.setAngularVelocity(body.body, 0.2);
  expect(game.castAbility('gyroscopic_brake', point)).toBe(true);
  expect(run.mastery.gyroscopic_brake).toMatchObject({
    casts: 1,
    controlTargets: 2,
    controlPeak: 2,
  });
  game.abilities.cooldowns.clear();
  expect(game.castAbility('gyroscopic_brake', point)).toBe(true);
  expect(run.mastery.gyroscopic_brake.controlTargets).toBe(2);
  for (const body of bodies) Matter.Body.setAngularVelocity(body.body, 0.2);
  expect(game.abilities.cast('gyroscopic_brake', point, true)).toBe(true);
  expect(run.mastery.gyroscopic_brake.casts).toBe(2);
  expect(run.mastery.gyroscopic_brake.controlTargets).toBe(2);
  game.world.remove(enemy);
  for (const body of bodies) Matter.Body.setAngularVelocity(body.body, 0.2);
  game.abilities.cooldowns.clear();
  expect(game.castAbility('gyroscopic_brake', point)).toBe(true);
  expect(run.mastery.gyroscopic_brake.controlTargets).toBe(2);
  game.world.dispose();
});

it.each([2, 3])(
  'requires three contributing clears for mastery victory (%i cleared), including recovery',
  (roomCount) => {
    let game = new Game(false);
    let run = new Expedition(game);
    run.start('control-victory', 'manipulator', undefined, 0, { mode: 'boss_rush' });
    run.game.abilities.learn('suspension');
    run.game.abilities.learn('tether_cut');
    for (let room = 0; room < roomCount; room++) {
      expect(run.enter(run.available[0].id)).toBe(true);
      for (const entity of [...game.world.entities.values()])
        if (entity.definition.faction === 'neutral') game.world.remove(entity);
      payloads(game);
      expect(game.castAbility('suspension', point)).toBe(true);
      expect(game.castAbility('tether_cut', point)).toBe(true);
      // Direct damage is a room-flow fixture, not an unassisted playtest.
      for (const entity of [...game.world.entities.values()])
        if (entity.definition.faction === 'enemy') {
          entity.invulnerability = 0;
          while (entity.alive) game.applyDamage(entity, 85, game.createCause('pulse'));
        }
      game.step();
      expect(run.phase).toBe('reward');
      expect(run.mastery.tether_cut.controlRooms).toBe(room + 1);
      expect(run.mastery.tether_cut.controlBosses).toBe(room + 1);
      while (run.build.pending) {
        run.build.offer();
        run.build.choose(run.build.choices[0].id);
      }
      if (room === 0) {
        const checkpoint = JSON.parse(JSON.stringify(run.snapshot()));
        game.world.dispose();
        game = new Game(false);
        run = new Expedition(game);
        expect(run.restore(checkpoint)).toBe(true);
        expect(run.mastery.tether_cut.controlRooms).toBe(1);
      }
      // A shortened route isolates the victory threshold without ten guardian fixtures.
      if (room === roomCount - 1) run.current!.next = [];
      run.advance();
    }
    expect(run.won).toBe(true);
    expect(run.mastery.tether_cut).toMatchObject({
      kills: 0,
      controlRooms: roomCount,
      wins: Number(roomCount >= 3),
    });
    const profile = newProfile();
    expect(settleRun(profile, run)).toBe(true);
    expect(profile.challenges).toEqual(
      expect.arrayContaining(['tether_cut_breaker', 'tether_cut_cascade']),
    );
    expect(profile.challenges.includes('tether_cut_master')).toBe(roomCount >= 3);
    const shards = profile.shards;
    expect(settleRun(profile, run)).toBe(false);
    expect(profile.shards).toBe(shards);
    game.world.dispose();
  },
);

it('failed and abandoned chambers do not grant successful control encounters', () => {
  for (const outcome of ['defeat', 'abandon']) {
    const { game, run } = controlledRoom();
    payloads(game);
    game.castAbility('suspension', point);
    game.castAbility('tether_cut', point);
    if (outcome === 'abandon') run.abandon();
    else {
      game.player.health = 1;
      game.player.invulnerability = 0;
      game.applyDamage(game.player, 20, game.createCause());
      game.step();
    }
    expect(run.mastery.tether_cut.controlTargets).toBe(3);
    expect(run.mastery.tether_cut.controlRooms).toBe(0);
    expect(run.mastery.tether_cut.controlBosses).toBe(0);
    expect(run.mastery.tether_cut.wins).toBe(0);
    game.world.dispose();
  }
});

it('migrates legacy mastery without inventing interventions, retains awards and merges peaks by maximum', () => {
  const profile = newProfile();
  const legacy = { casts: 50, kills: 100, elites: 1, bosses: 1, chain: 10, wins: 1 };
  profile.challenges = ['gyroscopic_brake_force'];
  const migrated = readProfile({ ...profile, abilityMastery: { gyroscopic_brake: legacy } });
  expect(migrated.challenges).toContain('gyroscopic_brake_force');
  expect(migrated.abilityMastery.gyroscopic_brake).toEqual({ ...freshMastery(), ...legacy });
  expect(masteryLevel(migrated.abilityMastery.gyroscopic_brake, 'gyroscopic_brake')).toBe(1);
  const progress = {
    ...freshMastery(),
    casts: 50,
    controlTargets: 100,
    controlBosses: 1,
    controlRooms: 3,
    controlPeak: 3,
    wins: 1,
  };
  expect(masteryLevel(progress, 'tether_cut')).toBe(5);
  const first = readMastery({ tether_cut: progress });
  mergeMastery(first, { tether_cut: { ...progress, controlPeak: 2 } });
  expect(first.tether_cut.controlPeak).toBe(3);
  expect(first.tether_cut.controlTargets).toBe(200);
  expect(first.tether_cut.controlRooms).toBe(6);
});

it('authors objectives from the same definitions as challenges and rejects unsupported control reporting', () => {
  for (const id of ['tether_cut', 'gyroscopic_brake', 'pulse'])
    for (const milestone of masteryMilestones(id))
      expect(challenges.find((item) => item.id === `${id}_${milestone.id}`)).toMatchObject({
        metric: milestone.metric,
        target: milestone.target,
      });
  expect(
    validateAbilities([{ ...abilityById.get('pulse')!, mastery: 'control' }]).some((issue) =>
      issue.path.endsWith('mastery'),
    ),
  ).toBe(true);
});
