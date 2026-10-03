import { describe, expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { RunArchive, readReport, replayRevision } from '../src/progression/archive';
import { archiveView } from '../src/presentation/archive';
import { abilityById } from '../src/content/abilities';
import { relicById } from '../src/content/relics';

function setup() {
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  const game = new Game();
  const run = new Expedition(game);
  const archive = new RunArchive(storage, run);
  return { game, run, archive, storage, records };
}
function victory(context: ReturnType<typeof setup>, seed = 'archive-test') {
  const { game, run, archive } = context;
  run.start(seed, 'manipulator', undefined, 0, { mode: 'quick' });
  run.enter(run.available[0].id);
  game.time = 0;
  archive.sample();
  game.time = 0.5;
  archive.sample();
  run.phase = 'summary';
  game.events.emit('runEnded', {
    id: run.id,
    outcome: 'victory',
    elapsed: 0.5,
    score: 20,
    assisted: false,
  });
  return archive.reports[0];
}
describe('local run archive', () => {
  it('persists a complete victory and interpolates its room ghost without adding bodies', () => {
    const context = setup();
    const report = victory(context);
    report.ghost[0].samples = [
      [0, 100, 200],
      [0.5, 200, 300],
    ];
    context.archive.save();
    const game = new Game();
    const run = new Expedition(game);
    const archive = new RunArchive(context.storage, run);
    run.start('archive-test', 'manipulator', undefined, 0, { mode: 'quick' });
    run.enter(run.available[0].id);
    const count = game.world.entities.size;
    game.time = 0.25;
    expect(archive.position()).toEqual({ x: 150, y: 250 });
    expect(game.world.entities.size).toBe(count);
    game.time = 0.6;
    expect(archive.position()).toBeNull();
    archive.enabled = false;
    game.time = 0.25;
    expect(archive.position()).toBeNull();
  });
  it('matches seed, rules, loadout, revision and room before showing a ghost', () => {
    const context = setup();
    const report = victory(context);
    const start = () => {
      context.run.start('archive-test', 'manipulator', undefined, 0, { mode: 'quick' });
      context.run.enter(context.run.available[0].id);
      context.game.time = 0.25;
    };
    report.revision = 'future-rules';
    start();
    expect(context.archive.position()).toBeNull();
    report.revision = replayRevision;
    report.loadout = '{}';
    start();
    expect(context.archive.position()).toBeNull();
    expect(context.archive.reports.some((item) => item.outcome === 'abandoned')).toBe(true);
  });
  it('imports shareable results without trusting scores or granting rewards', () => {
    const source = setup();
    const report = victory(source, '<img src=x onerror=alert(1)>');
    const target = setup();
    const before = target.game.world.entities.size;
    expect(target.archive.import(source.archive.export(report.id)!)).toBe(true);
    expect(target.archive.reports[0].imported).toBe(true);
    expect(target.archive.reports[0].id).not.toBe(report.id);
    expect(target.run.active).toBe(false);
    expect(target.game.world.entities.size).toBe(before);
    const html = archiveView(target.archive, '');
    expect(html).toContain('imported / unverified');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('SCORE 0');
  });
  it('reloads a generated full-catalog build without losing other archived results', () => {
    const context = setup();
    const previous = victory(context);
    context.run.start('full-catalog', 'manipulator', undefined, 0, { mode: 'quick' });
    // This is an assisted persistence fixture, not an earned run or balance check.
    for (const power of abilityById.values())
      while ((context.game.abilities.levels.get(power.id) ?? 0) < power.maxLevel)
        context.game.abilities.learn(power.id);
    for (const id of relicById.keys()) context.run.build.relics.push(id);
    context.game.events.emit('runEnded', {
      id: context.run.id,
      outcome: 'defeat',
      elapsed: 600,
      score: 999,
      assisted: true,
    });
    const report = context.archive.reports[0];
    expect(report.powers).toHaveLength(abilityById.size);
    expect(report.powers.length).toBeGreaterThan(64);
    expect(report.powerLevels).toEqual([...abilityById.values()].map((power) => power.maxLevel));
    const restored = new RunArchive(context.storage, new Expedition(new Game()));
    expect(restored.state).toBe('ready');
    expect(restored.reports).toEqual([report, previous]);
    expect(archiveView(restored, report.id)).toContain('SCORE 20');
  });
  it('shares every catalog power with its paired level and every relic without changing play', () => {
    const source = setup();
    const report = victory(source);
    report.powers = [...abilityById.keys()];
    report.powerLevels = [...abilityById.values()].map((power) => power.maxLevel);
    report.relics = [...relicById.keys()];
    report.assisted = true;
    report.ghost = [];
    source.archive.save();
    const target = setup();
    target.run.start('unrelated-live-run');
    target.run.enter(target.run.available[0].id);
    const build = target.run.build.snapshot();
    const bodies = target.game.world.entities.size;
    expect(target.archive.import(source.archive.export(report.id)!)).toBe(true);
    const imported = target.archive.reports[0];
    expect(imported).toMatchObject({
      powers: report.powers,
      powerLevels: report.powerLevels,
      relics: report.relics,
      assisted: true,
      imported: true,
    });
    expect(target.run.build.snapshot()).toEqual(build);
    expect(target.run.active).toBe(true);
    expect(target.game.world.entities.size).toBe(bodies);
    expect(new RunArchive(target.storage, new Expedition(new Game())).reports).toEqual([imported]);
  });
  it('accepts registered catalog expansion beyond both legacy collection bounds', () => {
    const report = victory(setup());
    const powerId = 'archive-expansion-power';
    const relicIds = Array.from({ length: 201 }, (_, index) => `archive-expansion-relic-${index}`);
    abilityById.set(powerId, { ...abilityById.get('pulse')!, id: powerId });
    for (const id of relicIds) relicById.set(id, { ...relicById.values().next().value!, id });
    try {
      const powers = [...abilityById.keys()];
      const relics = [...relicById.keys()];
      const expanded = readReport({
        ...report,
        powers,
        powerLevels: powers.map(() => 1),
        relics,
      });
      expect(expanded.powers).toEqual(powers);
      expect(expanded.relics).toEqual(relics);
      expect(() => readReport({ ...expanded, powers: [...powers, 'unknown'] })).toThrow();
    } finally {
      abilityById.delete(powerId);
      for (const id of relicIds) relicById.delete(id);
    }
  });
  it('rejects malformed, oversized, nonfinite, duplicate-room and out-of-order traces atomically', () => {
    const context = setup();
    const report = victory(context);
    const raw = context.archive.export(report.id)!;
    for (const mutate of [
      (r: any) => {
        r.ghost[0].samples = [
          [1, 0, 0],
          [0.5, 0, 0],
        ];
      },
      (r: any) => {
        r.ghost.push(r.ghost[0]);
      },
      (r: any) => {
        r.ghost[0].samples = [[0, 1e20, 0]];
      },
      (r: any) => {
        r.assisted = true;
      },
      (r: any) => {
        r.recipe.mode = 'unknown';
      },
      (r: any) => {
        r.recipe.difficulty = 1.5;
      },
      (r: any) => {
        r.powers = ['not-a-power'];
      },
      (r: any) => {
        r.powers = Array(Math.max(64, abilityById.size) + 1).fill('pulse');
        r.powerLevels = r.powers.map(() => 1);
      },
      (r: any) => {
        r.powerLevels = [];
      },
    ]) {
      const data = JSON.parse(raw);
      mutate(data.report);
      expect(context.archive.import(JSON.stringify(data))).toBe(false);
      expect(context.archive.reports).toHaveLength(1);
    }
    expect(() => readReport({ ...report, elapsed: NaN })).toThrow();
    expect(context.archive.import(' '.repeat(2000001))).toBe(false);
  });
  it('bounds reports and retains only the latest victory recording', () => {
    const context = setup();
    for (let i = 0; i < 22; i++) victory(context, `seed-${i}`);
    expect(context.archive.reports).toHaveLength(20);
    expect(context.archive.reports.filter((r) => r.ghost.length)).toHaveLength(1);
    context.archive.clear();
    expect(context.archive.reports).toHaveLength(0);
    expect(new RunArchive(context.storage, new Expedition(new Game())).reports).toHaveLength(0);
  });
  it('discards truncated and assisted ghosts but preserves results', () => {
    const context = setup();
    context.run.start('long');
    context.run.enter(context.run.available[0].id);
    for (let i = 0; i <= 24000; i++) {
      context.game.time = i * 0.25;
      context.archive.sample();
    }
    context.game.events.emit('runEnded', {
      id: context.run.id,
      outcome: 'victory',
      elapsed: 6000,
      score: 0,
      assisted: false,
    });
    expect(context.archive.reports[0].ghost).toEqual([]);
    context.game.events.emit('runEnded', {
      id: context.run.id,
      outcome: 'victory',
      elapsed: 6000,
      score: 0,
      assisted: true,
    });
    expect(context.archive.reports[0].assisted).toBe(true);
    expect(context.archive.reports[0].ghost).toEqual([]);
  });
  it('preserves future archive data and tolerates unavailable storage', () => {
    const context = setup();
    const raw = JSON.stringify({ version: 100, reports: [] });
    context.records.set('gravityborn.archive', raw);
    const archive = new RunArchive(context.storage, new Expedition(new Game()));
    archive.save();
    expect(archive.state).toBe('future');
    expect(context.records.get('gravityborn.archive')).toBe(raw);
    const failed = new RunArchive(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error('Full');
        },
      },
      context.run,
    );
    failed.save();
    expect(failed.state).toBe('unavailable');
  });
  it('never stitches an in-memory trace across a restored checkpoint', () => {
    const context = setup();
    context.run.start('resume');
    const checkpoint = context.run.snapshot();
    context.run.enter(context.run.available[0].id);
    context.archive.sample();
    expect(context.run.restore(checkpoint)).toBe(true);
    context.game.events.emit('runEnded', {
      id: context.run.id,
      outcome: 'victory',
      elapsed: 1,
      score: 0,
      assisted: false,
    });
    expect(context.archive.reports[0].ghost).toEqual([]);
    expect(context.archive.reports[0].loadout).toBe('');
  });
});
