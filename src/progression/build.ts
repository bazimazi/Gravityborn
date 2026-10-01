import Matter from 'matter-js';
import { Random } from '../core/random';
import { abilities, abilityById } from '../content/abilities';
import { relics, relicById, synergies } from '../content/relics';
import type { Game } from '../gameplay/game';
import type { Modifier } from './modifiers';
import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';

export interface UpgradeChoice {
  id: string;
  name: string;
  description: string;
  kind: 'ability' | 'relic' | 'passive';
  target: string;
}
const passives: {
  id: string;
  name: string;
  description: string;
  modifier: Omit<Modifier, 'id'>;
}[] = [
  {
    id: 'integrity',
    name: 'Reinforced Core',
    description: 'Gain 20 maximum integrity and repair 20.',
    modifier: { stat: 'maxHealth', operation: 'add', value: 20 },
  },
  {
    id: 'recovery',
    name: 'Energy Recovery',
    description: 'Regenerate two additional energy per second.',
    modifier: { stat: 'energyRegen', operation: 'add', value: 2 },
  },
  {
    id: 'cooling',
    name: 'Cold Circuit',
    description: 'All power cooldowns are 10% shorter.',
    modifier: { stat: 'cooldown', operation: 'multiply', value: 0.9 },
  },
  {
    id: 'force',
    name: 'Force Amplifier',
    description: 'All power impulses and fields gain 15% strength.',
    modifier: { stat: 'strength', operation: 'multiply', value: 1.15 },
  },
];
export class RunBuild {
  xp = 0;
  level = 1;
  pending = 0;
  currency = 0;
  readonly relics: string[] = [];
  readonly passives: string[] = [];
  choices: UpgradeChoice[] = [];
  readonly random: Random;
  constructor(
    readonly game: Game,
    seed: string,
    readonly classId = 'manipulator',
  ) {
    this.random = new Random(`${seed}:rewards`);
  }
  get threshold(): number {
    return 40 + this.level * 20;
  }
  gainXP(amount: number): void {
    this.xp += Math.max(0, amount);
    while (this.xp >= this.threshold) {
      this.xp -= this.threshold;
      this.level++;
      this.pending++;
    }
  }
  offer(): UpgradeChoice[] {
    if (this.choices.length) return this.choices;
    const pool: UpgradeChoice[] = [];
    for (const ability of abilities) {
      const level = this.game.abilities.levels.get(ability.id) ?? 0;
      const isEvolution = abilities.some((parent) => parent.evolution === ability.id);
      if (isEvolution && !level) continue;
      if (
        level >= ability.maxLevel &&
        (!ability.evolution || this.game.abilities.levels.has(ability.evolution))
      )
        continue;
      pool.push({
        id: `ability:${ability.id}`,
        kind: 'ability',
        target: ability.id,
        name:
          level >= ability.maxLevel
            ? `Evolve: ${abilityById.get(ability.evolution!)!.name}`
            : `${ability.name}${level ? ` ${level + 1}` : ''}`,
        description: ability.description,
      });
    }
    for (const relic of relics)
      if (!this.relics.includes(relic.id))
        pool.push({
          id: `relic:${relic.id}`,
          kind: 'relic',
          target: relic.id,
          name: relic.name,
          description: relic.description,
        });
    for (const passive of passives)
      pool.push({
        id: `passive:${passive.id}`,
        kind: 'passive',
        target: passive.id,
        name: passive.name,
        description: passive.description,
      });
    this.choices = this.random.shuffle(pool).slice(0, 3);
    return this.choices;
  }
  choose(id: string): boolean {
    if (this.pending <= 0) return false;
    const choice = this.choices.find((choice) => choice.id === id);
    if (!choice) return false;
    if (choice.kind === 'ability') this.game.abilities.learn(choice.target);
    else if (choice.kind === 'relic') this.relics.push(choice.target);
    else this.passives.push(choice.target);
    this.pending--;
    this.choices = [];
    this.apply();
    if (choice.target === 'integrity')
      this.game.player.health = Math.min(this.game.maxHealth, this.game.player.health + 20);
    return true;
  }
  addRelic(id: string): boolean {
    if (!relicById.has(id) || this.relics.includes(id)) return false;
    this.relics.push(id);
    this.apply();
    return true;
  }
  apply(): void {
    const modifiers = this.game.abilities.modifiers;
    // Preserve trigger clocks within a room while rebuilding derived modifiers.
    modifiers.values.clear();
    modifiers.rules.clear();
    classById
      .get(this.classId)
      ?.modifiers.forEach((modifier, index) =>
        modifiers.add({ ...modifier, id: `class:${index}` }),
      );
    for (const id of this.relics) {
      const relic = relicById.get(id);
      if (!relic) continue;
      relic.modifiers?.forEach((modifier, index) =>
        modifiers.add({ ...modifier, id: `relic:${id}:${index}` }),
      );
      relic.triggers?.forEach((rule, index) =>
        modifiers.rules.set(`relic:${id}:${index}`, { ...rule, id: `relic:${id}:${index}` }),
      );
    }
    this.passives.forEach((id, index) => {
      const passive = passives.find((passive) => passive.id === id);
      if (passive) modifiers.add({ ...passive.modifier, id: `passive:${index}` });
    });
    for (const synergy of synergies)
      if (synergy.requires.every((id) => this.game.abilities.levels.has(id)))
        modifiers.add({
          id: `synergy:${synergy.id}`,
          stat: synergy.stat,
          operation: 'multiply',
          value: synergy.value,
          tags: [...synergy.tags],
        });
    Matter.Body.setMass(
      this.game.player.body,
      Math.max(0.1, modifiers.evaluate('mass', this.game.player.definition.mass)),
    );
    Matter.Body.setInertia(this.game.player.body, Infinity);
    this.game.player.gravityScale = modifiers.evaluate('gravityResponse', 1);
    this.game.player.health = Math.min(this.game.maxHealth, this.game.player.health);
  }
  get activeSynergies(): string[] {
    return synergies
      .filter((synergy) => synergy.requires.every((id) => this.game.abilities.levels.has(id)))
      .map((synergy) => synergy.name);
  }
  snapshot(): unknown {
    return {
      xp: this.xp,
      level: this.level,
      pending: this.pending,
      currency: this.currency,
      relics: this.relics,
      passives: this.passives,
      choices: this.choices,
      random: this.random.state,
    };
  }
  restore(value: unknown): void {
    const data = record(value);
    this.xp = finite(data.xp, 0, 1000000);
    this.level = Math.floor(finite(data.level, 1, 10000));
    this.pending = Math.floor(finite(data.pending, 0, 100));
    this.currency = Math.floor(finite(data.currency, 0, 10000000));
    this.relics.splice(
      0,
      this.relics.length,
      ...new Set(strings(data.relics, 200).filter((id) => relicById.has(id))),
    );
    this.passives.splice(
      0,
      this.passives.length,
      ...strings(data.passives, 1000).filter((id) => passives.some((passive) => passive.id === id)),
    );
    this.random.state = finite(data.random, 0, 4294967295) >>> 0;
    this.choices = [];
    if (Array.isArray(data.choices) && data.choices.length <= 3)
      for (const value of data.choices) {
        const choice = record(value);
        const kind = choice.kind;
        const target = choice.target;
        if (
          typeof target !== 'string' ||
          typeof choice.id !== 'string' ||
          choice.id !== `${kind}:${target}`
        )
          throw new Error('Invalid upgrade');
        const definition =
          kind === 'ability'
            ? abilityById.get(target)
            : kind === 'relic'
              ? relicById.get(target)
              : kind === 'passive'
                ? passives.find((passive) => passive.id === target)
                : undefined;
        if (!definition) throw new Error('Unknown upgrade');
        this.choices.push({
          id: choice.id,
          kind: kind as UpgradeChoice['kind'],
          target,
          name: definition.name,
          description: definition.description,
        });
      }
  }
}
