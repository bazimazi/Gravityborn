import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { expeditionView } from '../src/presentation/expedition';
import { relicById } from '../src/content/relics';

it('a physical rift seal reveals a previously hidden route and the discovery survives a checkpoint', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('hidden-route');
  const secret = run.map.find((node) => node.type === 'secret')!;
  expect(run.isRevealed(secret)).toBe(false);
  expect(expeditionView(run)).not.toContain(`data-room="${secret.id}"`);
  run.enter(run.available[0].id);
  const seal = [...game.world.entities.values()].find((entity) => entity.kind === 'rift_seal')!;
  expect(seal.body.isStatic).toBe(true);
  const rock = game.world.spawn('rock', { x: seal.body.position.x - 60, y: seal.body.position.y })!;
  game.createWell({ x: seal.body.position.x + 25, y: seal.body.position.y });
  for (let i = 0; i < 600 && seal.alive; i++) game.step();
  expect(rock.alive).toBe(true);
  expect(seal.alive).toBe(false);
  expect(run.isRevealed(secret)).toBe(true);
  // Simulate the normal completed-room checkpoint; physics itself is not serialized.
  run.phase = 'reward';
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.isRevealed(restored.map.find((node) => node.id === secret.id)!)).toBe(true);
});
it('locked secrets cannot be entered and do not strand any normal route', () => {
  for (let seed = 0; seed < 64; seed++) {
    const run = new Expedition(new Game(false));
    run.start(String(seed));
    const secret = run.map.find((node) => node.type === 'secret')!;
    const predecessor = run.map.find((node) => node.next.includes(secret.id))!;
    run.current = predecessor;
    expect(run.available.some((node) => node.type !== 'secret')).toBe(true);
    expect(run.enter(secret.id)).toBe(false);
    run.game.world.dispose();
  }
});
it('a revealed vault requires its elite encounter before awarding rare loot and regional lore once', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('vault');
  const secret = run.map.find((node) => node.type === 'secret')!;
  run.current = run.map.find((node) => node.next.includes(secret.id));
  run.discoveries.add('secret:0:0');
  expect(run.enter(secret.id)).toBe(true);
  expect(run.phase).toBe('room');
  expect(run.build.relics).toHaveLength(0);
  expect(game.enemyCount).toBe(2);
  for (const entity of [...game.world.entities.values()])
    if (entity.definition.faction === 'enemy')
      while (entity.alive) game.applyDamage(entity, 85, game.createCause());
  game.step();
  expect(run.phase).toBe('reward');
  expect(run.discoveries.has('lore:secret:0')).toBe(true);
  expect(run.build.relics).toHaveLength(1);
  expect(relicById.get(run.build.relics[0])!.rarity).not.toBe('common');
  game.events.emit('ended', { won: true });
  expect(run.build.relics).toHaveLength(1);
});
