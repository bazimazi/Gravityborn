import { expect, it } from 'vitest';
import { challengeCode, readChallengeCode } from '../src/progression/challenge-code';
import { replayRevision, type RunRecipe } from '../src/progression/archive';
import { checksum } from '../src/core/save';
const recipe: RunRecipe = {
  seed: 'جهان 🪐 / 42',
  classId: 'manipulator',
  mode: 'quick',
  contract: 'heavy',
  difficulty: 3,
  biome: 0,
};
it('round-trips Unicode route rules in a compact offline code without scores or progression', () => {
  const code = challengeCode(recipe);
  expect(code.length).toBeLessThan(250);
  expect(readChallengeCode(`  ${code}\n`)).toEqual({ recipe, revision: replayRevision });
  expect(Object.keys(readChallengeCode(code))).toEqual(['revision', 'recipe']);
});
it('rejects altered, truncated, oversized and unsupported codes', () => {
  const code = challengeCode(recipe);
  for (const broken of [
    code.slice(0, -1),
    code.replace('GB1', 'GB2'),
    `${code}a`,
    'a'.repeat(1000),
  ])
    expect(() => readChallengeCode(broken)).toThrow();
  const encoded = btoa(
    JSON.stringify([replayRevision, 'seed', 'missing', 'quick', 'none', 0, 0]),
  ).replace(/=+$/, '');
  expect(() => readChallengeCode(`GB1.${encoded}.${checksum(encoded)}`)).toThrow(
    'unsupported rules',
  );
});
it('validates catalog limits and real rotating challenge dates, retaining older revision notices', () => {
  for (const invalid of [
    { ...recipe, difficulty: 1.5 },
    { ...recipe, biome: 99 },
    { ...recipe, mode: 'daily' as const, seed: 'daily:2026-02-30' },
    { ...recipe, mode: 'weekly' as const, seed: 'daily:2026-10-02' },
  ])
    expect(() => challengeCode(invalid)).toThrow();
  const daily = { ...recipe, mode: 'daily' as const, seed: 'daily:2025-01-10' };
  expect(readChallengeCode(challengeCode(daily, 'gravityborn-0.4-r1')).revision).toBe(
    'gravityborn-0.4-r1',
  );
});
