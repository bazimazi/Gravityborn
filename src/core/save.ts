export interface SaveEnvelope {
  version: 2;
  checksum: string;
  payload: unknown;
}
export type SaveState = 'empty' | 'loaded' | 'recovered' | 'corrupt' | 'future' | 'unavailable';
const key = 'gravityborn.save';
export function checksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
export class SaveStore {
  state: SaveState = 'empty';
  get readOnly(): boolean {
    return this.state === 'future';
  }
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'>) {}
  load(): unknown {
    try {
      const primary = this.storage.getItem(key);
      if (!primary) {
        this.state = 'empty';
        return null;
      }
      const decoded = this.decode(primary);
      if (this.state === 'future') return null;
      if (decoded !== undefined) {
        this.state = 'loaded';
        return decoded;
      }
      const backup = this.storage.getItem(`${key}.backup`);
      if (backup) {
        const restored = this.decode(backup);
        if (restored !== undefined) {
          this.state = 'recovered';
          return restored;
        }
      }
      this.state = 'corrupt';
      return null;
    } catch {
      this.state = 'unavailable';
      return null;
    }
  }
  save(payload: unknown): boolean {
    if (this.readOnly) return false;
    try {
      const old = this.storage.getItem(key);
      if (old) {
        const decoded = this.decode(old);
        if (this.readOnly) return false;
        if (decoded !== undefined) this.storage.setItem(`${key}.backup`, old);
      }
      const encoded = JSON.stringify(payload);
      if (encoded.length > 1000000) return false;
      const envelope: SaveEnvelope = { version: 2, checksum: checksum(encoded), payload };
      this.storage.setItem(key, JSON.stringify(envelope));
      this.state = 'loaded';
      return true;
    } catch {
      this.state = 'unavailable';
      return false;
    }
  }
  export(payload: unknown): string {
    const encoded = JSON.stringify(payload);
    return JSON.stringify({ version: 2, checksum: checksum(encoded), payload }, null, 2);
  }
  import(text: string): unknown {
    const previous = this.state;
    const decoded = this.decode(text);
    this.state = previous;
    return decoded;
  }
  private decode(text: string): unknown {
    try {
      if (text.length > 1100000) return undefined;
      const envelope = JSON.parse(text);
      if (!envelope || typeof envelope !== 'object') return undefined;
      if (envelope.version > 2) {
        this.state = 'future';
        return undefined;
      }
      if (envelope.version === 1 && envelope.profile)
        return { profile: envelope.profile, checkpoint: envelope.checkpoint ?? null };
      if (
        envelope.version !== 2 ||
        envelope.checksum !== checksum(JSON.stringify(envelope.payload))
      )
        return undefined;
      return envelope.payload;
    } catch {
      return undefined;
    }
  }
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid save record');
  return value as Record<string, unknown>;
}
export function finite(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error('Invalid saved number');
  return value;
}
export function strings(value: unknown, max = 200): string[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((item) => typeof item !== 'string' || item.length > 200)
  )
    throw new Error('Invalid saved list');
  return value;
}
