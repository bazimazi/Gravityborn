import { expect, it } from 'vitest';
import { regions } from '../src/content/regions';
import { validateRegions } from '../src/content/validate';
import { buildRoom } from '../src/content/rooms';
import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { newProfile, readProfile } from '../src/progression/profile';
import { modes } from '../src/content/modes';
import { classById } from '../src/content/classes';

it('validates region narrative, references, fields, hazards and stable identifiers', () => {
  const broken = structuredClone(regions[0]);
  broken.id = regions[1].id;
  broken.prop = 'player';
  broken.planet.mass = NaN;
  broken.enemies = ['rock'];
  broken.fields = [
    {
      source: 'environment',
      mode: 'radial',
      position: { x: 1, y: 1 },
      direction: { x: 0, y: 1 },
      strength: 99,
      radius: 0,
      remaining: 1,
      falloff: 'linear',
    },
  ];
  const issues = validateRegions([broken, regions[1]]);
  for (const suffix of ['props', 'planet', 'enemies', 'fields'])
    expect(issues.some((issue) => issue.path.endsWith(suffix))).toBe(true);
  expect(issues.some((issue) => issue.message.includes('unique'))).toBe(true);
});
it('an appended region drives room content, campaign length, routing and checkpoint bounds', () => {
  const extension = structuredClone(regions[6]);
  extension.id = 'expansion_test';
  extension.name = 'Expansion Test';
  extension.prop = 'crystal';
  extension.guardian = 'tidal';
  extension.movingWalls = true;
  const index = regions.length;
  regions.push(extension);
  try {
    expect(validateRegions(regions)).toEqual([]);
    expect(modes.find((mode) => mode.id === 'campaign')!.regions).toBe(index + 1);
    const room = buildRoom('extension', 'boss', 'boss', index);
    expect(room.name).toContain('Expansion Test');
    expect(room.spawns.some((spawn) => spawn.kind === 'tidal')).toBe(true);
    expect(room.spawns.some((spawn) => spawn.kind === 'crystal')).toBe(true);
    expect(room.hazards.some((hazard) => hazard.kind === 'wind')).toBe(true);
    room.hazards[0].x = 1;
    expect(extension.hazards[0].x).not.toBe(1);
    const run = new Expedition(new Game(false));
    run.start('campaign-extension', 'manipulator', undefined, 0, { mode: 'campaign' });
    run.biome = index - 1;
    run.current = run.map.find((node) => node.type === 'boss');
    run.phase = 'reward';
    expect(run.advance()).toBe(true);
    expect(run.phase).toBe('map');
    expect(run.biome).toBe(index);
    const restored = new Expedition(new Game(false));
    expect(restored.restore(run.snapshot())).toBe(true);
    expect(restored.biome).toBe(index);
    restored.current = restored.map.find((node) => node.type === 'boss');
    restored.phase = 'reward';
    expect(restored.advance()).toBe(true);
    expect(restored.won).toBe(true);
    run.game.world.dispose();
    restored.game.world.dispose();
  } finally {
    regions.pop();
  }
});
it('normalizes invalid room indexes before selecting every region-dependent object', () => {
  for (const index of [NaN, -1, 0.5, 999]) {
    const room = buildRoom('safe', 'boss', 'boss', index);
    expect(Number.isInteger(room.biome)).toBe(true);
    expect(room.spawns.every((spawn) => typeof spawn.kind === 'string')).toBe(true);
  }
});
it('adding a ninth class does not invalidate profiles containing the expanded class catalog', () => {
  const base = classById.get('manipulator')!;
  classById.set('expansion_class', { ...base, id: 'expansion_class' });
  try {
    const profile = newProfile();
    profile.shards = 321;
    profile.classes = [...classById.keys()];
    profile.selectedClass = 'expansion_class';
    const restored = readProfile(profile);
    expect(restored.shards).toBe(321);
    expect(restored.classes).toHaveLength(classById.size);
    expect(restored.selectedClass).toBe('expansion_class');
  } finally {
    classById.delete('expansion_class');
  }
});
