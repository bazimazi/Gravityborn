import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { enemyVariants, eliteCompatibility, type VariantKind } from '../src/content/variants';
import { buildRoom } from '../src/content/rooms';

for (const variant of enemyVariants)
  it(`${variant.name} simulates with physical interactions and cleans up its fields`, () => {
    const game = new Game(false);
    game.reset(false, { ...game.room, manualCompletion: true });
    game.player.invulnerability = 100;
    const enemy = game.world.spawn(variant.kind, { x: 700, y: 400 })!;
    game.enemies.setElite(enemy, variant.elite);
    game.world.spawn('rock', { x: 540, y: 420 });
    game.world.spawn('projectile', { x: 660, y: 430 });
    game.start();
    game.createWell({ x: 600, y: 400 });
    for (let frame = 0; frame < 480; frame++) {
      if (frame % 120 === 0) game.flip({ x: frame % 240 ? -1 : 1, y: 0 });
      game.step();
      expect(game.world.entities.size).toBeLessThanOrEqual(220);
      expect(game.gravity.fields.size).toBeLessThanOrEqual(50);
      for (const entity of game.world.entities.values())
        expect(
          Number.isFinite(entity.body.position.x + entity.body.position.y + entity.body.angle),
        ).toBe(true);
    }
    if (enemy.alive) {
      enemy.health = 1;
      enemy.invulnerability = 0;
      game.applyDamage(enemy, 85, game.createCause());
    }
    expect(
      [...game.gravity.fields.values()].some((field) => field.source === `enemy:${enemy.id}`),
    ).toBe(false);
    game.world.dispose();
  });
it('phase cycles restore inverted response and simultaneous elite fields remain distinct', () => {
  const game = new Game(false);
  const phase = game.world.spawn('phase', { x: 700, y: 400 })!;
  game.enemies.setElite(phase, 'inverted');
  game.enemies.update(phase);
  expect(phase.gravityScale).toBe(-1);
  phase.life = 2.1;
  game.enemies.update(phase);
  expect(phase.gravityScale).toBe(0);
  phase.life = 4.1;
  game.enemies.update(phase);
  expect(phase.gravityScale).toBe(-1);
  const repulsor = game.world.spawn('repulsor', { x: 800, y: 400 })!;
  game.enemies.setElite(repulsor, 'singularity');
  game.enemies.update(repulsor);
  game.time = 2;
  game.enemies.update(repulsor);
  const fields = [...game.gravity.fields.values()].filter(
    (field) => field.source === `enemy:${repulsor.id}`,
  );
  expect(fields.some((field) => field.strength < 0)).toBe(true);
  expect(fields.some((field) => field.strength > 0)).toBe(true);
});
it('authored elite rooms select compatible variations across seeds and regions', () => {
  expect(enemyVariants.length).toBeGreaterThanOrEqual(50);
  for (let seed = 0; seed < 64; seed++) {
    const room = buildRoom(String(seed), 'elite', 'elite', seed % 8, 4);
    for (const spawn of [...room.spawns, ...room.waves!.flat()])
      if (spawn.elite) expect(eliteCompatibility[spawn.kind as VariantKind]).toContain(spawn.elite);
  }
});
