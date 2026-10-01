import type { Expedition } from './expedition';
import type { Vec2 } from '../core/vector';
import type { PersistentStorage } from '../core/storage';
import { record, finite, strings } from '../core/save';
import { modes, type RunMode } from '../content/modes';
import { contracts, type Contract } from '../content/phenomena';
import { classById } from '../content/classes';
import { abilityById } from '../content/abilities';
import { relicById } from '../content/relics';
import { equipmentById, affixes } from '../content/equipment';
import { researchNodes, mutations } from '../content/research';
import { regions } from '../content/regions';

// Increment when content or simulation rules change incompatibly with recorded routes.
export const replayRevision = 'gravityborn-0.4-r2';
const key = 'gravityborn.archive';
const maxSamples = 24000;
const maxBytes = 2000000;
export interface RunRecipe {
  seed: string;
  classId: string;
  mode: RunMode;
  contract: Contract;
  difficulty: number;
  biome: number;
}
export type GhostSample = [time: number, x: number, y: number];
export interface GhostRoom {
  id: string;
  samples: GhostSample[];
}
export interface RunReport {
  id: string;
  revision: string;
  recipe: RunRecipe;
  loadout: string;
  outcome: 'victory' | 'defeat' | 'abandoned';
  assisted: boolean;
  imported: boolean;
  elapsed: number;
  score: number;
  chain: number;
  rooms: number;
  depth: number;
  powers: string[];
  powerLevels: number[];
  wellLevel: number;
  level: number;
  bonuses: string[];
  relics: string[];
  ghost: GhostRoom[];
}
const text = (value: unknown, max: number): string => {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid recording text');
  return value;
};
const integer = (value: unknown, max: number): number => {
  const result = finite(value, 0, max);
  if (!Number.isInteger(result)) throw new Error('Invalid recording integer');
  return result;
};
export function recipeFor(run: Expedition): RunRecipe {
  return {
    seed: run.seed,
    classId: run.classId,
    mode: run.mode,
    contract: run.contract,
    difficulty: run.difficulty,
    biome: run.startBiome,
  };
}
function roomId(run: Expedition): string {
  return `${run.depth}:${run.biome}:${run.current?.id}`;
}
export function readReport(value: unknown): RunReport {
  const data = record(value);
  const recipe = record(data.recipe);
  if (
    !modes.some((item) => item.id === recipe.mode) ||
    !contracts.some((item) => item.id === recipe.contract) ||
    !classById.has(String(recipe.classId)) ||
    !['victory', 'defeat', 'abandoned'].includes(String(data.outcome)) ||
    typeof data.assisted !== 'boolean' ||
    typeof data.imported !== 'boolean'
  )
    throw new Error('Unknown recording rules');
  const powers = strings(data.powers, 64);
  const relics = strings(data.relics, 200);
  const powerLevels = data.powerLevels ?? powers.map(() => 1);
  if (!Array.isArray(powerLevels) || powerLevels.length !== powers.length)
    throw new Error('Invalid power levels');
  if (powers.some((id) => !abilityById.has(id)) || relics.some((id) => !relicById.has(id)))
    throw new Error('Unknown recording build');
  if (!Array.isArray(data.ghost) || data.ghost.length > 256) throw new Error('Invalid ghost');
  let count = 0;
  const ids = new Set<string>();
  const ghost = data.ghost.map((value): GhostRoom => {
    const room = record(value);
    const id = text(room.id, 100);
    if (ids.has(id) || !Array.isArray(room.samples) || (count += room.samples.length) > maxSamples)
      throw new Error('Invalid ghost room');
    ids.add(id);
    let previous = -1;
    const samples = room.samples.map((sample): GhostSample => {
      if (!Array.isArray(sample) || sample.length !== 3) throw new Error('Invalid ghost sample');
      const time = finite(sample[0], 0, 86400);
      if (time <= previous) throw new Error('Unordered ghost');
      previous = time;
      return [time, finite(sample[1], -1000, 10000), finite(sample[2], -1000, 10000)];
    });
    return { id, samples };
  });
  if (ghost.length && (data.outcome !== 'victory' || data.assisted))
    throw new Error('Only unassisted victories can contain ghosts');
  return {
    id: text(data.id, 100),
    revision: text(data.revision, 100),
    recipe: {
      seed: text(recipe.seed, 64),
      classId: recipe.classId as string,
      mode: recipe.mode as RunMode,
      contract: recipe.contract as Contract,
      difficulty: integer(recipe.difficulty, 6),
      biome: integer(recipe.biome, regions.length - 1),
    },
    loadout: text(data.loadout, 16000),
    outcome: data.outcome as RunReport['outcome'],
    assisted: data.assisted,
    imported: data.imported,
    elapsed: finite(data.elapsed, 0, 86400 * 100),
    score: finite(data.score, 0, 1e12),
    chain: integer(data.chain, 1000000),
    rooms: integer(data.rooms, 1000000),
    depth: integer(data.depth, 1000000),
    powers,
    powerLevels: powerLevels.map((value) => integer(value, 10)),
    level: integer(data.level ?? 1, 10000),
    wellLevel: integer(data.wellLevel ?? 1, 4),
    bonuses: strings(data.bonuses ?? [], 120),
    relics,
    ghost,
  };
}

/** Separate, bounded local archive: importing never changes profile rewards or live physics. */
export class RunArchive {
  reports: RunReport[] = [];
  enabled = true;
  state: 'ready' | 'unavailable' | 'invalid' | 'future' = 'ready';
  private session:
    | { id: string; loadout: string; rooms: GhostRoom[]; count: number; full: boolean }
    | undefined;
  private playback: RunReport | undefined;
  constructor(
    private readonly storage: PersistentStorage,
    readonly run: Expedition,
  ) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        if (raw.length > maxBytes) throw new Error('Archive too large');
        const data = record(JSON.parse(raw));
        if (typeof data.version === 'number' && data.version > 1) this.state = 'future';
        else {
          if (data.version !== 1 || !Array.isArray(data.reports) || data.reports.length > 20)
            throw new Error('Invalid archive');
          this.reports = data.reports.map(readReport);
          // Only one route recording is retained; reports remain compact.
          if (this.reports.filter((item) => item.ghost.length).length > 1)
            throw new Error('Too many recordings');
          this.enabled = data.enabled !== false;
        }
      }
    } catch {
      this.state = 'invalid';
      this.reports = [];
    }
    run.game.events.on('runStarted', () => this.begin());
    run.game.events.on('runRestored', () => {
      this.session = undefined;
      this.playback = undefined;
    });
    run.game.events.on('runEnded', (event) => {
      const session = this.session?.id === event.id ? this.session : undefined;
      this.add({
        id: event.id,
        revision: replayRevision,
        recipe: recipeFor(run),
        loadout: session?.loadout ?? '',
        outcome: event.outcome,
        assisted: event.assisted,
        imported: false,
        elapsed: event.elapsed,
        score: event.score,
        chain: run.bestChain,
        rooms: run.rooms,
        depth: run.depth,
        powers: [...run.game.abilities.levels.keys()],
        powerLevels: [...run.game.abilities.levels.values()],
        level: run.build.level,
        wellLevel: run.build.wellLevel,
        bonuses: [
          ...run.build.equipment.map(
            (item) =>
              `${equipmentById.get(item.id)!.name} +${item.level}${item.affix ? ` · ${affixes.find((a) => a.id === item.affix)?.name ?? item.affix}` : ''}`,
          ),
          ...run.build.skills.map((id) => researchNodes.find((item) => item.id === id)?.name ?? id),
          ...(run.build.mutation
            ? [mutations.find((item) => item.id === run.build.mutation)?.name ?? run.build.mutation]
            : []),
          ...[...new Set(run.build.passives)].map(
            (id) => `${id} ×${run.build.passives.filter((item) => item === id).length}`,
          ),
        ],
        relics: [...run.build.relics],
        ghost: event.outcome === 'victory' && !event.assisted && session?.full ? session.rooms : [],
      });
      this.session = undefined;
      this.playback = undefined;
    });
  }
  private begin(): void {
    const loadout = JSON.stringify(this.run.build.snapshot());
    this.session = { id: this.run.id, loadout, rooms: [], count: 0, full: true };
    const recipe = JSON.stringify(recipeFor(this.run));
    this.playback = this.reports.find(
      (item) =>
        item.ghost.length &&
        item.revision === replayRevision &&
        item.loadout === loadout &&
        JSON.stringify(item.recipe) === recipe,
    );
  }
  sample(): void {
    const session = this.session;
    if (!session || session.id !== this.run.id || !session.full || this.run.phase !== 'room')
      return;
    const id = roomId(this.run);
    let room = session.rooms.at(-1);
    if (room?.id !== id) {
      if (session.rooms.length >= 256) {
        session.full = false;
        return;
      }
      room = { id, samples: [] };
      session.rooms.push(room);
    }
    const time = Math.round(this.run.game.time * 1000) / 1000;
    if (time - (room.samples.at(-1)?.[0] ?? -1) < 0.25) return;
    if (session.count >= maxSamples) {
      session.full = false;
      session.rooms = [];
      return;
    }
    const p = this.run.game.player.body.position;
    room.samples.push([time, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
    session.count++;
  }
  position(): Vec2 | null {
    if (!this.enabled || this.run.phase !== 'room' || this.session?.id !== this.run.id) return null;
    const samples = this.playback?.ghost.find((room) => room.id === roomId(this.run))?.samples;
    if (!samples?.length) return null;
    const time = this.run.game.time;
    if (time < samples[0][0] || time > samples.at(-1)![0]) return null;
    let low = 0,
      high = samples.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >>> 1;
      if (samples[mid][0] <= time) low = mid;
      else high = mid;
    }
    const a = samples[low],
      b = samples[high];
    const fraction = b[0] === a[0] ? 0 : (time - a[0]) / (b[0] - a[0]);
    return { x: a[1] + (b[1] - a[1]) * fraction, y: a[2] + (b[2] - a[2]) * fraction };
  }
  private add(report: RunReport): void {
    if (this.state === 'future') return;
    const others = this.reports.filter((item) => item.id !== report.id);
    this.reports = [
      report,
      ...others.map((item) => (report.ghost.length ? { ...item, ghost: [] } : item)),
    ].slice(0, 20);
    this.save();
  }
  save(): void {
    if (this.state === 'future') return;
    try {
      const data = JSON.stringify({ version: 1, enabled: this.enabled, reports: this.reports });
      if (data.length > maxBytes) throw new Error('Archive too large');
      this.storage.setItem(key, data);
      this.state = 'ready';
    } catch {
      this.state = 'unavailable';
    }
  }
  clear(): void {
    this.reports = [];
    this.playback = undefined;
    this.save();
  }
  export(id: string): string | undefined {
    const report = this.reports.find((item) => item.id === id);
    return report && JSON.stringify({ format: 'gravityborn-run', version: 1, report });
  }
  import(raw: string): boolean {
    if (this.state === 'future' || raw.length > maxBytes) return false;
    try {
      const data = record(JSON.parse(raw));
      if (data.format !== 'gravityborn-run' || data.version !== 1) return false;
      const report = readReport(data.report);
      report.imported = true;
      // An import cannot replace a local result with the same claimed identity.
      report.id = `import:${crypto.randomUUID()}`;
      this.add(report);
      return true;
    } catch {
      return false;
    }
  }
}
