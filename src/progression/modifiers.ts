import limits from '../data/stat-limits.json';
export type ModifierOperation = 'add' | 'multiply' | 'override';
export const conditionStats = [
  'healthRatio',
  'energyRatio',
  'speed',
  'nearbyEnemies',
  'stored',
] as const;
export type ModifierContext = Partial<Record<(typeof conditionStats)[number], number>>;
export interface ModifierCondition {
  stat: (typeof conditionStats)[number];
  comparison: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  value: number;
}
export function conditionsMatch(
  conditions: readonly ModifierCondition[] | undefined,
  context: ModifierContext,
): boolean {
  return (
    !conditions ||
    conditions.every(({ stat, comparison, value }) => {
      const actual = context[stat];
      if (actual === undefined || !Number.isFinite(actual) || !Number.isFinite(value)) return false;
      switch (comparison) {
        case 'lt':
          return actual < value;
        case 'lte':
          return actual <= value;
        case 'gt':
          return actual > value;
        case 'gte':
          return actual >= value;
        case 'eq':
          return actual === value;
        default:
          return false;
      }
    })
  );
}
export interface Modifier {
  id: string;
  stat: string;
  operation: ModifierOperation;
  value: number;
  tags?: string[];
  priority?: number;
  conditions?: ModifierCondition[];
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
  conditions?: ModifierCondition[];
}

export class ModifierSet {
  readonly values = new Map<string, Modifier>();
  readonly rules = new Map<string, TriggerRule>();
  private readonly ready = new Map<string, number>();
  constructor(readonly context: () => ModifierContext = () => ({})) {}
  add(modifier: Modifier): void {
    if (!Number.isFinite(modifier.value)) throw new Error('Invalid modifier');
    this.values.set(modifier.id, modifier);
  }
  remove(id: string): void {
    this.values.delete(id);
    this.rules.delete(id);
    this.ready.delete(id);
  }
  evaluate(
    stat: string,
    base: number,
    tags: readonly string[] = [],
    context?: ModifierContext,
  ): number {
    let added = base;
    let multiplier = 1;
    let override: Modifier | undefined;
    for (const value of this.values.values()) {
      if (value.stat !== stat || value.tags?.some((tag) => !tags.includes(tag))) continue;
      if (value.conditions && !conditionsMatch(value.conditions, (context ??= this.context())))
        continue;
      if (value.operation === 'add') added += value.value;
      else if (value.operation === 'multiply') multiplier *= value.value;
      else if (!override || (value.priority ?? 0) >= (override.priority ?? 0)) override = value;
    }
    const result = override?.value ?? added * multiplier;
    const [min, max] = (limits as Record<string, number[]>)[stat] ?? [-1000000, 1000000];
    return Math.max(min, Math.min(max, Number.isNaN(result) ? base : result));
  }
  fire(
    trigger: Trigger,
    time: number,
    tags: readonly string[] = [],
    context?: ModifierContext,
  ): TriggerRule[] {
    const effects: TriggerRule[] = [];
    for (const rule of this.rules.values()) {
      if (
        rule.trigger !== trigger ||
        (this.ready.get(rule.id) ?? 0) > time ||
        rule.tags?.some((tag) => !tags.includes(tag))
      )
        continue;
      if (rule.conditions && !conditionsMatch(rule.conditions, (context ??= this.context())))
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
