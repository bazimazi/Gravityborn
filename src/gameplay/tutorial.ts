import Matter from 'matter-js';
import type { Game } from './game';
import type { RoomDefinition } from '../content/rooms';

export const lessons = [
  {
    name: 'Move your core',
    text: 'Move with the joystick or W A S D. Reach the marked circle.',
    hint: 'joystick',
  },
  {
    name: 'Choose a new down',
    text: 'Press a direction button or arrow key. Watch the loose rock fall sideways.',
    hint: 'gravity',
  },
  {
    name: 'Go around the obstacle',
    text: 'The wall blocks the direct path. Flip upward or downward, then cross to the far circle.',
    hint: 'gravity',
  },
  {
    name: 'Gravity is your weapon',
    text: 'Flip gravity right to launch the rock into the stationary hostile.',
    hint: 'gravity',
  },
  {
    name: 'Move the matter',
    text: 'Move the rock at least 150 units by flipping gravity or placing a well.',
    hint: 'gravity',
  },
  {
    name: 'Give the room a center',
    text: 'Tap or click near the barrels to create a gravity well. Watch the matter converge.',
    hint: 'well',
  },
  {
    name: 'One cause, many effects',
    text: 'Launch the rock into the barrel row. Build a chain of at least three effects.',
    hint: 'gravity',
  },
] as const;

export class Tutorial {
  active = false;
  index = 0;
  complete = false;
  private rockId = 0;
  constructor(
    private readonly game: Game,
    private readonly finished: () => void,
  ) {}
  get lesson() {
    return lessons[this.index];
  }
  get beacon() {
    return this.index === 0
      ? { x: 550, y: 400 }
      : this.index === 2
        ? { x: 980, y: 400 }
        : undefined;
  }
  start(): void {
    this.active = true;
    this.index = 0;
    this.load();
  }
  stop(): void {
    this.active = false;
    this.complete = false;
  }
  advance(): boolean {
    if (!this.active || !this.complete) return false;
    if (++this.index === lessons.length) {
      this.stop();
      this.finished();
      return true;
    }
    this.load();
    return true;
  }
  tick(): void {
    if (!this.active || this.complete || this.game.state !== 'playing') return;
    const player = this.game.player.body.position;
    const rock = this.game.world.entities.get(this.rockId);
    this.complete = [
      Math.hypot(player.x - 550, player.y - 400) < 65,
      this.game.stats.flips > 0,
      this.game.stats.flips > 0 && Math.hypot(player.x - 980, player.y - 400) < 100,
      this.game.stats.kills > 0,
      !!rock &&
        (this.game.stats.flips > 0 || this.game.stats.wells > 0) &&
        Math.hypot(rock.body.position.x - 620, rock.body.position.y - 400) > 150,
      this.game.stats.wells > 0,
      this.game.chains.best >= 3,
    ][this.index];
  }
  private load(): void {
    this.complete = false;
    const room: RoomDefinition = {
      id: `tutorial:${this.index}`,
      name: this.lesson.name,
      type: 'combat',
      biome: 0,
      width: 1200,
      height: 800,
      manualCompletion: true,
      walls: [
        { x: 600, y: 25, width: 1200, height: 50 },
        { x: 600, y: 775, width: 1200, height: 50 },
        { x: 25, y: 400, width: 50, height: 700 },
        { x: 1175, y: 400, width: 50, height: 700 },
      ],
      spawns: [{ kind: 'player', x: 250, y: 400 }],
      hazards: [],
      fields: [],
    };
    if (this.index === 2) room.walls.push({ x: 600, y: 400, width: 50, height: 330 });
    if (this.index !== 0 && this.index !== 2) room.spawns.push({ kind: 'rock', x: 620, y: 400 });
    if (this.index === 3) room.spawns.push({ kind: 'chaser', x: 1080, y: 400 });
    if (this.index >= 5)
      for (const x of [760, 840, 920]) room.spawns.push({ kind: 'barrel', x, y: 400 });
    this.game.reset(true, room);
    this.game.gravity.setDirection({ x: 0, y: 0 });
    this.game.player.invulnerability = 36000;
    for (const entity of this.game.world.entities.values()) {
      if (entity.kind === 'rock') this.rockId = entity.id;
      if (entity.definition.faction === 'enemy') {
        Matter.Body.setStatic(entity.body, true);
        entity.health = 28;
      }
    }
    // No initial direction: the first input applies normal gravity and owns its physical effects.
    this.game.start();
  }
}
