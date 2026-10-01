import balance from '../data/balance.json';

interface Chain {
  id: number;
  expires: number;
  effects: Set<string>;
}
export class ChainTracker {
  private nextId = 1;
  private readonly chains = new Map<number, Chain>();
  best = 0;
  current = 0;

  start(time: number): number {
    const id = this.nextId++;
    this.chains.set(id, { id, expires: time + balance.combat.chainTimeout, effects: new Set() });
    return id;
  }

  extend(id: number | null, effect: string, depth: number, time: number): number {
    if (id === null || depth > balance.combat.maxChainDepth) return 0;
    const chain = this.chains.get(id);
    if (!chain || chain.expires < time) return 0;
    chain.effects.add(effect);
    const length = Math.min(chain.effects.size, balance.combat.maxChainDepth);
    this.current = Math.max(this.current, length);
    this.best = Math.max(this.best, length);
    return length;
  }

  tick(time: number): void {
    for (const chain of this.chains.values())
      if (chain.expires < time) this.chains.delete(chain.id);
    this.current = 0;
    for (const chain of this.chains.values())
      this.current = Math.max(
        this.current,
        Math.min(chain.effects.size, balance.combat.maxChainDepth),
      );
  }

  clear(): void {
    this.chains.clear();
    this.best = 0;
    this.current = 0;
  }
}
