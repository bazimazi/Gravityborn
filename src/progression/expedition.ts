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

export type ExpeditionPhase = 'inactive' | 'map' | 'room' | 'reward' | 'shop' | 'event' | 'summary';
export class Expedition {
  id = '';
  classId = 'manipulator';
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
  start(seed: string, classId = 'manipulator'): void {
    this.id = crypto.randomUUID();
    this.classId = classById.has(classId) ? classId : 'manipulator';
    this.seed = seed.trim().slice(0, 64) || 'gravityborn';
    this.biome = 0;
    this.rooms = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.won = false;
    this.game.reset(false);
    this.game.abilities.levels.clear();
    for (const id of classById.get(this.classId)!.powers) this.game.abilities.learn(id);
    this.build = new RunBuild(this.game, this.seed, this.classId);
    this.build.apply();
    this.game.player.health = this.game.maxHealth;
    this.map = generateMap(this.seed, 0);
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
    this.game.reset(true, buildRoom(this.seed, node.id, node.type, this.biome, this.rooms));
    this.game.abilities.restore(powers);
    this.build.apply();
    this.game.abilities.restore(powers);
    this.game.player.health = Math.min(this.game.maxHealth, health);
    this.game.abilities.cooldowns.clear();
    this.game.abilities.energy = this.game.abilities.maxEnergy;
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
      this.message = 'A damaged research core offers an unstable exchange.';
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
  resolveEvent(choice: 'risk' | 'repair' | 'leave'): boolean {
    if (this.phase !== 'event') return false;
    if (choice === 'risk') {
      if (this.game.player.health <= 25) return false;
      this.game.player.health -= 25;
      this.grantRelic(true);
    } else if (choice === 'repair') {
      this.game.player.health = Math.min(this.game.maxHealth, this.game.player.health + 18);
      this.message = 'You salvaged the core for 18 integrity.';
    } else this.message = 'You left the unstable core intact.';
    this.completeRoom(false);
    return true;
  }
  leaveShop(): void {
    if (this.phase === 'shop') this.completeRoom(false);
  }
  advance(): boolean {
    if (this.phase !== 'reward' || this.build.pending > 0) return false;
    if (this.current?.type === 'boss') {
      if (this.biome === 2) {
        this.won = true;
        this.phase = 'summary';
        this.message = 'Three regions liberated. The expedition returns with new knowledge.';
        return true;
      }
      this.biome++;
      this.map = generateMap(this.seed, this.biome);
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
      const visited = strings(data.visited, 30);
      const map = generateMap(data.seed, biome);
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
  private completeRoom(combat = true): void {
    if (!this.current || this.current.visited) return;
    this.current.visited = true;
    this.rooms++;
    this.build.currency += this.current.type === 'challenge' ? 35 : 15;
    this.build.gainXP(this.current.type === 'boss' ? 100 : 30);
    if (combat) {
      this.message = `Chamber cleared. +${this.current.type === 'challenge' ? 35 : 15} matter shards.`;
      if (['elite', 'boss', 'puzzle', 'challenge'].includes(this.current.type))
        this.grantRelic(this.current.type === 'boss');
    }
    this.phase = 'reward';
  }
}
