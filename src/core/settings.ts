export interface Settings {
  version: 1;
  volume: number;
  reducedMotion: boolean;
  leftHanded: boolean;
  lowQuality: boolean;
  musicVolume: number;
  reducedFlashing: boolean;
  highContrast: boolean;
  haptics: boolean;
  uiScale: number;
  joystickScale: number;
  joystickDeadzone: number;
  frameRate: number;
  swipeGravity: boolean;
}
export const defaults: Settings = {
  version: 1,
  volume: 0.35,
  reducedMotion: false,
  leftHanded: false,
  lowQuality: false,
  musicVolume: 0.25,
  reducedFlashing: false,
  highContrast: false,
  haptics: false,
  uiScale: 1,
  joystickScale: 1,
  joystickDeadzone: 0.1,
  frameRate: 60,
  swipeGravity: true,
};
const key = 'gravityborn.settings';

export function migrateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...defaults };
  const data = value as Record<string, unknown>;
  if (data.version !== undefined && data.version !== 0 && data.version !== 1)
    return { ...defaults };
  const number = (id: keyof Settings, min: number, max: number): number =>
    typeof data[id] === 'number' && Number.isFinite(data[id])
      ? Math.min(max, Math.max(min, data[id] as number))
      : (defaults[id] as number);
  const boolean = (id: keyof Settings): boolean =>
    typeof data[id] === 'boolean' ? (data[id] as boolean) : (defaults[id] as boolean);
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
    musicVolume: number('musicVolume', 0, 1),
    reducedFlashing: boolean('reducedFlashing'),
    highContrast: boolean('highContrast'),
    haptics: boolean('haptics'),
    uiScale: number('uiScale', 1, 1.4),
    joystickScale: number('joystickScale', 0.8, 1.3),
    joystickDeadzone: number('joystickDeadzone', 0, 0.35),
    frameRate: data.frameRate === 30 ? 30 : 60,
    swipeGravity: boolean('swipeGravity'),
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
