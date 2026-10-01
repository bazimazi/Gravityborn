import Matter from 'matter-js';
import type { Game } from './game';
import type { Expedition } from '../progression/expedition';
import { RunBuild } from '../progression/build';
import { abilityById } from '../content/abilities';
import { relicById } from '../content/relics';

export type PlayerStat = 'health' | 'maxHealth' | 'energy' | 'mass' | 'movement';
export class DebugSession {
  private laboratory?: RunBuild;
  private world: Game['world'] | undefined;
  constructor(
    readonly game: Game,
    readonly run: Expedition,
  ) {}
  mark(): void {
    if (this.run.active) this.run.metrics.assisted = 1;
  }
  setPlayer(stat: PlayerStat, value: number): boolean {
    if (!Number.isFinite(value)) return false;
    this.mark();
    if (stat === 'health')
      this.game.player.health = Math.max(1, Math.min(this.game.maxHealth, value));
    else if (stat === 'energy')
      this.game.abilities.energy = Math.max(0, Math.min(this.game.abilities.maxEnergy, value));
    else {
      this.game.abilities.modifiers.add({
        id: `debug:${stat}`,
        stat,
        operation: 'override',
        value,
        priority: 100,
      });
      if (stat === 'mass')
        Matter.Body.setMass(
          this.game.player.body,
          this.game.abilities.modifiers.evaluate('mass', this.game.player.definition.mass),
        );
      if (stat === 'maxHealth')
        this.game.player.health = Math.min(this.game.player.health, this.game.maxHealth);
    }
    return true;
  }
  giveAbility(id: string): boolean {
    if (!abilityById.has(id)) return false;
    this.mark();
    return this.game.abilities.learn(id) !== null;
  }
  giveRelic(id: string): boolean {
    if (!relicById.has(id)) return false;
    this.mark();
    if (this.run.active) return this.run.build.addRelic(id);
    if (this.world !== this.game.world) {
      this.world = this.game.world;
      this.laboratory = new RunBuild(this.game, 'inspector');
    }
    return this.laboratory!.addRelic(id);
  }
  giveCurrency(amount: number): boolean {
    if (!this.run.active || !Number.isFinite(amount) || amount <= 0) return false;
    this.mark();
    this.run.build.currency = Math.min(1000000, this.run.build.currency + Math.floor(amount));
    return true;
  }
  killEnemies(): void {
    this.mark();
    const cause = this.game.createCause('debug');
    for (const entity of [...this.game.world.entities.values()]) {
      if (entity.definition.faction !== 'enemy' || entity.kind === 'projectile') continue;
      entity.invulnerability = 0;
      entity.health = 1;
      this.game.applyDamage(entity, 1, cause);
    }
  }
}
