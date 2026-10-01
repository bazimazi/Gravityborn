import { Game } from '../gameplay/game';
import { RunBuild } from './build';
import { generateMap, type MapNode } from './map';
import { buildRoom, biomes } from '../content/rooms';
import { entityDefinitions } from '../content/enemies';
import { relics } from '../content/relics';
import type { EntityKind } from '../physics/world';
import { classById } from '../content/classes';
import { record, finite, strings } from '../core/save';
import type { AbilitySnapshot } from '../gameplay/abilities';
import type { Profile } from './profile';
import { encounters, type EventChoice } from '../content/events';
import { Random } from '../core/random';
import { modes, rotatingChallenge, type RunMode } from '../content/modes';
import { contracts, phenomena, type Contract, type Phenomenon } from '../content/phenomena';
import { bossDefinitions, type BossKind } from '../content/bosses';
import { freshMastery, readMastery, type MasteryProgress } from './mastery';
import { story, secretLore, planets } from '../content/story';
import { abilityById } from '../content/abilities';
import { shopInventory, shopDescription, purchase, type ShopItem } from './shop';
import { eliteCompatibility, type VariantKind } from '../content/variants';
import type { EliteModifier } from '../content/enemies';
import { endlessTuning } from '../content/endless';
export interface RunOptions {
  mode?: RunMode;
  contract?: Contract;
  difficulty?: number;
  date?: Date;
}

export type ExpeditionPhase = 'inactive' | 'map' | 'room' | 'reward' | 'shop' | 'event' | 'summary';
export class Expedition {
  discoveries = new Set<string>();
  mastery: Record<string, MasteryProgress> = {};
  metrics: Record<string, number> = {};
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
  shop: ShopItem[] = [];
  private eventReward?: EventChoice;
  constructor(readonly game: Game) {
    game.events.on('entitySpawned', (event) => {
      if (this.phase === 'room') this.discoverEntity(event.kind as EntityKind);
    });
    game.events.on('collected', (event) => {
      if (this.phase !== 'room') return;
      if (event.kind === 'xp') this.build.gainXP(event.amount);
      else this.build.currency += event.amount;
    });
    game.events.on('abilityUsed', (event) => {
      if (this.phase === 'room' && !event.tags.includes('Echo')) {
        (this.mastery[event.id] ??= freshMastery()).casts++;
        game.events.emit('diagnostic', { event: 'AbilityUsage', subject: event.id });
        this.discoveries.add(`ability:${event.id}`);
      }
    });
    game.events.on('wellCreated', () => {
      if (this.phase === 'room') {
        (this.mastery.well ??= freshMastery()).casts++;
        game.events.emit('diagnostic', { event: 'AbilityUsage', subject: 'well' });
      }
    });
    game.events.on('gravityChanged', (event) => {
      if (this.phase === 'room' && event.source !== 'enemy') {
        (this.mastery.flip ??= freshMastery()).casts++;
        game.events.emit('diagnostic', { event: 'GravityChanges' });
      }
    });
    game.events.on('killed', (event) => {
      if (
        this.phase === 'room' &&
        event.kind === 'rift_seal' &&
        !this.discoveries.has(this.secretKey)
      ) {
        this.discoveries.add(this.secretKey);
        this.metrics.secretsRevealed = (this.metrics.secretsRevealed ?? 0) + 1;
      }
      if (this.phase !== 'room' || entityDefinitions[event.kind as EntityKind]?.faction !== 'enemy')
        return;
      this.kills++;
      game.events.emit('diagnostic', { event: 'EnemyKills', subject: event.kind });
      game.events.emit('diagnostic', { event: 'ChainLength', value: event.chainLength });
      if (event.damageTags.includes('Impact'))
        game.events.emit('diagnostic', { event: 'CollisionKills', subject: event.kind });
      if (event.boss) game.events.emit('diagnostic', { event: 'BossKills', subject: event.kind });
      for (const tag of event.damageTags) {
        const metric = `${tag.toLowerCase()}Kills`;
        this.metrics[metric] = (this.metrics[metric] ?? 0) + 1;
      }
      this.discoveries.add(`${event.boss ? 'boss' : 'enemy'}:${event.kind}`);
      if (event.boss) this.discoveries.add(`defeated:${event.kind}`);
      if (event.source === 'well' || event.source === 'flip' || abilityById.has(event.source)) {
        const progress = (this.mastery[event.source] ??= freshMastery());
        progress.kills++;
        progress.elites += Number(event.elite);
        progress.bosses += Number(event.boss);
        progress.chain = Math.max(progress.chain, event.chainLength);
      }
      this.metrics.bosses = (this.metrics.bosses ?? 0) + Number(event.boss);
      this.metrics.elites = (this.metrics.elites ?? 0) + Number(event.elite);
      if (event.boss && event.source === 'well')
        this.metrics.wellBosses = (this.metrics.wellBosses ?? 0) + 1;
    });
    game.events.on('ended', (event) => {
      if (this.phase !== 'room') return;
      this.elapsed += game.time;
      this.score += game.stats.score;
      this.bestChain = Math.max(this.bestChain, game.chains.best);
      game.events.emit('diagnostic', { event: 'LongestChain', value: this.bestChain });
      this.metrics.redirected = (this.metrics.redirected ?? 0) + game.stats.redirectedKills;
      this.metrics.zeroSeconds = (this.metrics.zeroSeconds ?? 0) + game.stats.zeroSeconds;
      if (!event.won) {
        this.eventReward = undefined;
        this.phase = 'summary';
        this.message = 'The core fell silent. Your discoveries remain.';
        this.won = false;
        game.events.emit('diagnostic', { event: 'CauseOfDeath', subject: game.lastDamage });
        this.recordEnd('defeat');
        return;
      }
      this.completeRoom();
      if (this.eventReward) {
        const reward = this.eventReward;
        this.eventReward = undefined;
        this.grantEventReward(reward);
      }
    });
  }
  get active(): boolean {
    return this.phase !== 'inactive';
  }
  get available(): MapNode[] {
    return this.map.filter(
      (node) =>
        !node.visited &&
        this.isRevealed(node) &&
        (this.current ? this.current.next.includes(node.id) : node.row === 0),
    );
  }
  private get secretKey(): string {
    return `secret:${this.biome}:${this.depth}`;
  }
  isRevealed(node: MapNode): boolean {
    return node.type !== 'secret' || node.visited || this.discoveries.has(this.secretKey);
  }
  start(
    seed: string,
    classId = 'manipulator',
    profile?: Profile,
    biome = 0,
    options: RunOptions = {},
  ): void {
    if (this.active && this.phase !== 'summary') this.abandon();
    this.eventReward = undefined;
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
    this.discoveries = new Set();
    this.mastery = {};
    this.metrics = {};
    this.classId = classById.has(classId) ? classId : 'manipulator';
    this.seed = seed.trim().slice(0, 64) || 'gravityborn';
    this.startBiome =
      profile?.skills.includes('navigation') &&
      (profile.skills.includes('survey') || profile.discoveries.includes(`biome:${biome}`))
        ? Math.max(0, Math.min(biomes.length - 1, Math.floor(biome)))
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
    this.game.events.emit('runStarted', {
      id: this.id,
      mode: this.mode,
      classId: this.classId,
      difficulty: this.difficulty,
    });
    this.game.events.emit('diagnostic', { event: 'RunStarted', subject: this.mode });
    this.game.events.emit('diagnostic', { event: 'DifficultySelected', value: this.difficulty });
  }
  enter(id: string): boolean {
    if (this.phase !== 'map' || this.build.pending > 0) return false;
    const node = this.available.find((node) => node.id === id);
    if (!node) return false;
    this.eventReward = undefined;
    return this.loadNode(node);
  }
  private loadNode(node: MapNode, roomType = node.type): boolean {
    const health = this.game.player.health;
    const powers = this.game.abilities.snapshot();
    this.current = node;
    this.discoveries.add(`biome:${this.biome}`);
    this.discoveries.add(`planet:${this.biome}`);
    this.discoveries.add(`lore:${this.biome}`);
    const room = buildRoom(
      `${this.seed}:${this.depth}`,
      node.id,
      roomType,
      this.biome,
      this.rooms + this.difficulty,
    );
    if (this.mode === 'boss_rush')
      room.spawns = room.spawns.map((spawn) =>
        spawn.kind in bossDefinitions
          ? {
              ...spawn,
              kind: (Object.keys(bossDefinitions) as BossKind[])[
                node.row % Object.keys(bossDefinitions).length
              ],
            }
          : spawn,
      );
    if (this.difficulty >= 2) {
      const enemy = room.spawns.find(
        (spawn) => spawn.kind !== 'player' && entityDefinitions[spawn.kind].faction === 'enemy',
      );
      if (enemy) {
        const preferred = ['inverted', 'orbital', 'vampire', 'heavy', 'singularity'][
          Math.min(4, this.difficulty - 2)
        ] as EliteModifier;
        const allowed = eliteCompatibility[enemy.kind as VariantKind];
        enemy.elite =
          !allowed || allowed.includes(preferred)
            ? preferred
            : allowed[(this.difficulty - 2) % allowed.length];
      }
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
    const endlessStage = this.mode === 'endless' ? this.rooms + 1 : 0;
    if (endlessStage >= endlessTuning.movingWallsAt)
      room.walls.slice(4).forEach((wall, index) => {
        wall.motion = index % 2 ? 'horizontal' : 'vertical';
      });
    this.game.reset(true, room);
    for (const spawn of room.spawns) this.discoverEntity(spawn.kind);
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
        ? random.next() < 0.5
          ? random.pick(planets[this.biome].anomalies)
          : random.pick(phenomena).id
        : '');
    this.game.rules.configure(
      `${this.seed}:${node.id}`,
      phenomenon,
      this.contract,
      Math.min(
        this.mode === 'endless' ? endlessTuning.maxDifficulty : 12,
        this.difficulty + this.depth,
      ),
      endlessStage,
    );
    for (const id of this.game.rules.activePhenomena) this.discoveries.add(`phenomenon:${id}`);
    if (['combat', 'elite', 'challenge', 'boss', 'puzzle', 'secret'].includes(roomType)) {
      this.phase = 'room';
      this.message =
        node.type === 'puzzle'
          ? 'Move a heavy object onto the mass switch, then reach the exit.'
          : node.type === 'secret'
            ? 'Defeat the vault keepers to recover a rare relic and a hidden memory.'
            : 'Clear the chamber with gravity.';
      this.game.start();
      if (node.type === 'boss')
        this.game.events.emit('diagnostic', {
          event: 'BossAttempts',
          subject:
            this.mode === 'boss_rush'
              ? room.spawns.find((spawn) => spawn.kind in bossDefinitions)!.kind
              : String(this.biome),
        });
    } else if (node.type === 'shop') {
      this.phase = 'shop';
      this.shop = shopInventory(this.build);
      this.message = 'The salvage trader accepts matter shards.';
    } else if (node.type === 'event') {
      this.phase = 'event';
      const encounter = new Random(`${this.seed}:${node.id}:event`).pick(encounters);
      this.eventId = encounter.id;
      this.discoveries.add(`event:${encounter.id}`);
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
    if (this.phase !== 'shop' || !item || !purchase(this.build, item)) return false;
    if (relics.some((relic) => relic.id === id))
      this.game.events.emit('diagnostic', { event: 'RelicChoices', subject: id });
    if (id.startsWith('ability:'))
      this.game.events.emit('diagnostic', { event: 'AbilityChoices', subject: id.slice(8) });
    this.discoveries.add(id.includes(':') ? id : `relic:${id}`);
    this.message = `Acquired ${shopDescription(id)!.name}.`;
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
    if (effect.combat) {
      this.eventReward = effect;
      return this.loadNode(this.current!, effect.combat);
    }
    this.grantEventReward(effect);
    this.completeRoom(false);
    return true;
  }
  private grantEventReward(effect: EventChoice): void {
    this.game.player.health = Math.min(
      this.game.maxHealth,
      this.game.player.health + (effect.heal ?? 0),
    );
    this.build.currency += effect.currency ?? 0;
    this.build.gainXP(effect.xp ?? 0);
    if (effect.power) this.game.abilities.learn(effect.power);
    if (effect.mutation) {
      this.build.mutation = effect.mutation;
      this.discoveries.add(`mutation:${effect.mutation}`);
    }
    if (effect.phenomenon) {
      this.phenomenon = effect.phenomenon;
      this.discoveries.add(`phenomenon:${effect.phenomenon}`);
    }
    this.build.apply();
    this.message = effect.description;
    if (effect.relic) this.grantRelic(effect.relic === 'rare');
  }
  canResolveEvent(id: string): boolean {
    const choice = encounters
      .find((event) => event.id === this.eventId)
      ?.choices.find((choice) => choice.id === id);
    return Boolean(
      choice &&
        this.phase === 'event' &&
        this.current &&
        !this.current.visited &&
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
      if (
        this.mode !== 'endless' &&
        this.biome >= Math.min(biomes.length - 1, this.startBiome + limit - 1)
      ) {
        this.won = true;
        for (const progress of Object.values(this.mastery))
          if (progress.kills >= Math.max(1, this.kills * 0.5)) progress.wins++;
        if (
          Object.entries(this.mastery)
            .filter(([id]) => abilityById.get(id)?.tags.includes('Orbit'))
            .reduce((sum, [, progress]) => sum + progress.kills, 0) >=
          Math.max(1, this.kills * 0.75)
        )
          this.metrics.orbitalWins = 1;
        this.phase = 'summary';
        this.message = 'The route is liberated. The expedition returns with new knowledge.';
        this.recordEnd('victory');
        return true;
      }
      this.biome = (this.biome + 1) % biomes.length;
      this.depth++;
      this.map = this.createMap();
      this.current = undefined;
    }
    this.phase = 'map';
    return true;
  }
  abandon(): void {
    if (this.active && this.phase !== 'summary') {
      this.game.events.emit('runEnded', {
        id: this.id,
        outcome: 'abandoned',
        elapsed: this.elapsed + (this.phase === 'room' ? this.game.time : 0),
        score: this.score + (this.phase === 'room' ? this.game.stats.score : 0),
        assisted: Boolean(this.metrics.assisted),
      });
      this.game.events.emit('diagnostic', { event: 'RunAbandoned', subject: this.mode });
      this.game.events.emit('diagnostic', {
        event: 'RunDuration',
        subject: 'abandoned',
        value: this.elapsed + (this.phase === 'room' ? this.game.time : 0),
      });
    }
    this.game.pause();
    this.phase = 'inactive';
  }
  private recordEnd(outcome: 'victory' | 'defeat'): void {
    this.game.events.emit('runEnded', {
      id: this.id,
      outcome,
      elapsed: this.elapsed,
      score: this.score,
      assisted: Boolean(this.metrics.assisted),
    });
    this.game.events.emit('diagnostic', {
      event: 'RunEnded',
      subject: this.metrics.assisted ? `assisted:${outcome}` : outcome,
    });
    this.game.events.emit('diagnostic', {
      event: 'RunDuration',
      subject: outcome,
      value: this.elapsed,
    });
  }
  snapshot(): unknown {
    if (this.phase === 'inactive' || this.phase === 'room') return null;
    return structuredClone({
      id: this.id,
      discoveries: [...this.discoveries],
      mastery: this.mastery,
      metrics: this.metrics,
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
    });
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
      const biome = Math.floor(finite(data.biome, 0, biomes.length - 1));
      const startBiome = Math.floor(finite(data.startBiome ?? 0, 0, biomes.length - 1));
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
      const discoveries = strings(data.discoveries ?? [], 2000);
      const mastery = readMastery(data.mastery ?? {});
      const metrics: Record<string, number> = {};
      for (const [id, value] of Object.entries(record(data.metrics ?? {})))
        if (id.length < 50) metrics[id] = finite(value, 0, 100000000);
      const difficulty = finite(data.difficulty ?? 0, 0, 6);
      const score = finite(data.score ?? 0, 0, 1000000000);
      const bestChain = finite(data.bestChain ?? 0, 0, 1000);
      const build = new RunBuild(this.game, data.seed, data.classId);
      build.restore(data.build);
      const shop: ShopItem[] = [];
      if (!Array.isArray(data.shop) || data.shop.length > 8) return false;
      for (const value of data.shop) {
        const item = record(value);
        if (
          typeof item.id !== 'string' ||
          !shopDescription(item.id) ||
          shop.some((entry) => entry.id === item.id)
        )
          return false;
        shop.push({ id: item.id, price: finite(item.price, 0, 1000), sold: item.sold === true });
      }
      this.game.reset(false);
      this.eventReward = undefined;
      this.discoveries = new Set(discoveries);
      this.mastery = mastery;
      this.metrics = metrics;
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
      this.difficulty = difficulty;
      this.phenomenon = phenomena.some((item) => item.id === data.phenomenon)
        ? (data.phenomenon as Phenomenon)
        : '';
      this.score = score;
      this.bestChain = bestChain;
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
      this.game.events.emit('runRestored', { id: this.id });
      return true;
    } catch {
      return false;
    }
  }
  private discoverEntity(kind: EntityKind): void {
    if (kind === 'player' || kind === 'projectile') return;
    const category =
      kind in bossDefinitions
        ? 'boss'
        : entityDefinitions[kind].faction === 'enemy'
          ? 'enemy'
          : 'object';
    this.discoveries.add(`${category}:${kind}`);
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
      return Array.from(
        { length: mode === 'boss_rush' ? Object.keys(bossDefinitions).length : 7 },
        (_, row) => ({
          id: `${biome}:${row}:1`,
          row,
          lane: 1,
          type: mode === 'boss_rush' || row === 6 ? 'boss' : 'elite',
          next:
            row === (mode === 'boss_rush' ? Object.keys(bossDefinitions).length - 1 : 6)
              ? []
              : [`${biome}:${row + 1}:1`],
          visited: false,
        }),
      );
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
      if (['elite', 'boss', 'puzzle', 'challenge', 'secret'].includes(this.current.type))
        this.grantRelic(['boss', 'secret'].includes(this.current.type));
      if (this.current.type === 'secret') {
        this.discoveries.add(`lore:secret:${this.biome}`);
        this.metrics.vaultsCleared = (this.metrics.vaultsCleared ?? 0) + 1;
        this.message += ` ${secretLore[this.biome].text}`;
      }
      if (this.current.type === 'boss') this.message += ` ${story[this.biome].memory}`;
    }
    this.phase = 'reward';
  }
}
