import Matter from 'matter-js';
import { Random } from '../core/random';
import { abilities, abilityById } from '../content/abilities';
import { relics, relicById, synergies } from '../content/relics';
import type { Game } from '../gameplay/game';
import type { Modifier } from './modifiers';
import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';
import { equipmentById, equipmentSets, affixes } from '../content/equipment';
import { researchNodes, mutations } from '../content/research';
import type { Profile } from './profile';
import { wellEvolutions } from '../content/well';

export interface UpgradeChoice {
  id: string;
  name: string;
  description: string;
  kind: 'ability' | 'relic' | 'passive' | 'well';
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
  wellLevel = 1;
  equipment: { id: string; level: number; affix: string }[] = [];
  skills: string[] = [];
  mutation = '';
  rerolls = 0;
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
  configure(profile: Profile): void {
    this.equipment = Object.values(profile.loadout)
      .filter((id) => profile.equipment[id] && equipmentById.has(id))
      .map((id) => ({ id, level: profile.equipment[id], affix: profile.affixes[id] ?? '' }));
    this.skills = [...profile.skills];
    this.mutation = profile.skills.includes('mutations') ? profile.mutation : '';
    this.rerolls =
      Number(this.skills.includes('reroll')) + Number(this.skills.includes('reroll_plus'));
    if (this.skills.includes('scavenger')) this.currency += 15;
    this.apply();
  }
  reroll(): boolean {
    if (!this.pending || !this.rerolls) return false;
    this.rerolls--;
    this.choices = [];
    this.offer();
    return true;
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
    if (this.wellLevel < wellEvolutions.length) {
      const evolution = wellEvolutions[this.wellLevel];
      pool.push({
        id: 'well:well',
        kind: 'well',
        target: 'well',
        name: evolution.name,
        description: evolution.description,
      });
    }
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
    if (choice.kind === 'well') {
      if (this.wellLevel >= wellEvolutions.length) return false;
      this.wellLevel++;
    } else if (choice.kind === 'ability') this.game.abilities.learn(choice.target);
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
    for (let level = 1; level < this.wellLevel; level++)
      wellEvolutions[level].modifiers.forEach((modifier, index) =>
        modifiers.add({ ...modifier, id: `well:${level}:${index}` }),
      );
    classById
      .get(this.classId)
      ?.modifiers.forEach((modifier, index) =>
        modifiers.add({ ...modifier, id: `class:${index}` }),
      );
    for (const id of this.skills) {
      const modifier = researchNodes.find((node) => node.id === id)?.modifier;
      if (modifier) modifiers.add({ ...modifier, id: `research:${id}` });
    }
    const mutation = mutations.find((mutation) => mutation.id === this.mutation);
    mutation?.modifiers.forEach((modifier, index) =>
      modifiers.add({ ...modifier, id: `mutation:${index}` }),
    );
    mutation?.triggers?.forEach((rule, index) =>
      modifiers.rules.set(`mutation:${index}`, { ...rule, id: `mutation:${index}` }),
    );
    const sets = new Map<string, number>();
    for (const entry of this.equipment) {
      const definition = equipmentById.get(entry.id);
      if (!definition) continue;
      sets.set(definition.set, (sets.get(definition.set) ?? 0) + 1);
      definition.modifiers.forEach((modifier, index) => {
        const factor = 1 + (entry.level - 1) * 0.06;
        const value =
          index === 0 && definition.rarity !== 'legendary'
            ? modifier.operation === 'multiply'
              ? Math.max(0.1, 1 + (modifier.value - 1) * factor)
              : modifier.value * factor
            : modifier.value;
        modifiers.add({ ...modifier, value, id: `equipment:${entry.id}:${index}` });
      });
      definition.triggers?.forEach((rule, index) =>
        modifiers.rules.set(`equipment:${entry.id}:${index}`, {
          ...rule,
          id: `equipment:${entry.id}:${index}`,
        }),
      );
      const affix = affixes.find((affix) => affix.id === entry.affix);
      if (affix) modifiers.add({ ...affix.modifier, id: `affix:${entry.id}` });
    }
    for (const [id, count] of sets)
      if (count >= 3) {
        const set = equipmentSets.get(id);
        if (set) modifiers.add({ ...set.modifier, id: `set:${id}` });
      }
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
    this.game.abilities.energy = Math.min(
      this.game.abilities.maxEnergy,
      this.game.abilities.energy,
    );
  }
  get activeSynergies(): string[] {
    return synergies
      .filter((synergy) => synergy.requires.every((id) => this.game.abilities.levels.has(id)))
      .map((synergy) => synergy.name);
  }
  snapshot(): unknown {
    return {
      equipment: this.equipment,
      wellLevel: this.wellLevel,
      skills: this.skills,
      mutation: this.mutation,
      rerolls: this.rerolls,
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
    this.wellLevel = Math.floor(finite(data.wellLevel ?? 1, 1, wellEvolutions.length));
    this.skills = strings(data.skills ?? [], 100).filter((id) =>
      researchNodes.some((node) => node.id === id),
    );
    this.mutation =
      typeof data.mutation === 'string' &&
      mutations.some((mutation) => mutation.id === data.mutation)
        ? data.mutation
        : '';
    this.rerolls = Math.floor(finite(data.rerolls ?? 0, 0, 10));
    this.equipment = [];
    if (
      !Array.isArray(data.equipment ?? []) ||
      (data.equipment as unknown[] | undefined)?.length! > 6
    )
      throw new Error('Invalid loadout');
    const slots = new Set<string>();
    for (const value of (data.equipment ?? []) as unknown[]) {
      const entry = record(value);
      const definition = typeof entry.id === 'string' ? equipmentById.get(entry.id) : undefined;
      if (!definition || slots.has(definition.slot)) throw new Error('Invalid equipment');
      slots.add(definition.slot);
      this.equipment.push({
        id: definition.id,
        level: Math.floor(finite(entry.level, 1, 5)),
        affix:
          typeof entry.affix === 'string' && affixes.some((affix) => affix.id === entry.affix)
            ? entry.affix
            : '',
      });
    }
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
                : kind === 'well' && target === 'well' && this.wellLevel < wellEvolutions.length
                  ? wellEvolutions[this.wellLevel]
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
