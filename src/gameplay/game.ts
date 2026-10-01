import Matter from 'matter-js';
import arena from '../data/arena.json';
import balance from '../data/balance.json';
import { EventBus } from '../core/events';
import { length, normalize, scale, subtract, type Vec2 } from '../core/vector';
import { GravitySystem } from '../physics/gravity';
import { PhysicsWorld, type CollisionFact, type Entity, type EntityKind } from '../physics/world';
import { ChainTracker } from './chains';
import { AbilitySystem } from './abilities';
import { EnemySystem } from './enemies';

export type GameState = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export interface RunStats {
  kills: number;
  flips: number;
  wells: number;
  redirectedKills: number;
  score: number;
}
interface Cause {
  id: number | null;
  depth: number;
}

export class Game {
  readonly events = new EventBus();
  readonly chains = new ChainTracker();
  gravity!: GravitySystem;
  world!: PhysicsWorld;
  player!: Entity;
  abilities!: AbilitySystem;
  enemies!: EnemySystem;
  state: GameState = 'ready';
  time = 0;
  wellCooldown = 0;
  move: Vec2 = { x: 0, y: 0 };
  stats: RunStats = { kills: 0, flips: 0, wells: 0, redirectedKills: 0, score: 0 };
  private readonly explosions: { entity: Entity; cause: Cause }[] = [];
  private readonly wellChains = new Map<number, number>();

  constructor(populate = true) {
    this.reset(populate);
  }

  reset(populate = true): void {
    this.world?.dispose();
    this.gravity = new GravitySystem(balance.gravity.strength, balance.physics.maxAcceleration);
    this.world = new PhysicsWorld(this.gravity);
    this.chains.clear();
    this.explosions.length = 0;
    this.wellChains.clear();
    this.time = 0;
    this.wellCooldown = 0;
    this.state = 'ready';
    this.move = { x: 0, y: 0 };
    this.stats = { kills: 0, flips: 0, wells: 0, redirectedKills: 0, score: 0 };
    for (const wall of arena.walls) this.world.addWall(wall.x, wall.y, wall.width, wall.height);
    if (populate) {
      for (const spawn of arena.spawns) {
        const entity = this.world.spawn(spawn.kind as EntityKind, spawn)!;
        if (entity.kind === 'player') this.player = entity;
      }
    } else this.player = this.world.spawn('player', { x: 310, y: 470 })!;
    this.abilities = new AbilitySystem(this);
    this.enemies = new EnemySystem(this);
  }

  castAbility(id: string, position: Vec2): boolean {
    return this.state === 'playing' && this.abilities.cast(id, position);
  }
  createCause(): number {
    return this.chains.start(this.time);
  }
  markCause(entity: Entity, id: number, depth = 0): void {
    this.attribute(entity, { id, depth });
  }
  applyDamage(entity: Entity, amount: number, cause: number): void {
    this.damage(entity, amount, { id: cause, depth: 1 });
  }
  detonate(entity: Entity): void {
    if (!entity.alive) return;
    entity.health = 1;
    this.damage(entity, 1, { id: entity.chainId, depth: entity.chainDepth + 1 });
  }

  start(): void {
    if (this.state === 'ready') this.state = 'playing';
  }
  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.move = { x: 0, y: 0 };
    }
  }
  resume(): void {
    if (this.state === 'paused') this.state = 'playing';
  }
  get enemyCount(): number {
    let count = 0;
    for (const entity of this.world.entities.values())
      if (entity.definition.faction === 'enemy' && entity.kind !== 'projectile') count++;
    return count;
  }

  flip(direction: Vec2): boolean {
    const previous = this.gravity.direction;
    if (this.state !== 'playing' || !this.gravity.setDirection(direction)) return false;
    if (previous.x === this.gravity.direction.x && previous.y === this.gravity.direction.y)
      return false;
    const chain = this.chains.start(this.time);
    for (const entity of this.world.entities.values()) {
      if (entity.kind !== 'player') this.attribute(entity, { id: chain, depth: 0 });
      if (entity.kind === 'projectile') entity.redirected = true;
    }
    this.stats.flips++;
    this.events.emit('gravityChanged', { direction: this.gravity.direction });
    return true;
  }

  createWell(position: Vec2): boolean {
    if (
      this.state !== 'playing' ||
      this.wellCooldown > 0 ||
      !Number.isFinite(position.x + position.y)
    )
      return false;
    const bounded = {
      x: Math.max(65, Math.min(arena.width - 65, position.x)),
      y: Math.max(65, Math.min(arena.height - 65, position.y)),
    };
    const wells = [...this.gravity.fields.values()].filter(
      (field) => field.source === 'player-well',
    );
    if (wells.length >= balance.gravity.maxWells) this.gravity.removeField(wells[0].id);
    if (this.gravity.fields.size >= balance.physics.maxFields) return false;
    const chain = this.chains.start(this.time);
    const fieldId = this.gravity.addField({
      source: 'player-well',
      mode: 'radial',
      position: bounded,
      direction: { x: 0, y: 0 },
      strength: balance.gravity.wellStrength,
      radius: balance.gravity.wellRadius,
      falloff: 'linear',
      remaining: balance.gravity.wellDuration,
    });
    this.wellChains.set(fieldId, chain);
    for (const entity of this.world.entities.values()) {
      if (length(subtract(entity.body.position, bounded)) < balance.gravity.wellRadius) {
        this.attribute(entity, { id: chain, depth: 0 });
        if (entity.kind === 'projectile') entity.redirected = true;
      }
    }
    this.stats.wells++;
    this.wellCooldown = balance.gravity.wellCooldown;
    this.events.emit('wellCreated', { position: bounded });
    return true;
  }

  step(): void {
    if (this.state !== 'playing') return;
    const dt = balance.physics.stepMs / 1000;
    this.time += dt;
    this.abilities.tick(dt);
    this.wellCooldown = Math.max(0, this.wellCooldown - dt);
    this.gravity.tick(dt);
    for (const id of this.wellChains.keys())
      if (!this.gravity.fields.has(id)) this.wellChains.delete(id);
    this.chains.tick(this.time);
    const movement = length(this.move) > 1 ? normalize(this.move) : this.move;
    this.world.accelerate(
      this.player,
      scale(movement, this.abilities.modifiers.evaluate('movement', balance.player.acceleration)),
    );
    for (const entity of [...this.world.entities.values()]) {
      entity.life += dt;
      entity.invulnerability = Math.max(0, entity.invulnerability - dt);
      if (entity.chainExpires < this.time) {
        entity.chainId = null;
        entity.chainDepth = 0;
      }
      for (const field of this.gravity.fields.values()) {
        if (length(subtract(entity.body.position, field.position)) < field.radius) {
          if (entity.kind === 'projectile') entity.redirected = true;
          if (entity.chainId === null)
            this.attribute(entity, { id: this.wellChains.get(field.id) ?? null, depth: 0 });
        }
      }
      if (entity.kind === 'projectile') {
        if (entity.life > balance.enemies.projectileLife) {
          this.world.remove(entity);
          continue;
        }
      } else if (entity.definition.faction === 'enemy') this.updateEnemy(entity, dt);
    }
    this.world.step();
    for (const collision of this.world.collisions) this.resolveCollision(collision);
    this.resolveExplosions();
    if (this.player.health <= 0) this.end(false);
    else if (this.enemyCount === 0) this.end(true);
  }

  private updateEnemy(entity: Entity, dt: number): void {
    if (this.enemies.update(entity)) return;
    const delta = subtract(this.player.body.position, entity.body.position);
    const distance = length(delta);
    const toward = normalize(delta);
    if (entity.kind === 'shooter') {
      const movement =
        distance < balance.enemies.shooterRange * balance.enemies.shooterRetreatRatio
          ? -1
          : distance > balance.enemies.shooterRange
            ? 1
            : 0;
      this.world.accelerate(entity, scale(toward, movement * balance.enemies.shooterAcceleration));
      entity.shotTimer -= dt;
      if (entity.shotTimer <= 0) {
        const projectiles = [...this.world.entities.values()].filter(
          (candidate) => candidate.kind === 'projectile',
        ).length;
        if (projectiles < balance.enemies.maxProjectiles) {
          const projectile = this.world.spawn('projectile', {
            x: entity.body.position.x + toward.x * balance.enemies.projectileSpawnOffset,
            y: entity.body.position.y + toward.y * balance.enemies.projectileSpawnOffset,
          });
          if (projectile) {
            projectile.ownerId = entity.id;
            Matter.Body.setVelocity(
              projectile.body,
              scale(toward, balance.enemies.projectileSpeed),
            );
          }
        }
        entity.shotTimer = balance.enemies.shooterCooldown;
      }
    } else {
      const acceleration =
        entity.kind === 'heavy'
          ? balance.enemies.heavyAcceleration
          : balance.enemies.chaserAcceleration;
      this.world.accelerate(entity, scale(toward, acceleration));
    }
  }

  private resolveCollision({ a, b, speed, position }: CollisionFact): void {
    if ((a && !a.alive) || (b && !b.alive)) return;
    if (speed > balance.combat.impactFeedbackThreshold)
      this.events.emit('impact', { position, force: speed, color: (a ?? b)!.definition.color });
    const projectile = a?.kind === 'projectile' ? a : b?.kind === 'projectile' ? b : undefined;
    if (projectile) {
      const other = projectile === a ? b : a;
      if (other?.id === projectile.ownerId && projectile.life < balance.combat.projectileOwnerGrace)
        return;
      if (other?.kind === 'projectile') return;
      if (
        other &&
        (other.kind === 'player' || other.definition.faction === 'neutral' || projectile.redirected)
      ) {
        const before = this.stats.kills;
        this.damage(
          other,
          balance.combat.projectileDamage + speed * balance.combat.projectileSpeedCoefficient,
          {
            id: projectile.chainId,
            depth: projectile.chainDepth + 1,
          },
        );
        if (projectile.redirected && this.stats.kills > before) this.stats.redirectedKills++;
      }
      this.world.remove(projectile);
      return;
    }
    const player = a?.kind === 'player' ? a : b?.kind === 'player' ? b : undefined;
    const other = player === a ? b : a;
    if (player && other?.definition.faction === 'enemy')
      this.damage(player, balance.player.contactDamage, { id: null, depth: 0 });
    if (speed < balance.combat.impactThreshold) return;
    const origin =
      a?.chainId !== null && a?.chainId !== undefined
        ? a
        : b?.chainId !== null && b?.chainId !== undefined
          ? b
          : undefined;
    if (!origin) return; // Ordinary settling is safe; manipulation supplies combat momentum.
    const cause = { id: origin.chainId, depth: origin.chainDepth + 1 };
    for (const [target, attacker] of [
      [a, b],
      [b, a],
    ]) {
      if (
        !target ||
        target.kind === 'player' ||
        this.time - target.lastImpact < balance.combat.impactCooldown
      )
        continue;
      const mass = attacker && attacker.kind !== 'player' ? attacker.body.mass : target.body.mass;
      const damage = Math.min(
        balance.combat.maxDamage,
        mass * (speed - balance.combat.impactThreshold) * balance.combat.impactCoefficient,
      );
      target.lastImpact = this.time;
      this.damage(target, damage, cause);
      if (attacker && attacker.kind !== 'player') this.attribute(attacker, cause);
    }
  }

  private attribute(entity: Entity, cause: Cause): void {
    if (cause.id === null || cause.depth > balance.combat.maxChainDepth) return;
    entity.chainId = cause.id;
    entity.chainDepth = cause.depth;
    entity.chainExpires = this.time + balance.combat.chainTimeout;
  }

  private damage(entity: Entity, amount: number, cause: Cause): void {
    if (
      !entity.alive ||
      (!entity.definition.breakable && entity.kind !== 'player') ||
      entity.invulnerability > 0
    )
      return;
    const bounded = Math.min(balance.combat.maxDamage, Math.max(0, amount));
    entity.health -= bounded;
    this.attribute(entity, cause);
    if (entity.kind === 'player') entity.invulnerability = balance.player.invulnerability;
    this.events.emit('damaged', {
      position: { ...entity.body.position },
      amount: bounded,
      player: entity.kind === 'player',
    });
    if (entity.health > 0) return;
    entity.health = 0;
    if (entity.kind === 'player') return;
    this.world.remove(entity);
    this.enemies.onDeath(entity);
    if (entity.kind === 'barrel' || entity.kind === 'bomber' || entity.elite === 'unstable')
      this.explosions.push({ entity, cause });
    const chainLength = this.chains.extend(cause.id, `kill:${entity.id}`, cause.depth, this.time);
    if (entity.definition.faction === 'enemy') {
      this.stats.kills++;
      this.stats.score += 100 + chainLength * 25;
    }
    this.events.emit('killed', {
      position: { ...entity.body.position },
      kind: entity.kind,
      chainId: cause.id,
      chainLength,
    });
  }

  private resolveExplosions(): void {
    while (this.explosions.length) {
      const { entity, cause } = this.explosions.shift()!;
      if (cause.depth > balance.combat.maxChainDepth) continue;
      const position = entity.body.position;
      this.chains.extend(cause.id, `explosion:${entity.id}`, cause.depth, this.time);
      this.events.emit('explosion', {
        position: { ...position },
        radius: balance.combat.explosionRadius,
        chainId: cause.id,
      });
      for (const target of [...this.world.entities.values()]) {
        const offset = subtract(target.body.position, position);
        const distance = length(offset);
        if (distance > balance.combat.explosionRadius) continue;
        const falloff = 1 - distance / balance.combat.explosionRadius;
        const nextCause = { id: cause.id, depth: cause.depth + 1 };
        this.attribute(target, nextCause);
        const direction = distance > 0 ? normalize(offset) : { x: 0, y: -1 };
        this.world.impulse(
          target,
          scale(
            direction,
            (balance.combat.explosionImpulse * falloff) / Math.sqrt(target.body.mass),
          ),
        );
        this.damage(
          target,
          balance.combat.explosionDamage *
            falloff *
            (target.kind === 'player' ? balance.combat.playerExplosionMultiplier : 1),
          nextCause,
        );
      }
    }
  }

  private end(won: boolean): void {
    this.state = won ? 'won' : 'lost';
    this.move = { x: 0, y: 0 };
    this.events.emit('ended', { won });
  }
}
