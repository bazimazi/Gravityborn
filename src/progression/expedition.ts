import { Game } from '../gameplay/game';
import { RunBuild } from './build';
import { generateMap, type MapNode } from './map';
import { buildRoom } from '../content/rooms';
import { entityDefinitions } from '../content/enemies';
import { relics, relicById } from '../content/relics';
import type { EntityKind } from '../physics/world';
import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';
import type { AbilitySnapshot } from '../gameplay/abilities';
import type { Profile } from './profile';
import { encounters } from '../content/events';
import { Random } from '../core/random';
import { modes, rotatingChallenge, type RunMode } from '../content/modes';
import { contracts, phenomena, type Contract, type Phenomenon } from '../content/phenomena';
import { bossDefinitions, type BossKind } from '../content/bosses';
export interface RunOptions {
  mode?: RunMode;
  contract?: Contract;
  difficulty?: number;
  date?: Date;
}

export type ExpeditionPhase = 'inactive' | 'map' | 'room' | 'reward' | 'shop' | 'event' | 'summary';
export class Expedition {
  id = '';
  classId = 'manipulator';
  startBiome = 0;
  eventId = 'fracture';
  mode: RunMode = 'standard';
  contract: Contract = 'none';
  difficulty = 0;
  depth = 0;
  phenomenon: Phenomenon | '' = '';
  score = 0;
  bestChain = 0;
  phase: ExpeditionPhase = 'inactive';
  seed = '';
  biome = 0;
  map: MapNode[] = [];
  current: MapNode | undefined;
  build!: RunBuild;
  rooms = 0;
  kills = 0;
  elapsed = 0;
  won = false;
  message = '';
  shop: { id: string; price: number; sold: boolean }[] = [];
  constructor(readonly game: Game) {
    game.events.on('killed', (event) => {
      if (this.phase !== 'room' || entityDefinitions[event.kind as EntityKind]?.faction !== 'enemy')
        return;
      this.kills++;
      this.build.gainXP(18 + Math.min(30, event.chainLength * 3));
      this.build.currency += 5;
    });
    game.events.on('ended', (event) => {
      if (this.phase !== 'room') return;
      this.elapsed += game.time;
      this.score += game.stats.score;
      this.bestChain = Math.max(this.bestChain, game.chains.best);
      if (!event.won) {
        this.phase = 'summary';
        this.message = 'The core fell silent. Your discoveries remain.';
        this.won = false;
        return;
      }
      this.completeRoom();
    });
  }
  get active(): boolean {
    return this.phase !== 'inactive';
  }
  get available(): MapNode[] {
    return this.map.filter(
      (node) =>
        !node.visited && (this.current ? this.current.next.includes(node.id) : node.row === 0),
    );
  }
  start(
    seed: string,
    classId = 'manipulator',
    profile?: Profile,
    biome = 0,
    options: RunOptions = {},
  ): void {
    this.mode = modes.some((mode) => mode.id === options.mode) ? options.mode! : 'standard';
    if (this.mode === 'endless' && !profile?.skills.includes('endless')) this.mode = 'standard';
    this.contract = contracts.some((contract) => contract.id === options.contract)
      ? options.contract!
      : 'none';
    this.difficulty = Math.max(0, Math.min(6, Math.floor(options.difficulty ?? 0)));
    this.depth = 0;
    this.phenomenon = '';
    this.score = 0;
    this.bestChain = 0;
    if (this.mode === 'daily' || this.mode === 'weekly') {
      const challenge = rotatingChallenge(this.mode, options.date);
      seed = challenge.seed;
      classId = challenge.classId;
      this.phenomenon = challenge.phenomenon;
      profile = undefined;
      biome = 0;
      this.contract = 'none';
      this.difficulty = 1;
    }
    if (this.mode === 'challenge') {
      this.phenomenon = 'rotating';
      this.difficulty = Math.max(2, this.difficulty);
    }
    if (this.mode === 'campaign') biome = 0;
    this.id = crypto.randomUUID();
    this.classId = classById.has(classId) ? classId : 'manipulator';
    this.seed = seed.trim().slice(0, 64) || 'gravityborn';
    this.startBiome =
      profile?.skills.includes('navigation') &&
      (profile.skills.includes('survey') || profile.discoveries.includes(`biome:${biome}`))
        ? Math.max(0, Math.min(7, Math.floor(biome)))
        : 0;
    this.biome = this.startBiome;
    this.rooms = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.won = false;
    this.game.reset(false);
    this.game.abilities.levels.clear();
    for (const id of classById.get(this.classId)!.powers) this.game.abilities.learn(id);
    this.build = new RunBuild(this.game, this.seed, this.classId);
    if (profile) this.build.configure(profile);
    this.build.apply();
    this.game.player.health = this.game.maxHealth;
    this.map = this.createMap();
    this.current = undefined;
    this.phase = 'map';
    this.message = 'Choose a route. Health and your build carry between rooms.';
  }
  enter(id: string): boolean {
    if (this.phase !== 'map' || this.build.pending > 0) return false;
    const node = this.available.find((node) => node.id === id);
    if (!node) return false;
    const health = this.game.player.health;
    const powers = this.game.abilities.snapshot();
    this.current = node;
    const room = buildRoom(
      `${this.seed}:${this.depth}`,
      node.id,
      node.type,
      this.biome,
      this.rooms + this.difficulty,
    );
    if (this.mode === 'boss_rush')
      room.spawns = room.spawns.map((spawn) =>
        spawn.kind in bossDefinitions
          ? { ...spawn, kind: (Object.keys(bossDefinitions) as BossKind[])[node.row % 5] }
          : spawn,
      );
    if (this.difficulty >= 2) {
      const enemy = room.spawns.find(
        (spawn) => spawn.kind !== 'player' && entityDefinitions[spawn.kind].faction === 'enemy',
      );
      if (enemy)
        enemy.elite = ['inverted', 'orbital', 'vampire', 'heavy', 'singularity'][
          Math.min(4, this.difficulty - 2)
        ] as 'inverted' | 'orbital' | 'vampire' | 'heavy' | 'singularity';
    }
    if (this.difficulty >= 3)
      room.hazards.push({
        kind: 'laser',
        x: 600,
        y: 400,
        width: 650,
        height: 18,
        period: 4,
        phase: 0,
      });
    this.game.reset(true, room);
    this.game.abilities.restore(powers);
    this.build.apply();
    this.game.abilities.restore(powers);
    this.game.player.health = Math.min(this.game.maxHealth, health);
    this.game.abilities.cooldowns.clear();
    this.game.abilities.energy = this.game.abilities.maxEnergy;
    const random = new Random(`${this.seed}:${this.depth}:${node.id}:anomaly`);
    const phenomenon =
      this.phenomenon ||
      (this.depth > 0 || this.difficulty >= 4 || (this.rooms > 2 && random.next() < 0.18)
        ? random.pick(phenomena).id
        : '');
    this.game.rules.configure(
      `${this.seed}:${node.id}`,
      phenomenon,
      this.contract,
      Math.min(12, this.difficulty + this.depth),
    );
    if (['combat', 'elite', 'challenge', 'boss', 'puzzle'].includes(node.type)) {
      this.phase = 'room';
      this.message =
        node.type === 'puzzle'
          ? 'Move a heavy object onto the mass switch, then reach the exit.'
          : 'Clear the chamber with gravity.';
      this.game.start();
    } else if (node.type === 'shop') {
      this.phase = 'shop';
      this.shop = this.build.random
        .shuffle(relics.filter((relic) => !this.build.relics.includes(relic.id)))
        .slice(0, 3)
        .map((relic) => ({
          id: relic.id,
          price: relic.rarity === 'legendary' ? 100 : relic.rarity === 'rare' ? 65 : 40,
          sold: false,
        }));
      this.message = 'The salvage trader accepts matter shards.';
    } else if (node.type === 'event') {
      this.phase = 'event';
      const encounter = new Random(`${this.seed}:${node.id}:event`).pick(encounters);
      this.eventId = encounter.id;
      this.message = encounter.text;
    } else {
      if (node.type === 'rest') {
        const amount = Math.ceil(this.game.maxHealth * 0.4);
        this.game.player.health = Math.min(this.game.maxHealth, this.game.player.health + amount);
        this.message = `The sanctuary restored up to ${amount} integrity.`;
      } else this.grantRelic(node.type === 'secret');
      this.completeRoom(false);
    }
    return true;
  }
  buy(id: string): boolean {
    const item = this.shop.find((item) => item.id === id);
    if (this.phase !== 'shop' || !item || item.sold || this.build.currency < item.price)
      return false;
    if (!this.build.addRelic(id)) return false;
    this.build.currency -= item.price;
    item.sold = true;
    this.message = `Acquired ${relicById.get(id)!.name}.`;
    return true;
  }
  resolveEvent(choice: string): boolean {
    if (this.phase !== 'event') return false;
    const effect = encounters
      .find((event) => event.id === this.eventId)
      ?.choices.find((candidate) => candidate.id === choice);
    if (!effect || !this.canResolveEvent(choice)) return false;
    this.game.player.health -= effect.healthCost ?? 0;
    this.build.currency -= effect.currencyCost ?? 0;
    this.game.player.health = Math.min(
      this.game.maxHealth,
      this.game.player.health + (effect.heal ?? 0),
    );
    this.build.currency += effect.currency ?? 0;
    this.build.gainXP(effect.xp ?? 0);
    if (effect.power) this.game.abilities.learn(effect.power);
    if (effect.mutation) this.build.mutation = effect.mutation;
    this.build.apply();
    this.message = effect.description;
    if (effect.relic) this.grantRelic(effect.relic === 'rare');
    this.completeRoom(false);
    return true;
  }
  canResolveEvent(id: string): boolean {
    const choice = encounters
      .find((event) => event.id === this.eventId)
      ?.choices.find((choice) => choice.id === id);
    return Boolean(
      choice &&
        this.game.player.health > (choice.healthCost ?? 0) &&
        this.build.currency >= (choice.currencyCost ?? 0),
    );
  }
  leaveShop(): void {
    if (this.phase === 'shop') this.completeRoom(false);
  }
  advance(): boolean {
    if (this.phase !== 'reward' || this.build.pending > 0) return false;
    if (this.current?.type === 'boss' && this.current.next.length === 0) {
      const limit = modes.find((mode) => mode.id === this.mode)!.regions;
      if (this.mode !== 'endless' && this.biome >= Math.min(7, this.startBiome + limit - 1)) {
        this.won = true;
        this.phase = 'summary';
        this.message = 'The route is liberated. The expedition returns with new knowledge.';
        return true;
      }
      this.biome = (this.biome + 1) % 8;
      this.depth++;
      this.map = this.createMap();
      this.current = undefined;
    }
    this.phase = 'map';
    return true;
  }
  abandon(): void {
    this.game.pause();
    this.phase = 'inactive';
  }
  snapshot(): unknown {
    if (this.phase === 'inactive' || this.phase === 'room') return null;
    return {
      id: this.id,
      classId: this.classId,
      startBiome: this.startBiome,
      eventId: this.eventId,
      mode: this.mode,
      contract: this.contract,
      difficulty: this.difficulty,
      depth: this.depth,
      phenomenon: this.phenomenon,
      score: this.score,
      bestChain: this.bestChain,
      seed: this.seed,
      biome: this.biome,
      visited: this.map.filter((node) => node.visited).map((node) => node.id),
      current: this.current?.id ?? null,
      phase: this.phase,
      rooms: this.rooms,
      kills: this.kills,
      elapsed: this.elapsed,
      won: this.won,
      message: this.message,
      shop: this.shop,
      build: this.build.snapshot(),
      powers: this.game.abilities.snapshot(),
      health: this.game.player.health,
    };
  }
  restore(value: unknown): boolean {
    try {
      const data = record(value);
      if (
        typeof data.id !== 'string' ||
        data.id.length > 100 ||
        typeof data.seed !== 'string' ||
        data.seed.length > 64 ||
        typeof data.classId !== 'string' ||
        !classById.has(data.classId)
      )
        return false;
      const phases = ['map', 'reward', 'shop', 'event', 'summary'];
      if (typeof data.phase !== 'string' || !phases.includes(data.phase)) return false;
      const biome = Math.floor(finite(data.biome, 0, 7));
      const startBiome = Math.floor(finite(data.startBiome ?? 0, 0, 7));
      const visited = strings(data.visited, 30);
      const mode = modes.some((mode) => mode.id === data.mode)
        ? (data.mode as RunMode)
        : 'standard';
      const depth = Math.floor(finite(data.depth ?? 0, 0, 100000));
      const map = this.createMap(data.seed, biome, mode, depth);
      if (visited.some((id) => !map.some((node) => node.id === id))) return false;
      const current =
        data.current === null ? undefined : map.find((node) => node.id === data.current);
      if (data.current !== null && !current) return false;
      const powers = record(data.powers);
      record(powers.levels);
      record(powers.cooldowns);
      finite(powers.energy, 0, 100000);
      finite(powers.stored, 0, 100);
      const rooms = finite(data.rooms, 0, 100000);
      const kills = finite(data.kills, 0, 10000000);
      const elapsed = finite(data.elapsed, 0, 100000000);
      const health = finite(data.health, 0, 100000);
      const build = new RunBuild(this.game, data.seed, data.classId);
      build.restore(data.build);
      const shop: { id: string; price: number; sold: boolean }[] = [];
      if (!Array.isArray(data.shop) || data.shop.length > 3) return false;
      for (const value of data.shop) {
        const item = record(value);
        if (typeof item.id !== 'string' || !relicById.has(item.id)) return false;
        shop.push({ id: item.id, price: finite(item.price, 0, 1000), sold: item.sold === true });
      }
      this.game.reset(false);
      this.id = data.id;
      this.seed = data.seed;
      this.classId = data.classId;
      this.biome = biome;
      this.startBiome = startBiome;
      this.mode = mode;
      this.depth = depth;
      this.contract = contracts.some((contract) => contract.id === data.contract)
        ? (data.contract as Contract)
        : 'none';
      this.difficulty = finite(data.difficulty ?? 0, 0, 6);
      this.phenomenon = phenomena.some((item) => item.id === data.phenomenon)
        ? (data.phenomenon as Phenomenon)
        : '';
      this.score = finite(data.score ?? 0, 0, 1000000000);
      this.bestChain = finite(data.bestChain ?? 0, 0, 1000);
      this.eventId =
        typeof data.eventId === 'string' && encounters.some((event) => event.id === data.eventId)
          ? data.eventId
          : 'fracture';
      this.map = map;
      this.current = current;
      this.phase = data.phase as ExpeditionPhase;
      this.rooms = rooms;
      this.kills = kills;
      this.elapsed = elapsed;
      this.won = data.won === true;
      this.message = typeof data.message === 'string' ? data.message.slice(0, 1000) : '';
      this.shop = shop;
      this.build = build;
      for (const node of this.map) node.visited = visited.includes(node.id);
      this.game.abilities.restore(powers as unknown as AbilitySnapshot);
      this.build.apply();
      this.game.abilities.restore(powers as unknown as AbilitySnapshot);
      this.game.player.health = Math.min(health, this.game.maxHealth);
      return true;
    } catch {
      return false;
    }
  }
  private grantRelic(rare = false): void {
    const pool = relics.filter(
      (relic) => !this.build.relics.includes(relic.id) && (!rare || relic.rarity !== 'common'),
    );
    if (!pool.length) {
      this.build.currency += 40;
      this.message = 'The cache held 40 matter shards.';
      return;
    }
    const relic = this.build.random.pick(pool);
    this.build.addRelic(relic.id);
    this.message = `Discovered ${relic.name}: ${relic.description}`;
  }
  private createMap(
    seed = this.seed,
    biome = this.biome,
    mode = this.mode,
    depth = this.depth,
  ): MapNode[] {
    if (mode === 'boss_rush' || mode === 'gauntlet')
      return Array.from({ length: mode === 'boss_rush' ? 5 : 7 }, (_, row) => ({
        id: `${biome}:${row}:1`,
        row,
        lane: 1,
        type: mode === 'boss_rush' || row === 6 ? 'boss' : 'elite',
        next: row === (mode === 'boss_rush' ? 4 : 6) ? [] : [`${biome}:${row + 1}:1`],
        visited: false,
      }));
    return generateMap(depth ? `${seed}:${depth}` : seed, biome);
  }
  private completeRoom(combat = true): void {
    if (!this.current || this.current.visited) return;
    this.current.visited = true;
    this.rooms++;
    const currency = Math.floor(
      (this.current.type === 'challenge' ? 35 : 15) *
        contracts.find((contract) => contract.id === this.contract)!.reward,
    );
    this.build.currency += currency;
    this.build.gainXP(this.current.type === 'boss' ? 100 : 30);
    if (combat) {
      this.message = `Chamber cleared. +${currency} matter shards.`;
      if (['elite', 'boss', 'puzzle', 'challenge'].includes(this.current.type))
        this.grantRelic(this.current.type === 'boss');
    }
    this.phase = 'reward';
  }
}
