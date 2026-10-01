import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

type LocalStore = Pick<Storage, 'getItem' | 'setItem'>;
interface NativeStore {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}
const keys = ['gravityborn.save', 'gravityborn.save.backup', 'gravityborn.settings'];

/** Preload native records, then serialize writes so backup and primary cannot race. */
export class NativeStorage implements LocalStore {
  private readonly cache = new Map<string, string>();
  private pending: Promise<void> = Promise.resolve();
  private failed = false;
  constructor(private readonly native: NativeStore) {}
  async load(): Promise<void> {
    const entries = await Promise.all(
      keys.map(async (key) => [key, (await this.native.get({ key })).value] as const),
    );
    for (const [key, value] of entries) if (value !== null) this.cache.set(key, value);
  }
  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failed) throw new Error('Native storage unavailable');
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    this.pending = this.pending.then(async () => {
      if (this.failed) return;
      try {
        await this.native.set({ key, value });
      } catch {
        this.failed = true;
      }
    });
  }
  async flush(): Promise<boolean> {
    await this.pending;
    return !this.failed;
  }
}
export type PersistentStorage = LocalStore & { flush?: () => Promise<boolean> };
export async function openStorage(): Promise<PersistentStorage> {
  try {
    if (!Capacitor.isNativePlatform()) return window.localStorage;
    const storage = new NativeStorage(Preferences);
    await storage.load();
    return storage;
  } catch {
    // Never replace unreadable native records with an empty profile.
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error('Storage unavailable');
      },
    };
  }
}
