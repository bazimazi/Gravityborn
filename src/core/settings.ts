export interface Settings {
  version: 1;
  volume: number;
  reducedMotion: boolean;
  leftHanded: boolean;
  lowQuality: boolean;
}
export const defaults: Settings = {
  version: 1,
  volume: 0.35,
  reducedMotion: false,
  leftHanded: false,
  lowQuality: false,
};
const key = 'gravityborn.settings';

export function migrateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...defaults };
  const data = value as Record<string, unknown>;
  if (data.version !== undefined && data.version !== 0 && data.version !== 1)
    return { ...defaults };
  return {
    version: 1,
    volume:
      typeof data.volume === 'number' && Number.isFinite(data.volume)
        ? Math.min(1, Math.max(0, data.volume))
        : defaults.volume,
    reducedMotion:
      typeof data.reducedMotion === 'boolean' ? data.reducedMotion : defaults.reducedMotion,
    leftHanded: typeof data.leftHanded === 'boolean' ? data.leftHanded : defaults.leftHanded,
    lowQuality: typeof data.lowQuality === 'boolean' ? data.lowQuality : defaults.lowQuality,
  };
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    return migrateSettings(JSON.parse(storage.getItem(key) ?? 'null'));
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(
  storage: Pick<Storage, 'setItem'> & Partial<Pick<Storage, 'getItem'>>,
  settings: Settings,
): void {
  try {
    if (storage.getItem) {
      let existing: { version?: number } | null = null;
      try {
        existing = JSON.parse(storage.getItem(key) ?? 'null');
      } catch {
        /* A corrupt settings record can be repaired. */
      }
      if (typeof existing?.version === 'number' && existing.version > settings.version) return;
    }
    storage.setItem(key, JSON.stringify(settings));
  } catch {
    /* Unavailable storage must not stop offline gameplay. */
  }
}
