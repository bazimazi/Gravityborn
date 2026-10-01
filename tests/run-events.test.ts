import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import balance from '../src/data/balance.json';

function encounter(id: string): Expedition {
  const run = new Expedition(new Game(false));
  run.start('event-paths');
  run.current = run.map.find((node) => node.type === 'event')!;
  expect(run.current).toBeDefined();
  run.eventId = id;
  run.phase = 'event';
  return run;
}
function win(run: Expedition): void {
  run.game.player.invulnerability = 100;
  for (let i = 0; i < 1600 && run.phase === 'room'; i++) {
    for (const enemy of [...run.game.world.entities.values()]) {
      if (enemy.definition.faction !== 'enemy') continue;
      enemy.invulnerability = 0;
      while (enemy.alive) run.game.applyDamage(enemy, 85, run.game.createCause());
    }
    run.game.step();
  }
  expect(run.phase).toBe('reward');
}
it('event combat defers rewards until victory, keeps the route node and resolves once', () => {
  const run = encounter('planetfall');
  const node = run.current!;
  const checkpoint = run.snapshot();
  const saved = JSON.stringify(checkpoint);
  expect(run.resolveEvent('explore')).toBe(true);
  expect(run.phase).toBe('room');
  expect(run.game.enemyCount).toBeGreaterThan(0);
  expect(run.build.relics).toHaveLength(0);
  expect(run.build.currency).toBe(0);
  expect(node.visited).toBe(false);
  expect(run.snapshot()).toBeNull();
  expect(run.resolveEvent('explore')).toBe(false);
  win(run);
  expect(JSON.stringify(checkpoint)).toBe(saved);
  expect(run.current).toBe(node);
  expect(node.type).toBe('event');
  expect(node.visited).toBe(true);
  expect(run.rooms).toBe(1);
  expect(run.build.relics).toHaveLength(1);
  expect(run.build.currency).toBeGreaterThanOrEqual(45);
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.build.relics).toEqual(run.build.relics);
  expect(restored.resolveEvent('explore')).toBe(false);
  // A process death during combat resumes the previous event decision, with no awarded loot.
  expect(restored.restore(checkpoint)).toBe(true);
  expect(restored.phase).toBe('event');
  expect(restored.build.relics).toHaveLength(0);
  expect(restored.resolveEvent('explore')).toBe(true);
  run.game.world.dispose();
  restored.game.world.dispose();
});
it('defeat and declining an event fight never award the promised combat relic', () => {
  const run = encounter('arena');
  expect(run.resolveEvent('fight')).toBe(true);
  run.game.player.health = 0;
  run.game.step();
  expect(run.phase).toBe('summary');
  expect(run.build.relics).toHaveLength(0);
  expect(run.rooms).toBe(0);
  const declined = encounter('arena');
  expect(declined.resolveEvent('leave')).toBe(true);
  expect(declined.phase).toBe('reward');
  expect(declined.build.relics).toHaveLength(0);
  run.game.world.dispose();
  declined.game.world.dispose();
});
it('a machine rewrites subsequent gravity rules and persists them across checkpoint recovery', () => {
  const run = encounter('engine');
  expect(run.resolveEvent('retune')).toBe(true);
  expect(run.phenomenon).toBe('rotating');
  expect(run.build.currency).toBe(55);
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.phenomenon).toBe('rotating');
  while (restored.build.pending) {
    restored.build.offer();
    restored.build.choose(restored.build.choices[0].id);
  }
  expect(restored.advance()).toBe(true);
  expect(restored.enter(restored.available[0].id)).toBe(true);
  expect(restored.game.rules.activePhenomena).toContain('rotating');
  run.game.world.dispose();
  restored.game.world.dispose();
});
it.each([
  ['dense', 3, 0.8],
  ['light', 0.5, 1.3],
] as const)(
  'the %s experiment charges once and changes physical mass and movement',
  (id, mass, movement) => {
    const run = encounter('scientist');
    expect(run.resolveEvent(id)).toBe(false);
    run.build.currency = 20;
    expect(run.resolveEvent(id)).toBe(true);
    expect(run.build.mutation).toBe(id);
    expect(run.game.player.body.mass).toBeCloseTo(run.game.player.definition.mass * mass);
    expect(
      run.game.abilities.modifiers.evaluate('movement', balance.player.acceleration),
    ).toBeCloseTo(balance.player.acceleration * movement);
    expect(run.build.currency).toBe(15);
    const restored = new Expedition(new Game(false));
    expect(restored.restore(run.snapshot())).toBe(true);
    expect(restored.game.player.body.mass).toBeCloseTo(run.game.player.body.mass);
    run.game.world.dispose();
    restored.game.world.dispose();
  },
);
