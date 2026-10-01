import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { RunBuild } from '../src/progression/build';
import { newProfile, readProfile, unlockClass } from '../src/progression/profile';
import { classById } from '../src/content/classes';

it('new classes unlock once, recover their starting build and apply their physical tradeoffs', () => {
  for (const id of ['conductor', 'kineticist']) {
    const profile = newProfile();
    profile.shards = 55;
    expect(unlockClass(profile, id)).toBe(true);
    expect(profile.shards).toBe(0);
    expect(unlockClass(profile, id)).toBe(false);
    profile.selectedClass = id;
    const restored = readProfile(JSON.parse(JSON.stringify(profile)));
    expect(restored.selectedClass).toBe(id);
    const run = new Expedition(new Game(false));
    run.start('new-class', id, restored);
    const checkpoint = run.snapshot();
    expect(run.restore(checkpoint)).toBe(true);
    expect(run.build.classId).toBe(id);
    for (const power of classById.get(id)!.powers)
      expect(run.game.abilities.levels.has(power)).toBe(true);
    if (id === 'kineticist') {
      expect(run.game.abilities.maxEnergy).toBe(85);
      expect(run.game.abilities.modifiers.evaluate('projectileDamage', 1)).toBe(1.5);
    } else {
      expect(run.build.activeSynergies).toContain('Tension Wave');
      expect(run.game.abilities.modifiers.evaluate('duration', 4, ['Gravity', 'Control'])).toBe(7);
    }
    run.game.world.dispose();
  }
});

it('new relic tradeoffs apply once and a tagged cast shield retains its cooldown across build refresh', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'new-relics');
  build.addRelic('hollow_reactor');
  build.addRelic('glass_meteor');
  build.addRelic('faraday_shell');
  build.apply();
  expect(game.abilities.maxEnergy).toBe(70);
  expect(game.maxHealth).toBe(75);
  expect(game.abilities.modifiers.evaluate('impactDamage', 1)).toBe(2.4);
  game.abilities.energy = 0;
  game.abilities.tick(1);
  expect(game.abilities.energy).toBe(13);
  game.abilities.energy = 70;
  game.abilities.learn('kinetic_brake');
  game.start();
  game.castAbility('kinetic_brake', { x: 600, y: 400 });
  expect(game.player.invulnerability).toBe(0.45);
  game.player.invulnerability = 0;
  build.apply();
  game.abilities.cooldowns.clear();
  game.castAbility('kinetic_brake', { x: 600, y: 400 });
  expect(game.player.invulnerability).toBe(0);
  game.world.dispose();
});

it('Kinetic Reflex works with the evolved Brake family and checks energy after payment', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'kinetic-reflex');
  game.abilities.learn('counterthrow');
  game.abilities.learn('reflect');
  build.apply();
  expect(build.activeSynergies).toContain('Kinetic Reflex');
  game.abilities.energy = 60;
  game.start();
  game.castAbility('counterthrow', { x: 600, y: 400 });
  expect(game.abilities.energy).toBe(30);
  expect(game.player.invulnerability).toBe(0.5);
  game.world.dispose();
});
