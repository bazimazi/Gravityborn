import balance from '../data/balance.json';
import type { EventBus } from '../core/events';

interface Chain {
  id: number;
  expires: number;
  effects: Set<string>;
  source: string;
  created: number;
}
export class ChainTracker {
  private nextId = 1;
  private readonly chains = new Map<number, Chain>();
  best = 0;
  current = 0;
  constructor(private readonly events?: EventBus) {}

  start(time: number, source = 'environment'): number {
    const id = this.nextId++;
    this.chains.set(id, {
      id,
      expires: time + balance.combat.chainTimeout,
      effects: new Set(),
      source,
      created: time,
    });
    this.events?.emit('chainStarted', { id, source });
    return id;
  }

  extend(id: number | null, effect: string, depth: number, time: number): number {
    if (id === null || depth > balance.combat.maxChainDepth) return 0;
    const chain = this.chains.get(id);
    if (!chain || chain.expires < time) return 0;
    const extended =
      !chain.effects.has(effect) && chain.effects.size < balance.combat.maxChainEffects;
    if (extended) chain.effects.add(effect);
    const length = Math.min(chain.effects.size, balance.combat.maxChainEffects);
    this.current = Math.max(this.current, length);
    this.best = Math.max(this.best, length);
    if (extended) this.events?.emit('chainExtended', { id, source: chain.source, length, effect });
    return length;
  }

  tick(time: number): void {
    for (const chain of this.chains.values())
      if (chain.expires < time) {
        this.chains.delete(chain.id);
        this.events?.emit('chainEnded', {
          id: chain.id,
          source: chain.source,
          length: chain.effects.size,
          reason: 'expired',
        });
      }
    this.current = 0;
    for (const chain of this.chains.values())
      this.current = Math.max(
        this.current,
        Math.min(chain.effects.size, balance.combat.maxChainEffects),
      );
  }
  source(id: number | null): string {
    return id === null ? 'environment' : (this.chains.get(id)?.source ?? 'environment');
  }
  touch(id: number, time: number): void {
    const chain = this.chains.get(id);
    if (chain)
      chain.expires = Math.min(
        chain.created + balance.combat.maxChainLifetime,
        time + balance.combat.chainTimeout,
      );
  }

  clear(): void {
    for (const chain of this.chains.values())
      this.events?.emit('chainEnded', {
        id: chain.id,
        source: chain.source,
        length: chain.effects.size,
        reason: 'reset',
      });
    this.chains.clear();
    this.best = 0;
    this.current = 0;
  }
}
