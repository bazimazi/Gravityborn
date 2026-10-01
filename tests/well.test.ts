import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { RunBuild } from '../src/progression/build';
import { Expedition } from '../src/progression/expedition';

it('evolves the primary well into paired compression fields without duplicating casts or evicting enemy fields', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'well');
  build.wellLevel = 4;
  build.apply();
  game.start();
  game.gravity.addField({
    source: 'enemy:test',
    mode: 'radial',
    position: { x: 800, y: 500 },
    direction: { x: 0, y: 0 },
    strength: 0.001,
    radius: 100,
    falloff: 'linear',
    remaining: 100,
  });
  const target = game.world.spawn('anchor', { x: 680, y: 350 })!;
  let casts = 0;
  game.events.on('wellCreated', () => casts++);
  expect(game.createWell({ x: 600, y: 350 })).toBe(true);
  const wells = [...game.gravity.fields.values()].filter((field) => field.source === 'player-well');
  expect(wells).toHaveLength(2);
  expect(wells.map((field) => field.position.x)).toEqual([520, 680]);
  expect(wells[0].radius).toBeCloseTo(318);
  const health = target.health;
  game.step();
  expect(target.health).toBeLessThan(health);
  expect(casts).toBe(1);
  expect(game.stats.wells).toBe(1);
  for (let i = 0; i < 3; i++) {
    game.wellCooldown = 0;
    game.createWell({ x: 600, y: 350 });
  }
  expect(
    [...game.gravity.fields.values()].filter((field) => field.source === 'player-well'),
  ).toHaveLength(4);
  expect([...game.gravity.fields.values()].some((field) => field.source === 'enemy:test')).toBe(
    true,
  );
});
it('restores an evolution choice, applies it once, and preserves the evolved build across checkpoints', () => {
  const run = new Expedition(new Game(false));
  run.start('well-choice');
  run.build.wellLevel = 2;
  run.build.pending = 1;
  run.build.choices = [
    {
      id: 'well:well',
      kind: 'well',
      target: 'well',
      name: 'Dual Gravity Well',
      description: 'Two wells',
    },
  ];
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.build.choose('well:well')).toBe(true);
  expect(restored.build.wellLevel).toBe(3);
  expect(restored.build.choose('well:well')).toBe(false);
  expect(restored.game.abilities.modifiers.evaluate('wellCopies', 1)).toBe(2);
});
