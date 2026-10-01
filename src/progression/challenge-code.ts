import { checksum } from '../core/save';
import { readRecipe, replayRevision, type RunRecipe } from './archive';

export function challengeCode(recipe: RunRecipe, revision = replayRevision): string {
  const valid = readRecipe(recipe);
  const raw = JSON.stringify([
    revision,
    valid.seed,
    valid.classId,
    valid.mode,
    valid.contract,
    valid.difficulty,
    valid.biome,
  ]);
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(raw)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `GB1.${encoded}.${checksum(encoded)}`;
}

export function readChallengeCode(value: string): { recipe: RunRecipe; revision: string } {
  if (value.length > 768) throw new Error('Challenge code is too long.');
  const match = value.trim().match(/^GB1\.([A-Za-z0-9_-]+)\.([a-f0-9]{1,8})$/);
  if (!match || checksum(match[1]) !== match[2])
    throw new Error('Challenge code is incomplete or damaged.');
  try {
    const bytes = Uint8Array.from(
      atob(match[1].replaceAll('-', '+').replaceAll('_', '/')),
      (char) => char.charCodeAt(0),
    );
    const values: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !Array.isArray(values) ||
      values.length !== 7 ||
      typeof values[0] !== 'string' ||
      values[0].length > 100
    )
      throw new Error('Invalid challenge payload');
    const [revision, seed, classId, mode, contract, difficulty, biome] = values;
    return { revision, recipe: readRecipe({ seed, classId, mode, contract, difficulty, biome }) };
  } catch {
    throw new Error('This challenge code contains unsupported rules.');
  }
}
