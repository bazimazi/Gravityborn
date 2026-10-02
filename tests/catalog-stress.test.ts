import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import { abilities } from '../src/content/abilities';
import { relics } from '../src/content/relics';
import balance from '../src/data/balance.json';

for (const reverse of [false, true])
  it(`full catalog interactions remain bounded and save-safe in ${reverse ? 'reverse' : 'forward'} cast order`, () => {
    const game = new Game(false);
    const build = new RunBuild(game, 'catalog-interactions');
    // Deliberately extreme test loadout, not a claim about naturally acquired builds.
    build.relics.push(...relics.map((relic) => relic.id));
    build.apply();
    for (const definition of abilities)
      for (let level = 0; level < definition.maxLevel; level++) game.abilities.learn(definition.id);
    for (let index = 0; index < 60; index++) {
      const entity = game.world.spawn(index % 3 ? 'metal_plate' : 'rock', {
        x: 350 + (index % 10) * 65,
        y: 200 + Math.floor(index / 10) * 65,
      })!;
      entity.invulnerability = 60;
    }
    for (let index = 0; index < 12; index++) {
      const enemy = game.world.spawn(index % 2 ? 'shooter' : 'heavy', {
        x: 400 + (index % 6) * 100,
        y: 200 + Math.floor(index / 6) * 300,
      })!;
      enemy.invulnerability = 60;
    }
    game.player.invulnerability = 60;
    game.start();
    const schedule = reverse ? [...abilities].reverse() : abilities;
    let accepted = 0;
    for (let step = 0; step < 1200; step++) {
      if (step % 6 === 0) {
        game.abilities.energy = game.abilities.maxEnergy;
        const definition = schedule[Math.floor(step / 6) % schedule.length];
        accepted += Number(game.castAbility(definition.id, { x: 650, y: 400 }));
      }
      if (step % 120 === 0) game.flip({ x: step % 240 ? -1 : 1, y: 0 });
      game.step();
      expect(game.world.entities.size).toBeLessThanOrEqual(balance.physics.maxBodies);
      expect(game.gravity.fields.size).toBeLessThanOrEqual(balance.physics.maxFields);
      expect(game.abilities.tethers.length).toBeLessThanOrEqual(balance.physics.maxTethers);
      expect(Matter.Composite.allConstraints(game.world.engine.world)).toHaveLength(
        game.abilities.tethers.length,
      );
      for (const entity of game.world.entities.values()) {
        expect(
          Number.isFinite(entity.body.position.x + entity.body.position.y + entity.body.angle),
        ).toBe(true);
        expect(Math.hypot(entity.body.velocity.x, entity.body.velocity.y)).toBeLessThanOrEqual(
          balance.physics.maxVelocity + 1e-7,
        );
        expect(Math.abs(entity.body.angularVelocity)).toBeLessThanOrEqual(
          balance.physics.maxAngularVelocity + 1e-7,
        );
        if (!entity.body.isStatic) expect(entity.body.mass).toBeGreaterThan(0);
      }
    }
    expect(accepted).toBeGreaterThan(40);
    const restored = new Game(false);
    const restoredBuild = new RunBuild(restored, 'restored');
    restoredBuild.restore(JSON.parse(JSON.stringify(build.snapshot())));
    restored.abilities.restore(JSON.parse(JSON.stringify(game.abilities.snapshot())));
    restoredBuild.apply();
    expect(restoredBuild.relics).toEqual(build.relics);
    expect(restored.abilities.levels).toEqual(game.abilities.levels);
    expect(restored.abilities.maxEnergy).toBe(game.abilities.maxEnergy);
    expect(restored.player.body.mass).toBeGreaterThan(0);
    game.world.dispose();
    restored.world.dispose();
  });
