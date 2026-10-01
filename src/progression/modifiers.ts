import limits from '../data/stat-limits.json';
export type ModifierOperation = 'add' | 'multiply' | 'override';
export interface Modifier {
  id: string;
  stat: string;
  operation: ModifierOperation;
  value: number;
  tags?: string[];
  priority?: number;
}
export type Trigger =
  | 'OnCollision'
  | 'OnKill'
  | 'OnGravityChange'
  | 'OnAbilityCast'
  | 'OnDamage'
  | 'OnDeath'
  | 'Periodic';
export interface TriggerRule {
  id: string;
  trigger: Trigger;
  effect: string;
  value: number;
  cooldown: number;
  tags?: string[];
}

export class ModifierSet {
  readonly values = new Map<string, Modifier>();
  readonly rules = new Map<string, TriggerRule>();
  private readonly ready = new Map<string, number>();
  add(modifier: Modifier): void {
    if (!Number.isFinite(modifier.value)) throw new Error('Invalid modifier');
    this.values.set(modifier.id, modifier);
  }
  remove(id: string): void {
    this.values.delete(id);
    this.rules.delete(id);
    this.ready.delete(id);
  }
  evaluate(stat: string, base: number, tags: readonly string[] = []): number {
    let added = base;
    let multiplier = 1;
    let override: Modifier | undefined;
    for (const value of this.values.values()) {
      if (value.stat !== stat || value.tags?.some((tag) => !tags.includes(tag))) continue;
      if (value.operation === 'add') added += value.value;
      else if (value.operation === 'multiply') multiplier *= value.value;
      else if (!override || (value.priority ?? 0) >= (override.priority ?? 0)) override = value;
    }
    const result = override?.value ?? added * multiplier;
    const [min, max] = (limits as Record<string, number[]>)[stat] ?? [-1000000, 1000000];
    return Math.max(min, Math.min(max, Number.isNaN(result) ? base : result));
  }
  fire(trigger: Trigger, time: number, tags: readonly string[] = []): TriggerRule[] {
    const effects: TriggerRule[] = [];
    for (const rule of this.rules.values()) {
      if (
        rule.trigger !== trigger ||
        (this.ready.get(rule.id) ?? 0) > time ||
        rule.tags?.some((tag) => !tags.includes(tag))
      )
        continue;
      this.ready.set(rule.id, time + rule.cooldown);
      effects.push(rule);
    }
    return effects;
  }
  clear(): void {
    this.values.clear();
    this.rules.clear();
    this.ready.clear();
  }
}
