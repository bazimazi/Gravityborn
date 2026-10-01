import Matter from 'matter-js';
import { entityDefinitions as definitions, type EliteModifier } from '../content/enemies';
import balance from '../data/balance.json';
import { clampVector, type Vec2 } from '../core/vector';
import { GravitySystem } from './gravity';

const { Bodies, Body, Composite, Engine, Events, Sleeping } = Matter;
export type EntityKind = keyof typeof definitions;
export type EntityDefinition = (typeof definitions)[EntityKind];
export interface Entity {
  id: number;
  generation: number;
  kind: EntityKind;
  definition: EntityDefinition;
  body: Matter.Body;
  health: number;
  maxHealth: number;
  value: number;
  alive: boolean;
  invulnerability: number;
  lastImpact: number;
  shotTimer: number;
  life: number;
  chainId: number | null;
  chainDepth: number;
  chainExpires: number;
  redirected: boolean;
  ownerId: number | null;
  gravityScale: number;
  gravityBase: number;
  gravityFactors: Map<string, number>;
  elite?: EliteModifier;
  telegraph?: number;
  attackAim?: Vec2;
}
export interface CollisionFact {
  a: Entity | undefined;
  b: Entity | undefined;
  position: Vec2;
  speed: number;
  normal: Vec2;
}

export class PhysicsWorld {
  readonly engine = Engine.create({
    enableSleeping: true,
    positionIterations: balance.physics.positionIterations,
    velocityIterations: balance.physics.velocityIterations,
  });
  readonly entities = new Map<number, Entity>();
  readonly walls: Matter.Body[] = [];
  readonly collisions: CollisionFact[] = [];
  private readonly velocities = new Map<number, Vec2>();
  private readonly projectilePool: Entity[] = [];
  private readonly safePositions = new Map<number, Vec2>();
  focus?: Vec2;
  private readonly wallPositions = new Map<Matter.Body, { x: number; y: number; angle: number }>();

  constructor(
    readonly gravity: GravitySystem,
    private readonly onSpawn?: (entity: Entity) => void,
  ) {
    this.engine.gravity.scale = 0;
    Events.on(this.engine, 'beforeSolve', () => {
      for (const entity of this.entities.values())
        this.velocities.set(entity.id, Body.getVelocity(entity.body));
    });
    const recordCollisions = (event: Matter.IEventCollision<Matter.Engine>): void => {
      // Capture facts only. Gameplay consumes these after the solver finishes.
      for (const pair of event.pairs) {
        const a = this.entities.get(pair.bodyA.id);
        const b = this.entities.get(pair.bodyB.id);
        if (!a && !b) continue;
        // Even a slow moving body must wake dormant matter before collision resolution.
        if (a?.body.isSleeping && b && !b.body.isSleeping && !b.body.isStatic)
          Sleeping.set(a.body, false);
        if (b?.body.isSleeping && a && !a.body.isSleeping && !a.body.isStatic)
          Sleeping.set(b.body, false);
        const av = this.velocities.get(pair.bodyA.id) ?? { x: 0, y: 0 };
        const bv = this.velocities.get(pair.bodyB.id) ?? { x: 0, y: 0 };
        const normal = pair.collision.normal;
        const speed = Math.abs((av.x - bv.x) * normal.x + (av.y - bv.y) * normal.y);
        const point = pair.collision.supports[0] ?? (a ?? b)!.body.position;
        this.collisions.push({
          a,
          b,
          speed,
          position: { x: point.x, y: point.y },
          normal: { x: normal.x, y: normal.y },
        });
      }
    };
    Events.on(this.engine, 'collisionStart', recordCollisions);
    Events.on(this.engine, 'collisionActive', recordCollisions);
  }

  addWall(x: number, y: number, width: number, height: number): void {
    const body = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      restitution: 0.3,
      friction: 0.1,
    });
    this.walls.push(body);
    Composite.add(this.engine.world, body);
  }

  circleClear(position: Vec2, radius: number): boolean {
    if (!Number.isFinite(position.x + position.y + radius) || radius <= 0) return false;
    const blocked = (body: Matter.Body): boolean => {
      if (
        position.x + radius < body.bounds.min.x ||
        position.x - radius > body.bounds.max.x ||
        position.y + radius < body.bounds.min.y ||
        position.y - radius > body.bounds.max.y
      )
        return false;
      if (Matter.Vertices.contains(body.vertices, position)) return true;
      return body.vertices.some((a, index, vertices) => {
        const b = vertices[(index + 1) % vertices.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const square = dx * dx + dy * dy;
        const fraction = square
          ? Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.y - a.y) * dy) / square))
          : 0;
        return (
          Math.hypot(position.x - a.x - dx * fraction, position.y - a.y - dy * fraction) <= radius
        );
      });
    };
    return (
      !this.walls.some(blocked) &&
      ![...this.entities.values()].some(
        (entity) => entity.alive && entity.body.isStatic && blocked(entity.body),
      )
    );
  }

  spawn(kind: EntityKind, position: Vec2): Entity | undefined {
    if (
      this.entities.size >= balance.physics.maxBodies ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    )
      return undefined;
    const definition = definitions[kind];
    let entity = kind === 'projectile' ? this.projectilePool.pop() : undefined;
    if (entity) {
      Body.setStatic(entity.body, false);
      Body.setMass(entity.body, definition.mass);
      entity.body.restitution = definition.restitution;
      entity.body.frictionAir = definition.frictionAir;
      entity.body.collisionFilter = { category: 2, mask: 0xffffffff, group: 0 };
      Body.setPosition(entity.body, position);
      Body.setAngle(entity.body, 0);
      Body.setVelocity(entity.body, { x: 0, y: 0 });
      Body.setAngularVelocity(entity.body, 0);
      Sleeping.set(entity.body, false);
    } else {
      const body = this.makeBody(kind, position);
      entity = { id: body.id, body } as Entity;
      Object.defineProperty(entity, 'gravityScale', {
        enumerable: true,
        get(this: Entity): number {
          let response = this.gravityBase;
          for (const factor of this.gravityFactors.values()) {
            if (factor === 0) return 0;
            response *= factor;
          }
          return Math.max(-4, Math.min(4, Number.isNaN(response) ? 1 : response));
        },
        set(this: Entity, value: number) {
          this.gravityBase = value;
        },
      });
    }
    Object.assign(entity, {
      generation: (entity.generation ?? 0) + 1,
      kind,
      definition,
      health: definition.health,
      maxHealth: definition.health,
      value: 0,
      alive: true,
      invulnerability: 0,
      lastImpact: -Infinity,
      shotTimer: balance.enemies.shooterCooldown,
      life: 0,
      chainId: null,
      chainDepth: 0,
      chainExpires: 0,
      redirected: false,
      ownerId: null,
      gravityFactors: new Map<string, number>(),
      gravityScale: 1,
      elite: undefined,
      telegraph: undefined,
      attackAim: undefined,
    });
    this.entities.set(entity.id, entity);
    this.safePositions.set(entity.id, { ...position });
    Composite.add(this.engine.world, entity.body);
    this.onSpawn?.(entity);
    return entity;
  }

  remove(entity: Entity): void {
    if (!this.entities.has(entity.id)) return;
    entity.alive = false;
    this.entities.delete(entity.id);
    this.velocities.delete(entity.id);
    this.safePositions.delete(entity.id);
    Composite.remove(this.engine.world, entity.body);
    if (entity.kind === 'projectile') this.projectilePool.push(entity);
  }

  accelerate(entity: Entity, acceleration: Vec2): void {
    if (entity.body.isStatic) return;
    const bounded = clampVector(acceleration, balance.physics.maxAcceleration);
    if (bounded.x !== 0 || bounded.y !== 0) Sleeping.set(entity.body, false);
    Body.applyForce(entity.body, entity.body.position, {
      x: bounded.x * entity.body.mass,
      y: bounded.y * entity.body.mass,
    });
  }

  impulse(entity: Entity, velocityChange: Vec2): void {
    if (entity.body.isStatic) return;
    const bounded = clampVector(velocityChange, balance.physics.maxImpulse);
    if (bounded.x !== 0 || bounded.y !== 0) Sleeping.set(entity.body, false);
    Body.setVelocity(
      entity.body,
      clampVector(
        { x: entity.body.velocity.x + bounded.x, y: entity.body.velocity.y + bounded.y },
        balance.physics.maxVelocity,
      ),
    );
  }

  step(): void {
    this.collisions.length = 0;
    let geometryChanged = this.wallPositions.size !== this.walls.length;
    for (const wall of this.walls) {
      const previous = this.wallPositions.get(wall);
      if (
        !previous ||
        previous.x !== wall.position.x ||
        previous.y !== wall.position.y ||
        previous.angle !== wall.angle
      )
        geometryChanged = true;
    }
    this.wallPositions.clear();
    for (const wall of this.walls)
      this.wallPositions.set(wall, { ...wall.position, angle: wall.angle });
    const constrained = new Set<Matter.Body>();
    for (const constraint of Composite.allConstraints(this.engine.world)) {
      if (constraint.bodyA) constrained.add(constraint.bodyA);
      if (constraint.bodyB) constrained.add(constraint.bodyB);
    }
    for (const entity of this.entities.values()) {
      this.repairIfInvalid(entity);
      if (entity.body.isStatic) continue;
      const velocity = Body.getVelocity(entity.body);
      if (
        Math.hypot(velocity.x, velocity.y) > balance.physics.maxVelocity ||
        !Number.isFinite(velocity.x + velocity.y)
      )
        Body.setVelocity(entity.body, clampVector(velocity, balance.physics.maxVelocity));
      const gravity = this.gravity.sample(
        entity.body.position,
        entity.definition.gravityResponse * entity.gravityScale,
        [entity.definition.material, ...entity.definition.tags],
      );
      const dormantCandidate = Boolean(
        this.focus &&
          !geometryChanged &&
          entity.definition.faction === 'neutral' &&
          entity.kind !== 'xp' &&
          entity.kind !== 'shard' &&
          !constrained.has(entity.body) &&
          Math.hypot(entity.body.position.x - this.focus.x, entity.body.position.y - this.focus.y) >
            balance.physics.dormancyDistance &&
          Math.hypot(velocity.x, velocity.y) < balance.physics.dormancySpeed &&
          Math.abs(Body.getAngularVelocity(entity.body)) < balance.physics.dormancyAngularSpeed &&
          gravity.x === 0 &&
          gravity.y === 0 &&
          entity.body.force.x === 0 &&
          entity.body.force.y === 0 &&
          entity.body.torque === 0,
      );
      entity.body.sleepThreshold = dormantCandidate
        ? entity.body.isSleeping
          ? 0
          : balance.physics.dormancyDelayMs / (1000 / 60)
        : 0;
      if (!dormantCandidate && entity.body.isSleeping) Sleeping.set(entity.body, false);
      if (entity.body.isSleeping) continue;
      this.accelerate(entity, gravity);
      const acceleration = clampVector(
        { x: entity.body.force.x / entity.body.mass, y: entity.body.force.y / entity.body.mass },
        balance.physics.maxAcceleration,
      );
      entity.body.force.x = acceleration.x * entity.body.mass;
      entity.body.force.y = acceleration.y * entity.body.mass;
      if (!Number.isFinite(entity.body.torque)) entity.body.torque = 0;
      const angularVelocity = Body.getAngularVelocity(entity.body);
      if (
        !Number.isFinite(angularVelocity) ||
        Math.abs(angularVelocity) > balance.physics.maxAngularVelocity
      )
        Body.setAngularVelocity(
          entity.body,
          Number.isFinite(angularVelocity)
            ? Math.sign(angularVelocity) * balance.physics.maxAngularVelocity
            : 0,
        );
    }
    Engine.update(this.engine, balance.physics.stepMs);
    for (const entity of this.entities.values()) {
      if (entity.body.isSleeping) continue;
      this.repairIfInvalid(entity);
      const velocity = Body.getVelocity(entity.body);
      if (
        Math.hypot(velocity.x, velocity.y) > balance.physics.maxVelocity ||
        !Number.isFinite(velocity.x + velocity.y)
      ) {
        Body.setVelocity(entity.body, clampVector(velocity, balance.physics.maxVelocity));
      }
      if (!Number.isFinite(entity.body.angle) || !Number.isFinite(entity.body.angularVelocity)) {
        Body.setAngle(entity.body, 0);
        Body.setAngularVelocity(entity.body, 0);
      } else if (Math.abs(entity.body.angularVelocity) > balance.physics.maxAngularVelocity) {
        Body.setAngularVelocity(
          entity.body,
          Math.sign(entity.body.angularVelocity) * balance.physics.maxAngularVelocity,
        );
      }
      Object.assign(this.safePositions.get(entity.id)!, entity.body.position);
    }
  }

  private makeBody(kind: EntityKind, position: Vec2): Matter.Body {
    const definition = definitions[kind];
    const options = {
      sleepThreshold: 0,
      restitution: definition.restitution,
      frictionAir: definition.frictionAir,
      friction: definition.material === 'ice' ? 0.001 : 0.05,
      label: kind,
      collisionFilter: {
        category: kind === 'player' ? 8 : kind === 'xp' || kind === 'shard' ? 4 : 2,
        mask: kind === 'xp' || kind === 'shard' ? 9 : 0xffffffff,
      },
    };
    const body =
      definition.shape === 'rectangle' && 'width' in definition
        ? Bodies.rectangle(position.x, position.y, definition.width, definition.height, options)
        : definition.shape === 'polygon'
          ? Bodies.polygon(
              position.x,
              position.y,
              kind === 'heavy' ? 6 : 7,
              definition.radius,
              options,
            )
          : Bodies.circle(position.x, position.y, definition.radius, options);
    Body.setMass(body, definition.mass);
    if (kind === 'rift_seal') Body.setStatic(body, true);
    if (kind === 'player') Body.setInertia(body, Infinity);
    return body;
  }

  private repairIfInvalid(entity: Entity): void {
    const body = entity.body;
    if (
      Number.isFinite(body.position.x + body.position.y + body.angle) &&
      body.vertices.every((vertex) => Number.isFinite(vertex.x + vertex.y))
    )
      return;
    // Translating a NaN shape cannot recover its vertices. Rebuild geometry at
    // the last known finite position, preserving the gameplay entity identity.
    const replacement = this.makeBody(entity.kind, this.safePositions.get(entity.id)!);
    replacement.id = entity.id;
    Composite.remove(this.engine.world, body);
    entity.body = replacement;
    Composite.add(this.engine.world, replacement);
    this.velocities.delete(entity.id);
    Engine.clear(this.engine);
    this.collisions.length = 0;
  }

  dispose(): void {
    Events.off(this.engine, 'beforeSolve collisionStart collisionActive');
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.entities.clear();
    this.velocities.clear();
    this.walls.length = 0;
    this.collisions.length = 0;
    this.projectilePool.length = 0;
    this.safePositions.clear();
    this.wallPositions.clear();
  }
}
