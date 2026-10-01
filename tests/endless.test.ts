import { expect, it } from 'vitest';
import { endlessPhenomena } from '../src/content/endless';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile } from '../src/progression/profile';
import balance from '../src/data/balance.json';
import tuning from '../src/data/anomalies.json';
import { statusBadges } from '../src/presentation/status';

it('layers frontier milestones and selects one authoritative ambient direction program', () => {
  expect(endlessPhenomena(0, '')).toEqual([]);
  expect(endlessPhenomena(9, 'dense')).toEqual(['dense']);
  expect(endlessPhenomena(10, '')).toEqual(['rift']);
  expect(endlessPhenomena(20, 'storm')).toEqual(['rift', 'rotating']);
  expect(endlessPhenomena(30, '')).toEqual(['rift', 'reverse']);
  expect(endlessPhenomena(100, '')).toEqual([
    'rift',
    'reverse',
    'zero',
    'singularity',
    'collision',
  ]);
  expect(endlessPhenomena(500, '')).toEqual([
    'rift',
    'zero',
    'singularity',
    'collision',
    'storm',
    'rain',
    'collapse',
  ]);
});
it('frontier stage and growing health pressure derive from saved progress beyond the old cap', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  const profile = newProfile();
  profile.skills.push('endless');
  run.start('deep-frontier', 'manipulator', profile, 0, { mode: 'endless' });
  run.rooms = 499;
  run.depth = 71;
  const checkpoint = run.snapshot();
  expect(run.restore(checkpoint)).toBe(true);
  expect(run.enter(run.available[0].id)).toBe(true);
  expect(game.rules.endlessStage).toBe(500);
  expect(game.rules.difficulty).toBe(71);
  expect(game.rules.activePhenomena).toContain('collision');
  expect(game.room.walls.slice(4).every((wall) => wall.motion)).toBe(true);
  expect(statusBadges(game).some((item) => item.label === 'Frontier 500')).toBe(true);
});
for (const phenomenon of ['dense', 'elastic'] as const)
  it(`reapplies ${phenomenon} to each pooled projectile incarnation without stacking`, () => {
    const game = new Game(false);
    game.rules.configure('pool', phenomenon, 'none', 0);
    const first = game.world.spawn('projectile', { x: 600, y: 400 })!;
    for (let cycle = 0; cycle < 3; cycle++) {
      const current = cycle ? game.world.spawn('projectile', { x: 600, y: 400 })! : first;
      expect(current).toBe(first);
      game.rules.tick();
      game.rules.tick();
      expect(current.body.mass).toBeCloseTo(
        current.definition.mass * (phenomenon === 'dense' ? 10 : 1),
      );
      expect(current.body.restitution).toBe(
        phenomenon === 'elastic' ? tuning.elasticity : current.definition.restitution,
      );
      game.world.remove(current);
    }
  });
it('destroying a phenomenon planet removes its gravitational source', () => {
  const game = new Game(false);
  game.rules.configure('planets', 'collision', 'none', 0);
  game.rules.tick();
  const rocks = [...game.world.entities.values()].filter((entity) => entity.kind === 'rock');
  expect(rocks).toHaveLength(2);
  expect(game.gravity.fields.size).toBe(2);
  game.world.remove(rocks[0]);
  game.rules.tick();
  expect(game.gravity.fields.size).toBe(1);
});
it('stage 500 combinations remain finite, bounded and active over repeated cycles', () => {
  const game = new Game(false);
  game.world.spawn('heavy', { x: 850, y: 400 });
  game.player.invulnerability = 100;
  game.rules.configure('pressure', '', 'pulse', 100, 500);
  game.start();
  for (let step = 0; step < 1800; step++) {
    game.step();
    if (step % 60 === 0) game.rules.impact({ x: 600, y: 400 });
    expect(game.gravity.fields.size).toBeLessThanOrEqual(balance.physics.maxFields);
    expect(game.world.entities.size).toBeLessThanOrEqual(balance.physics.maxBodies);
  }
  expect(game.time).toBeCloseTo(15);
  for (const entity of game.world.entities.values())
    expect(Number.isFinite(entity.body.position.x + entity.body.position.y + entity.health)).toBe(
      true,
    );
});
