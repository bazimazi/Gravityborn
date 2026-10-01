import Matter from 'matter-js';
import { expect, it } from 'vitest';
import { buildRoom, biomes, type RoomType } from '../src/content/rooms';
import { generateMap } from '../src/progression/map';
import { Game } from '../src/gameplay/game';

it('generates stable branching routes with a reachable boss and mandatory shop row', () => {
  for (let seed = 0; seed < 100; seed++) {
    const map = generateMap(String(seed), seed % 8);
    expect(map).toEqual(generateMap(String(seed), seed % 8));
    const seen = new Set<string>();
    const visit = (id: string): void => {
      if (seen.has(id)) return;
      seen.add(id);
      map.find((node) => node.id === id)!.next.forEach(visit);
    };
    visit(map[0].id);
    expect(seen.size).toBe(map.length);
    expect(map.filter((node) => node.row === 3).every((node) => node.type === 'shop')).toBe(true);
    expect(map.filter((node) => node.next.length === 0).map((node) => node.type)).toEqual(['boss']);
    for (const node of map)
      for (const next of node.next)
        expect(map.find((candidate) => candidate.id === next)!.row).toBe(node.row + 1);
  }
});
it('authored compositions keep every entity clear of walls at spawn', () => {
  const types: RoomType[] = ['combat', 'elite', 'challenge', 'puzzle', 'shop', 'boss'];
  for (let seed = 0; seed < 64; seed++) {
    const room = buildRoom(String(seed), 'test', types[seed % types.length], seed % biomes.length);
    const game = new Game(false);
    game.reset(true, room);
    for (const entity of game.world.entities.values())
      expect(
        Matter.Query.collides(entity.body, game.world.walls),
        `${room.name} ${entity.kind}`,
      ).toHaveLength(0);
    game.world.dispose();
  }
});
it('requires a physical mass on the puzzle switch before the exit works', () => {
  const room = buildRoom('puzzle', 'p', 'puzzle', 0);
  const game = new Game(false);
  game.reset(true, room);
  game.start();
  Matter.Body.setPosition(game.player.body, room.puzzle!.exit);
  game.step();
  expect(game.state).toBe('playing');
  const rock = [...game.world.entities.values()].find((entity) => entity.kind === 'rock')!;
  Matter.Body.setPosition(rock.body, room.puzzle!.switch);
  game.step();
  expect(game.environment.switchActive).toBe(true);
  expect(game.state).toBe('won');
});
it('enemy fields never grant player ownership to hostile projectiles', () => {
  const game = new Game(false);
  game.world.spawn('anchor', { x: 700, y: 350 });
  const shot = game.world.spawn('projectile', { x: 800, y: 350 })!;
  game.start();
  game.step();
  game.step();
  expect(shot.redirected).toBe(false);
  expect(shot.chainId).toBeNull();
});

it('holds room completion for telegraphed waves and freezes the warning while paused', () => {
  const game = new Game(false);
  const room = buildRoom('wave-warning', 'wave', 'combat', 0);
  game.reset(true, room);
  game.start();
  for (const entity of [...game.world.entities.values()]) {
    if (entity.definition.faction !== 'enemy') continue;
    while (entity.alive) game.applyDamage(entity, 85, game.createCause());
  }
  game.step();
  expect(game.state).toBe('playing');
  expect(game.nextWaveAt).toBeGreaterThan(game.time);
  const time = game.time;
  game.state = 'paused';
  for (let i = 0; i < 200; i++) game.step();
  expect(game.time).toBe(time);
  expect(game.waveIndex).toBe(0);
  game.state = 'playing';
  for (let i = 0; i < 200 && game.waveIndex === 0; i++) game.step();
  expect(game.waveIndex).toBe(1);
  expect(game.enemyCount).toBeGreaterThan(0);
  for (const entity of game.world.entities.values()) {
    if (entity.definition.faction !== 'enemy') continue;
    expect(Matter.Query.collides(entity.body, game.world.walls)).toHaveLength(0);
    expect(entity.invulnerability).toBeGreaterThan(0);
  }
});
