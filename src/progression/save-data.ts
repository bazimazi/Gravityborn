import { record, SaveStore } from '../core/save';
import type { PersistentStorage } from '../core/storage';
import { parseProfile, type Profile } from './profile';

export interface SaveData {
  profile: Profile;
  checkpoint: unknown;
}
export function readSaveData(
  value: unknown,
  canRestore: (checkpoint: unknown) => boolean,
): SaveData {
  const data = record(value);
  const profile = parseProfile(data.profile);
  const checkpoint = data.checkpoint ?? null;
  if (checkpoint !== null && !canRestore(checkpoint)) throw new Error('Invalid checkpoint');
  return { profile, checkpoint };
}

export type SaveImportResult =
  | { status: 'imported'; data: SaveData }
  | { status: 'invalid' | 'future' | 'unavailable' };

/** Commit the validated record before the caller replaces its live progress. */
export async function importProgress(
  store: SaveStore<SaveData>,
  storage: PersistentStorage,
  text: string,
): Promise<SaveImportResult> {
  if (store.readOnly) return { status: 'future' };
  const data = store.import(text);
  if (!data) return { status: 'invalid' };
  if (!store.save(data)) return { status: store.readOnly ? 'future' : 'unavailable' };
  try {
    if (storage.flush && !(await storage.flush())) throw new Error('Native write failed');
  } catch {
    store.state = 'unavailable';
    return { status: 'unavailable' };
  }
  return { status: 'imported', data };
}
