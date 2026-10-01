import type { Vec2 } from './vector';
import type { DiagnosticSample } from './diagnostics';

export interface GameEvents {
  diagnostic: DiagnosticSample;
  materialReaction: { kind: 'ignite' | 'quench' | 'arc'; position: Vec2; from?: Vec2 };
  gravityChanged: { direction: Vec2; source?: 'player' | 'enemy' };
  wellCreated: { position: Vec2 };
  impact: { position: Vec2; force: number; color: string };
  explosion: { position: Vec2; radius: number; chainId: number | null };
  damaged: { position: Vec2; amount: number; player: boolean };
  killed: {
    position: Vec2;
    kind: string;
    chainId: number | null;
    chainLength: number;
    source: string;
    elite: boolean;
    boss: boolean;
    damageTags: string[];
  };
  ended: { won: boolean };
  abilityUsed: { id: string; tags: string[]; position: Vec2; level: number };
  collected: { kind: 'xp' | 'shard'; amount: number; position: Vec2 };
}

/** Simulation emits facts. Presentation subscribes without owning gameplay. */
export class EventBus {
  private readonly listeners = new Map<keyof GameEvents, Set<(payload: never) => void>>();

  on<K extends keyof GameEvents>(name: K, handler: (payload: GameEvents[K]) => void): () => void {
    const listeners = this.listeners.get(name) ?? new Set();
    listeners.add(handler as (payload: never) => void);
    this.listeners.set(name, listeners);
    return () => {
      listeners.delete(handler as (payload: never) => void);
    };
  }

  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void {
    this.listeners.get(name)?.forEach((handler) => handler(payload as never));
  }

  clear(): void {
    this.listeners.clear();
  }
}
