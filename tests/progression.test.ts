import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { RunBuild } from '../src/progression/build';
import { bossDefinitions, type BossKind } from '../src/content/bosses';

it('offers deterministic distinct choices, validates selection, and advances one level at a time', () => {
  const a = new RunBuild(new Game(false), 'same');
  const b = new RunBuild(new Game(false), 'same');
  a.gainXP(160);
  b.gainXP(160);
  expect(a.pending).toBe(2);
  expect(a.offer()).toEqual(b.offer());
  expect(new Set(a.choices.map((choice) => choice.id)).size).toBe(3);
  expect(a.choose('forged')).toBe(false);
  expect(a.pending).toBe(2);
  expect(a.choose(a.choices[0].id)).toBe(true);
  expect(a.pending).toBe(1);
});
it('rebuilds mass modifiers without compounding and activates tag synergies', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'x');
  build.addRelic('heavy_heart');
  expect(game.player.body.mass).toBeCloseTo(5.6);
  build.apply();
  expect(game.player.body.mass).toBeCloseTo(5.6);
  game.abilities.learn('theft');
  build.apply();
  expect(build.activeSynergies).toContain('Gravitational Overload');
  expect(game.abilities.modifiers.evaluate('strength', 10, ['Impact'])).toBe(16);
});
it('echoes exactly once without spending energy again or recursively creating casts', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'echo');
  const enemy = game.world.spawn('heavy', { x: 600, y: 350 })!;
  enemy.health = 10000;
  build.addRelic('echo');
  let casts = 0;
  game.events.on('abilityUsed', () => casts++);
  game.start();
  game.castAbility('pulse', game.player.body.position);
  for (let i = 0; i < 90; i++) game.step();
  expect(casts).toBe(2);
  expect(game.abilities.energy).toBeGreaterThan(82);
});
it('Second Dawn revives only once per room', () => {
  const game = new Game(false);
  const build = new RunBuild(game, 'revive');
  build.addRelic('seed');
  game.player.health = 10;
  game.applyDamage(game.player, 85, game.createCause());
  expect(game.player.health).toBe(30);
  expect(game.player.invulnerability).toBe(2);
  game.player.invulnerability = 0;
  game.applyDamage(game.player, 85, game.createCause());
  expect(game.player.health).toBe(0);
});
for (const kind of Object.keys(bossDefinitions) as BossKind[])
  it(`${kind} changes arena rules across phases and cleans its structures`, () => {
    const game = new Game(false);
    const boss = game.world.spawn(kind, { x: 800, y: 350 })!;
    const originalWalls = game.world.walls.length;
    game.start();
    game.bosses.update(boss);
    game.time = 3;
    game.bosses.update(boss);
    if (kind === 'inverter') expect(game.gravity.direction).toEqual({ x: 0, y: -1 });
    if (kind === 'planet_eater')
      expect(
        [...game.gravity.fields.values()].some((field) => field.source.startsWith('boss:')),
      ).toBe(true);
    if (kind === 'architect') expect(game.world.walls.length).toBeGreaterThan(originalWalls);
    if (kind === 'star' || kind === 'singularity_boss')
      expect(game.gravity.fields.size).toBeGreaterThan(0);
    boss.health = 170;
    game.time = 8;
    game.bosses.update(boss);
    expect(game.bosses.active?.phase).toBe(3);
    while (boss.alive) game.applyDamage(boss, 85, game.createCause());
    expect(game.bosses.active).toBeUndefined();
    expect(game.world.walls.length).toBe(originalWalls);
    expect(
      [...game.gravity.fields.values()].filter((field) => field.source.startsWith('boss:')),
    ).toHaveLength(0);
  });
it('completes a three-region run with upgrades, valid routes, shops, and single rewards', () => {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start('full-run');
  let iterations = 0;
  while (run.phase !== 'summary' && iterations++ < 200) {
    if (run.build.pending) {
      run.build.offer();
      expect(run.build.choose(run.build.choices[0].id)).toBe(true);
      continue;
    }
    if (run.phase === 'map') {
      expect(run.enter('forged')).toBe(false);
      const node = run.available.find((node) => node.type !== 'puzzle') ?? run.available[0];
      expect(node).toBeDefined();
      expect(run.enter(node.id)).toBe(true);
    } else if (run.phase === 'room') {
      for (const entity of [...game.world.entities.values()])
        if (entity.definition.faction === 'enemy' && entity.kind !== 'projectile')
          while (entity.alive) game.applyDamage(entity, 85, game.createCause());
      game.step();
    } else if (run.phase === 'shop') {
      const item = run.shop.find((item) => item.price <= run.build.currency);
      if (item) {
        const before = run.build.currency;
        expect(run.buy(item.id)).toBe(true);
        expect(run.build.currency).toBe(before - item.price);
        expect(run.buy(item.id)).toBe(false);
      }
      run.leaveShop();
    } else if (run.phase === 'event') run.resolveEvent('repair');
    else if (run.phase === 'reward') {
      const rooms = run.rooms;
      game.events.emit('ended', { won: true });
      expect(run.rooms).toBe(rooms);
      expect(run.advance()).toBe(true);
    }
  }
  expect(iterations).toBeLessThan(200);
  expect(run.won).toBe(true);
  expect(run.rooms).toBe(21);
  expect(run.build.relics.length).toBeGreaterThan(0);
  expect(run.build.level).toBeGreaterThan(3);
});
