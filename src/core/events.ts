import type { Vec2 } from './vector';
import type { DiagnosticSample } from './diagnostics';

export interface GameEvents {
  entitySpawned: { entityId: number; kind: string; position: Vec2 };
  runStarted: { id: string; mode: string; classId: string; difficulty: number };
  runRestored: { id: string };
  runEnded: {
    id: string;
    outcome: 'victory' | 'defeat' | 'abandoned';
    elapsed: number;
    score: number;
    assisted: boolean;
  };
  abilityUpgraded: { id: string; level: number; previousLevel: number; evolvedFrom?: string };
  eliteSpawned: { entityId: number; kind: string; modifier: string; position: Vec2 };
  bossStarted: { entityId: number; kind: string; position: Vec2 };
  bossDefeated: { entityId: number; kind: string; position: Vec2 };
  collisionOccurred: { a?: number; b?: number; speed: number; position: Vec2; normal: Vec2 };
  enemyLaunched: {
    entityId: number;
    kind: string;
    velocity: Vec2;
    chainId: number;
    source: string;
  };
  chainStarted: { id: number; source: string };
  chainExtended: { id: number; source: string; length: number; effect: string };
  chainEnded: { id: number; source: string; length: number; reason: 'expired' | 'reset' };
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
  abilityUsed: {
    id: string;
    tags: string[];
    position: Vec2;
    level: number;
    controlTargets?: number;
  };
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
