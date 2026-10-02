import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile } from '../src/progression/profile';
import { rotatingChallenge, type RunMode } from '../src/content/modes';
import { phenomena, contracts } from '../src/content/phenomena';
import { encounters } from '../src/content/events';
import { regions } from '../src/content/regions';
import { vi } from 'vitest';

function progress(run: Expedition): void {
  if (run.build.pending) {
    run.build.offer();
    run.build.choose(run.build.choices[0].id);
    return;
  }
  if (run.phase === 'map') {
    run.enter((run.available.find((node) => node.type !== 'puzzle') ?? run.available[0]).id);
    return;
  }
  if (run.phase === 'event') {
    run.resolveEvent('leave');
    return;
  }
  if (run.phase === 'shop') {
    run.leaveShop();
    return;
  }
  if (run.phase === 'reward') {
    run.advance();
    return;
  }
  if (run.phase === 'room') {
    for (const entity of [...run.game.world.entities.values()])
      if (entity.definition.faction === 'enemy' && entity.kind !== 'projectile') {
        entity.invulnerability = 0;
        while (entity.alive) run.game.applyDamage(entity, 85, run.game.createCause());
      }
    run.game.step();
    for (let i = 0; i < 190 && run.phase === 'room' && run.game.enemyCount === 0; i++)
      run.game.step();
  }
}
it('high difficulties reduce chamber rewards before contract multiplication and survive recovery', () => {
  for (const [difficulty, factor] of [
    [0, 1],
    [3, 1],
    [4, 0.9],
    [5, 0.8],
    [6, 0.7],
  ]) {
    const original = new Expedition(new Game(false));
    original.start('difficulty-rewards', 'manipulator', undefined, 0, {
      difficulty,
      contract: 'heavy',
    });
    const run = new Expedition(new Game(false));
    expect(run.restore(original.snapshot())).toBe(true);
    run.enter(run.available[0].id);
    const xp = vi.spyOn(run.build, 'gainXP');
    const before = run.build.currency;
    let pickups = 0;
    run.game.events.on('collected', (event) => {
      if (event.kind === 'shard') pickups += event.amount;
    });
    run.game.player.invulnerability = 100;
    for (let i = 0; i < 80 && run.phase === 'room'; i++) progress(run);
    expect(run.phase).toBe('reward');
    expect(run.build.currency - before - pickups).toBe(Math.floor(15 * factor * 3));
    expect(xp).toHaveBeenLastCalledWith(Math.floor(30 * factor));
    original.game.world.dispose();
    run.game.world.dispose();
  }
});
it('Anchored Charter rejects global-direction powers without spending resources or starting chains', () => {
  const game = new Game(false);
  game.world.spawn('heavy', { x: 900, y: 350 });
  game.rules.configure('anchored', '', 'locked', 0);
  game.start();
  let casts = 0;
  let chains = 0;
  game.events.on('abilityUsed', () => casts++);
  const originalCause = game.createCause.bind(game);
  game.createCause = (source) => {
    chains++;
    return originalCause(source);
  };
  for (const id of ['reverse', 'rotate']) {
    game.abilities.learn(id);
    expect(game.castAbility(id, { x: 600, y: 350 })).toBe(false);
    expect(game.abilities.cast(id, { x: 600, y: 350 }, true)).toBe(false);
    expect(game.abilities.cooldowns.has(id)).toBe(false);
  }
  expect(game.abilities.energy).toBe(100);
  expect(casts).toBe(0);
  expect(chains).toBe(0);
  expect(game.createWell({ x: 600, y: 350 })).toBe(true);
  game.rules.configure('free', '', 'none', 0);
  expect(game.castAbility('rotate', { x: 600, y: 350 })).toBe(true);
  game.step();
  game.step();
  expect(game.gravity.direction.x).not.toBe(0);
  game.world.dispose();
});
for (const [mode, count] of [
  ['quick', 7],
  ['boss_rush', 10],
  ['gauntlet', 7],
  ['campaign', regions.length * 7],
] as [RunMode, number][])
  it(`${mode} reaches its intended completion with consistent checkpoints`, () => {
    const run = new Expedition(new Game(false));
    run.start('mode-test', 'manipulator', undefined, 0, { mode });
    for (let i = 0; i < 650 && run.phase !== 'summary'; i++) progress(run);
    expect(run.won).toBe(true);
    expect(run.rooms).toBe(count);
    const restored = new Expedition(new Game(false));
    expect(restored.restore(run.snapshot())).toBe(true);
    expect(restored.mode).toBe(mode);
    expect(restored.won).toBe(true);
  });
it('endless wraps the last region, escalates rules, and preserves its route on reload', () => {
  const profile = newProfile();
  profile.skills = ['endless', 'navigation', 'survey'];
  const run = new Expedition(new Game(false));
  run.start('endless', 'manipulator', profile, regions.length - 1, { mode: 'endless' });
  for (let i = 0; i < 160 && !(run.biome === 0 && run.phase === 'map'); i++) progress(run);
  expect(run.phase).toBe('map');
  expect(run.biome).toBe(0);
  expect(run.depth).toBe(1);
  const restored = new Expedition(new Game(false));
  expect(restored.restore(run.snapshot())).toBe(true);
  expect(restored.available).toEqual(run.available);
  restored.enter(restored.available[0].id);
  expect(restored.game.rules.phenomenon).not.toBe('');
});
it('daily and weekly seeds use UTC periods and exclude permanent advantages', () => {
  expect(rotatingChallenge('daily', new Date('2026-10-01T02:00:00Z'))).toEqual(
    rotatingChallenge('daily', new Date('2026-10-01T23:59:59Z')),
  );
  expect(rotatingChallenge('weekly', new Date('2026-10-01'))).toEqual(
    rotatingChallenge('weekly', new Date('2026-10-04')),
  );
  const profile = newProfile();
  profile.skills = ['vitality', 'scavenger'];
  profile.equipment.basalt_core = 5;
  profile.loadout.core = 'basalt_core';
  const run = new Expedition(new Game(false));
  run.start('ignored', 'massborn', profile, 7, {
    mode: 'daily',
    difficulty: 6,
    contract: 'heavy',
    date: new Date('2026-10-01'),
  });
  expect(run.seed).toBe('daily:2026-10-01');
  expect(run.build.skills).toEqual([]);
  expect(run.build.equipment).toEqual([]);
  expect(run.contract).toBe('none');
  expect(run.difficulty).toBe(1);
});
for (const phenomenon of phenomena)
  it(`${phenomenon.name} remains bounded through multiple rule cycles`, () => {
    const game = new Game(false);
    const enemy = game.world.spawn('heavy', { x: 800, y: 350 })!;
    enemy.health = 10000;
    game.player.invulnerability = 100;
    game.rules.configure('rules', phenomenon.id, 'none', 0);
    game.start();
    for (let i = 0; i < 720; i++) {
      game.step();
      for (const entity of game.world.entities.values())
        expect(Number.isFinite(entity.body.position.x + entity.body.position.y)).toBe(true);
    }
    expect(game.gravity.fields.size).toBeLessThanOrEqual(50);
    game.world.dispose();
  });
for (const contract of contracts)
  it(`${contract.name} pays its advertised room reward multiplier`, () => {
    const run = new Expedition(new Game(false));
    run.start('contract', 'manipulator', undefined, 0, { contract: contract.id });
    run.enter(run.available[0].id);
    if (contract.id === 'locked') expect(run.game.flip({ x: 1, y: 0 })).toBe(false);
    const before = run.build.currency;
    let collectedShards = 0;
    run.game.events.on('collected', ({ kind, amount }) => {
      if (kind === 'shard') collectedShards += amount;
    });
    for (let i = 0; i < 1000 && run.phase === 'room'; i++) {
      for (const entity of [...run.game.world.entities.values()]) {
        if (entity.definition.faction !== 'enemy') continue;
        entity.invulnerability = 0;
        while (entity.alive) run.game.applyDamage(entity, 85, run.game.createCause());
      }
      run.game.step();
    }
    expect(run.phase).toBe('reward');
    expect(run.build.currency - before).toBe(Math.floor(15 * contract.reward) + collectedShards);
  });
for (const encounter of encounters)
  it(`${encounter.name} enforces costs and resolves only once`, () => {
    const run = new Expedition(new Game(false));
    run.start('event');
    run.current = run.map.find((node) => node.type === 'event') ?? run.map[1];
    run.eventId = encounter.id;
    run.phase = 'event';
    run.build.currency = 100;
    const choice = encounter.choices[0];
    if (choice.healthCost) {
      run.game.player.health = choice.healthCost;
      expect(run.resolveEvent(choice.id)).toBe(false);
      run.game.player.health = 100;
    }
    expect(run.resolveEvent(choice.id)).toBe(true);
    if (choice.combat) {
      expect(run.phase).toBe('room');
      expect(run.resolveEvent(choice.id)).toBe(false);
      run.game.player.invulnerability = 100;
      for (let i = 0; i < 40 && !run.current?.visited; i++) progress(run);
    }
    expect(run.phase).toBe('reward');
    const currency = run.build.currency;
    expect(run.resolveEvent(choice.id)).toBe(false);
    expect(run.build.currency).toBe(currency);
  });
