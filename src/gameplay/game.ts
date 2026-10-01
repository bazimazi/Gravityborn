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
import { EnvironmentSystem } from './environment';
import type { RoomDefinition } from '../content/rooms';
import type { Trigger } from '../progression/modifiers';
import { Random } from '../core/random';
import { BossSystem } from './bosses';
import { RuleSystem } from './rules';
import { bossDefinitions } from '../content/bosses';
import { ObjectSystem } from './objects';
import { MaterialSystem } from './materials';
import { abilityById } from '../content/abilities';

const laboratory: RoomDefinition = {
  ...arena,
  id: 'laboratory',
  type: 'combat',
  biome: 0,
  hazards: [],
  fields: [],
  spawns: arena.spawns as RoomDefinition['spawns'],
};

export type GameState = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export interface RunStats {
  kills: number;
  flips: number;
  wells: number;
  redirectedKills: number;
  score: number;
  zeroSeconds: number;
}
interface Cause {
  id: number | null;
  depth: number;
}

export class Game {
  readonly events = new EventBus();
  readonly chains = new ChainTracker(this.events);
  gravity!: GravitySystem;
  world!: PhysicsWorld;
  player!: Entity;
  abilities!: AbilitySystem;
  enemies!: EnemySystem;
  environment!: EnvironmentSystem;
  bosses!: BossSystem;
  rules!: RuleSystem;
  objects!: ObjectSystem;
  materials!: MaterialSystem;
  room: RoomDefinition = laboratory;
  state: GameState = 'ready';
  time = 0;
  lastDamage = 'Unknown';
  wellCooldown = 0;
  waveIndex = 0;
  nextWaveAt: number | undefined;
  get waveSpawns(): RoomDefinition['spawns'] {
    return this.room.waves?.[this.waveIndex] ?? [];
  }
  move: Vec2 = { x: 0, y: 0 };
  stats: RunStats = { kills: 0, flips: 0, wells: 0, redirectedKills: 0, score: 0, zeroSeconds: 0 };
  private readonly explosions: { entity: Entity; cause: Cause }[] = [];
  private readonly wellChains = new Map<number, number>();
  private readonly launched = new Map<number, number>();
  private nextWellCompression = 0;
  private readonly echoes: { id: string; position: Vec2; time: number }[] = [];
  private random = new Random('laboratory');

  constructor(populate = true) {
    this.reset(populate);
    this.events.on('abilityUsed', (event) => {
      if (!event.tags.includes('Echo')) this.trigger('OnAbilityCast', event.tags, event);
    });
    this.events.on('gravityChanged', (event) => {
      if (event.source !== 'enemy') this.trigger('OnGravityChange');
    });
    this.events.on('damaged', (event) => {
      if (event.player) this.trigger('OnDamage');
    });
    this.events.on('chainExtended', (event) => {
      if (
        this.state !== 'playing' ||
        (!['well', 'flip', 'relic'].includes(event.source) && !abilityById.has(event.source))
      )
        return;
      const tier = balance.combat.chainRush.find((tier) => tier.length === event.length);
      if (!tier) return;
      const id = 'temporary:chain-rush';
      const active = this.abilities.modifiers.values.get(id);
      this.abilities.modifiers.addTemporary(
        {
          id,
          stat: 'energyRegen',
          operation: 'add',
          value: Math.max(tier.regeneration, active?.value ?? 0),
        },
        this.time + Math.max(tier.duration, this.abilities.modifiers.remaining(id, this.time)),
      );
    });
  }

  get maxHealth(): number {
    return this.abilities.modifiers.evaluate('maxHealth', this.player.definition.health);
  }

  private trigger(
    trigger: Trigger,
    tags: string[] = [],
    ability?: { id: string; position: Vec2 },
  ): void {
    for (const rule of this.abilities.modifiers.fire(trigger, this.time, tags)) {
      if (rule.effect === 'heal')
        this.player.health = Math.min(this.maxHealth, this.player.health + rule.value);
      if (rule.effect === 'energy')
        this.abilities.energy = Math.min(
          this.abilities.maxEnergy,
          this.abilities.energy + rule.value,
        );
      if (rule.effect === 'store')
        this.abilities.stored = Math.min(100, this.abilities.stored + rule.value);
      if (rule.effect === 'shield')
        this.player.invulnerability = Math.max(this.player.invulnerability, rule.value);
      if (rule.effect === 'revive') {
        this.player.health = rule.value;
        this.player.invulnerability = 2;
      }
      if (rule.effect === 'echo' && ability && this.echoes.length < 8)
        this.echoes.push({
          id: ability.id,
          position: { ...ability.position },
          time: this.time + 0.12,
        });
      if (
        ['orbit', 'personal', 'afterimage', 'horizon'].includes(rule.effect) &&
        this.gravity.fields.size < 48 &&
        (rule.effect !== 'horizon' || this.player.health < this.maxHealth * 0.35)
      ) {
        const cause = this.createCause('relic');
        this.gravity.addField({
          source: 'relic',
          mode:
            rule.effect === 'orbit'
              ? 'vortex'
              : rule.effect === 'afterimage'
                ? 'directional'
                : 'radial',
          position: { ...this.player.body.position },
          direction: { ...this.gravity.direction },
          strength: rule.value,
          radius: 170,
          falloff: 'linear',
          remaining: rule.effect === 'afterimage' ? 3 : 1.1,
        });
        for (const entity of this.world.entities.values())
          if (
            entity.kind !== 'player' &&
            length(subtract(entity.body.position, this.player.body.position)) < 170
          ) {
            this.markCause(entity, cause);
            if (entity.kind === 'projectile') entity.redirected = true;
          }
      }
    }
  }

  reset(populate = true, room: RoomDefinition = laboratory): void {
    this.room = room;
    this.random = new Random(room.id);
    this.echoes.length = 0;
    this.world?.dispose();
    this.gravity = new GravitySystem(balance.gravity.strength, balance.physics.maxAcceleration);
    this.world = new PhysicsWorld(this.gravity, (entity) =>
      this.events.emit('entitySpawned', {
        entityId: entity.id,
        kind: entity.kind,
        position: { ...entity.body.position },
      }),
    );
    this.chains.clear();
    this.explosions.length = 0;
    this.wellChains.clear();
    this.launched.clear();
    this.time = 0;
    this.lastDamage = 'Unknown';
    this.wellCooldown = 0;
    this.waveIndex = 0;
    this.nextWellCompression = 0;
    this.nextWaveAt = undefined;
    this.state = 'ready';
    this.move = { x: 0, y: 0 };
    this.stats = { kills: 0, flips: 0, wells: 0, redirectedKills: 0, score: 0, zeroSeconds: 0 };
    this.enemies = new EnemySystem(this);
    this.bosses = new BossSystem(this);
    this.rules = new RuleSystem(this);
    this.objects = new ObjectSystem(this);
    this.materials = new MaterialSystem(this);
    for (const wall of room.walls) this.world.addWall(wall.x, wall.y, wall.width, wall.height);
    if (populate) {
      for (const spawn of room.spawns) {
        const entity = this.world.spawn(spawn.kind as EntityKind, spawn)!;
        if (entity.kind === 'player') this.player = entity;
        if (spawn.elite) this.enemies.setElite(entity, spawn.elite);
      }
    } else this.player = this.world.spawn('player', { x: 310, y: 470 })!;
    this.abilities = new AbilitySystem(this);
    this.environment = new EnvironmentSystem(room, this);
  }

  castAbility(id: string, position: Vec2): boolean {
    return this.state === 'playing' && this.abilities.cast(id, position);
  }
  get directionLocked(): boolean {
    return this.rules.directionLocked;
  }
  createCause(source = 'environment'): number {
    return this.chains.start(this.time, source);
  }
  markCause(entity: Entity, id: number, depth = 0): void {
    this.attribute(entity, { id, depth });
  }
  applyDamage(entity: Entity, amount: number, cause: number, type = 'Gravity', depth = 1): void {
    this.damage(entity, amount, { id: cause, depth }, [type]);
  }
  detonate(entity: Entity): void {
    if (!entity.alive) return;
    entity.health = 1;
    this.damage(entity, 1, { id: entity.chainId, depth: entity.chainDepth + 1 });
  }
  recoverEnergy(amount: number): void {
    this.abilities.energy = Math.min(this.abilities.maxEnergy, this.abilities.energy + amount);
  }
  private drop(kind: 'xp' | 'shard', amount: number, position: Vec2): void {
    const entity = this.world.spawn(kind, position);
    if (!entity) {
      this.events.emit('collected', { kind, amount, position });
      return;
    }
    entity.value = amount;
    this.world.impulse(entity, {
      x: (this.random.next() - 0.5) * 4,
      y: -2 - this.random.next() * 2,
    });
  }
  private collect(entity: Entity): void {
    if (!entity.alive || (entity.kind !== 'xp' && entity.kind !== 'shard')) return;
    this.events.emit('collected', {
      kind: entity.kind,
      amount: entity.value,
      position: { ...entity.body.position },
    });
    this.world.remove(entity);
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
    if (this.rules.directionLocked) return false;
    if (this.abilities.modifiers.evaluate('randomGravity', 0) > 0)
      direction = this.random.pick(
        [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ].filter(
          (candidate) =>
            candidate.x !== this.gravity.direction.x || candidate.y !== this.gravity.direction.y,
        ),
      );
    const previous = this.gravity.direction;
    if (this.state !== 'playing' || !this.gravity.setDirection(direction)) return false;
    if (previous.x === this.gravity.direction.x && previous.y === this.gravity.direction.y)
      return false;
    const chain = this.chains.start(this.time, 'flip');
    for (const entity of this.world.entities.values()) {
      if (entity.body.isStatic) continue;
      const response = entity.definition.gravityResponse * entity.gravityScale;
      const tags = [entity.definition.material, ...entity.definition.tags];
      const before = this.gravity.sample(entity.body.position, response, tags, previous);
      const after = this.gravity.sample(entity.body.position, response, tags);
      if (length(subtract(after, before)) < 1e-8) continue;
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
    const modifiers = this.abilities.modifiers;
    const tags = ['Gravity', 'Control', 'Well'];
    const copies = Math.max(1, Math.min(2, Math.floor(modifiers.evaluate('wellCopies', 1))));
    const maxWells = Math.max(
      copies,
      Math.floor(modifiers.evaluate('maxWells', balance.gravity.maxWells)),
    );
    let chain: number | undefined;
    let created = 0;
    for (let copy = 0; copy < copies; copy++) {
      const wells = [...this.gravity.fields.values()].filter(
        (field) => field.source === 'player-well',
      );
      if (wells.length >= maxWells) this.gravity.removeField(wells[0].id);
      if (this.gravity.fields.size >= balance.physics.maxFields) break;
      chain ??= this.chains.start(this.time, 'well');
      const offset = copies > 1 ? (copy ? 1 : -1) * balance.gravity.dualWellOffset : 0;
      const bounded = {
        x: Math.max(
          65,
          Math.min(this.room.width - 65, position.x + offset * this.gravity.direction.y),
        ),
        y: Math.max(
          65,
          Math.min(this.room.height - 65, position.y - offset * this.gravity.direction.x),
        ),
      };
      const radius = modifiers.evaluate('radius', balance.gravity.wellRadius, tags);
      const fieldId = this.gravity.addField({
        source: 'player-well',
        mode: 'radial',
        position: bounded,
        direction: { x: 0, y: 0 },
        strength: modifiers.evaluate('strength', balance.gravity.wellStrength, tags),
        radius,
        falloff: 'linear',
        remaining: modifiers.evaluate('duration', balance.gravity.wellDuration, tags),
      });
      this.wellChains.set(fieldId, chain);
      for (const entity of this.world.entities.values())
        if (
          !entity.body.isStatic &&
          entity.definition.gravityResponse * entity.gravityScale !== 0 &&
          length(subtract(entity.body.position, bounded)) < radius
        ) {
          this.attribute(entity, { id: chain, depth: 0 });
          if (entity.kind === 'projectile') entity.redirected = true;
        }
      created++;
    }
    if (!created) return false;
    this.stats.wells++;
    this.wellCooldown = Math.max(
      0.25,
      modifiers.evaluate('cooldown', balance.gravity.wellCooldown, tags),
    );
    this.events.emit('wellCreated', {
      position: {
        x: Math.max(65, Math.min(this.room.width - 65, position.x)),
        y: Math.max(65, Math.min(this.room.height - 65, position.y)),
      },
    });
    return true;
  }

  step(): void {
    if (this.state !== 'playing') return;
    const dt = balance.physics.stepMs / 1000;
    this.time += dt;
    this.trigger('Periodic');
    for (let index = this.echoes.length - 1; index >= 0; index--)
      if (this.echoes[index].time <= this.time) {
        const echo = this.echoes.splice(index, 1)[0];
        this.abilities.cast(echo.id, echo.position, true);
      }
    this.abilities.tick(dt);
    const compression = this.abilities.modifiers.evaluate('wellCompression', 0);
    if (compression > 0 && this.time >= this.nextWellCompression) {
      this.nextWellCompression = this.time + balance.gravity.wellCompressionInterval;
      for (const [id, chain] of this.wellChains) {
        const field = this.gravity.fields.get(id);
        if (!field) continue;
        for (const entity of [...this.world.entities.values()])
          if (
            entity.definition.faction === 'enemy' &&
            entity.kind !== 'projectile' &&
            length(subtract(entity.body.position, field.position)) <
              balance.gravity.wellCompressionRadius
          )
            this.applyDamage(entity, compression, chain, 'Compression');
      }
    }
    this.rules.tick();
    this.environment.tick();
    if (length(this.gravity.sample(this.player.body.position)) < 0.00001)
      this.stats.zeroSeconds += dt;
    this.wellCooldown = Math.max(0, this.wellCooldown - dt);
    this.gravity.tick(dt);
    for (const id of this.wellChains.keys())
      if (!this.gravity.fields.has(id)) this.wellChains.delete(id);
    this.chains.tick(this.time);
    for (const id of this.launched.keys())
      if (!this.world.entities.has(id)) this.launched.delete(id);
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
      if (
        entity.definition.faction === 'enemy' &&
        entity.kind !== 'projectile' &&
        entity.chainId !== null &&
        this.launched.get(entity.id) !== entity.chainId &&
        length(Matter.Body.getVelocity(entity.body)) > balance.combat.impactThreshold
      ) {
        this.launched.set(entity.id, entity.chainId);
        this.events.emit('enemyLaunched', {
          entityId: entity.id,
          kind: entity.kind,
          velocity: Matter.Body.getVelocity(entity.body),
          chainId: entity.chainId,
          source: this.chains.source(entity.chainId),
        });
      }
      for (const field of this.gravity.fields.values()) {
        if (
          field.source === 'player-well' &&
          !entity.body.isStatic &&
          entity.definition.gravityResponse * entity.gravityScale !== 0 &&
          length(subtract(entity.body.position, field.position)) < field.radius
        ) {
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
      else if (entity.definition.faction === 'neutral') this.objects.update(entity);
    }
    this.world.step();
    for (const collision of this.world.collisions) this.resolveCollision(collision);
    this.resolveExplosions();
    this.materials.tick();
    this.resolveExplosions();
    if (this.player.health <= 0) this.end(false);
    else if (
      !this.room.manualCompletion &&
      (this.room.puzzle ? this.environment.puzzleComplete : this.enemyCount === 0)
    ) {
      for (const entity of [...this.world.entities.values()])
        if (entity.kind === 'xp' || entity.kind === 'shard') this.collect(entity);
      if (this.waveIndex < (this.room.waves?.length ?? 0)) {
        this.nextWaveAt ??= this.time + balance.enemies.waveDelay;
        if (this.time >= this.nextWaveAt) {
          for (const spawn of this.waveSpawns) {
            const entity = this.world.spawn(spawn.kind, spawn);
            if (!entity) continue;
            for (let attempt = 0; attempt < 12; attempt++) {
              if (
                !Matter.Query.collides(entity.body, this.world.walls).length &&
                length(subtract(entity.body.position, this.player.body.position)) > 100
              )
                break;
              const angle = (attempt * Math.PI) / 3;
              Matter.Body.setPosition(entity.body, {
                x: Math.max(
                  90,
                  Math.min(
                    this.room.width - 90,
                    spawn.x + Math.cos(angle) * (80 + Math.floor(attempt / 6) * 80),
                  ),
                ),
                y: Math.max(
                  90,
                  Math.min(
                    this.room.height - 90,
                    spawn.y + Math.sin(angle) * (80 + Math.floor(attempt / 6) * 80),
                  ),
                ),
              });
            }
            if (Matter.Query.collides(entity.body, this.world.walls).length) {
              this.world.remove(entity);
              continue;
            }
            entity.invulnerability = balance.enemies.spawnProtection;
            if (spawn.elite) this.enemies.setElite(entity, spawn.elite);
          }
          this.waveIndex++;
          this.nextWaveAt = undefined;
        }
      } else this.end(true);
    }
  }

  private updateEnemy(entity: Entity, dt: number): void {
    if (this.bosses.update(entity)) return;
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

  private resolveCollision({ a, b, speed, position, normal }: CollisionFact): void {
    if ((a && !a.alive) || (b && !b.alive)) return;
    this.events.emit('collisionOccurred', {
      a: a?.id,
      b: b?.id,
      speed,
      position: { ...position },
      normal: { ...normal },
    });
    const pickup =
      a?.kind === 'xp' || a?.kind === 'shard'
        ? a
        : b?.kind === 'xp' || b?.kind === 'shard'
          ? b
          : undefined;
    if (pickup) {
      if ((pickup === a ? b : a)?.kind === 'player') this.collect(pickup);
      return;
    }
    if (a && b) this.materials.collide(a, b);
    if ((a && !a.alive) || (b && !b.alive)) return;
    if (speed > balance.combat.impactThreshold) {
      this.trigger('OnCollision');
      this.rules.impact(position);
    }
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
          (balance.combat.projectileDamage + speed * balance.combat.projectileSpeedCoefficient) *
            (projectile.redirected ? this.abilities.modifiers.evaluate('projectileDamage', 1) : 1),
          {
            id: projectile.chainId,
            depth: projectile.chainDepth + 1,
          },
          ['Projectile', 'Velocity'],
        );
        if (projectile.redirected && this.stats.kills > before) this.stats.redirectedKills++;
      }
      this.world.remove(projectile);
      return;
    }
    const player = a?.kind === 'player' ? a : b?.kind === 'player' ? b : undefined;
    const other = player === a ? b : a;
    if (player && other?.definition.faction === 'enemy')
      this.damage(player, balance.player.contactDamage, { id: null, depth: 0 }, ['Contact']);
    if (speed < balance.combat.impactThreshold) {
      for (const [target, attacker] of [
        [a, b],
        [b, a],
      ]) {
        if (
          !target ||
          target.kind === 'player' ||
          this.time - target.lastImpact < balance.combat.crushCooldown
        )
          continue;
        const pushing = attacker ?? target;
        if (pushing.kind === 'player' || pushing.body.isStatic || pushing.chainId === null)
          continue;
        const acceleration = this.gravity.sample(
          pushing.body.position,
          pushing.definition.gravityResponse * pushing.gravityScale,
          [pushing.definition.material, ...pushing.definition.tags],
        );
        const towardContact = normalize(subtract(position, pushing.body.position));
        const pressure =
          Math.max(0, acceleration.x * towardContact.x + acceleration.y * towardContact.y) *
          pushing.body.mass *
          1000;
        if (pressure > balance.combat.crushThreshold) {
          target.lastImpact = this.time;
          this.damage(
            target,
            pressure * balance.combat.crushCoefficient,
            { id: pushing.chainId, depth: pushing.chainDepth + 1 },
            ['Crush', 'Gravity'],
          );
        }
      }
      return;
    }
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
      const mass = attacker && !attacker.body.isStatic ? attacker.body.mass : target.body.mass;
      const damage = Math.min(
        balance.combat.maxDamage,
        mass *
          (speed - balance.combat.impactThreshold) *
          balance.combat.impactCoefficient *
          this.abilities.modifiers.evaluate('impactDamage', 1),
      );
      target.lastImpact = this.time;
      const source = this.chains.source(cause.id);
      const tags = ['Impact', 'Velocity'];
      const sourceTags = abilityById.get(source)?.tags ?? [];
      if (sourceTags.includes('Orbit') || sourceTags.includes('Orbital'))
        tags.push('Orbital', 'Orbit');
      if (sourceTags.includes('Void')) tags.push('Void');
      this.damage(target, damage, cause, tags);
      if (attacker && attacker.kind !== 'player') this.attribute(attacker, cause);
    }
  }

  private attribute(entity: Entity, cause: Cause): void {
    if (cause.id === null || cause.depth > balance.combat.maxChainDepth) return;
    entity.chainId = cause.id;
    this.chains.touch(cause.id, this.time);
    entity.chainDepth = cause.depth;
    entity.chainExpires = this.time + balance.combat.chainTimeout;
  }

  private damage(entity: Entity, amount: number, cause: Cause, tags: string[] = ['Gravity']): void {
    if (
      !entity.alive ||
      (!entity.definition.breakable && entity.kind !== 'player') ||
      entity.invulnerability > 0
    )
      return;
    const bounded = Math.min(
      balance.combat.maxDamage,
      Math.max(
        0,
        entity.kind === 'player'
          ? amount
          : this.abilities.modifiers.evaluate('damage', amount, tags),
      ),
    );
    entity.health -= bounded;
    if (entity.kind === 'player' && bounded > 0) this.lastDamage = tags.join('+');
    this.attribute(entity, cause);
    if (entity.kind === 'player') entity.invulnerability = balance.player.invulnerability;
    this.events.emit('damaged', {
      position: { ...entity.body.position },
      amount: bounded,
      player: entity.kind === 'player',
    });
    if (entity.health > 0) return;
    entity.health = 0;
    if (entity.kind === 'player') {
      this.trigger('OnDeath');
      return;
    }
    this.world.remove(entity);
    this.enemies.onDeath(entity);
    this.bosses.onDeath(entity);
    if (entity.kind in bossDefinitions)
      this.events.emit('bossDefeated', {
        entityId: entity.id,
        kind: entity.kind,
        position: { ...entity.body.position },
      });
    this.objects.onDeath(entity);
    this.materials.onDeath(entity);
    if (
      ['barrel', 'mine', 'container', 'bomber'].includes(entity.kind) ||
      entity.elite === 'unstable'
    )
      this.explosions.push({ entity, cause });
    const chainLength = this.chains.extend(cause.id, `kill:${entity.id}`, cause.depth, this.time);
    if (entity.definition.faction === 'enemy') {
      this.stats.kills++;
      this.stats.score += 100 + chainLength * 25;
      this.trigger('OnKill', tags);
      this.drop('xp', 18 + Math.min(30, chainLength * 3), entity.body.position);
      this.drop('shard', 5, { x: entity.body.position.x + 12, y: entity.body.position.y });
    }
    this.events.emit('killed', {
      position: { ...entity.body.position },
      kind: entity.kind,
      chainId: cause.id,
      chainLength,
      source: this.chains.source(cause.id),
      elite: Boolean(entity.elite),
      boss: entity.kind in bossDefinitions,
      damageTags: tags,
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
        this.materials.ignite(target, nextCause.id, nextCause.depth);
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
          ['Environmental', 'Explosion'],
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
