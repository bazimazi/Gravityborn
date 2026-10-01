import Matter from 'matter-js';
import type { RoomDefinition } from '../content/rooms';
import { length, subtract } from '../core/vector';
import type { AbilityHost } from './abilities';
// Matter 0.20 supports updateVelocity; the bundled DefinitelyTyped signatures omit it.
const movingBody: {
  setAngle(body: Matter.Body, angle: number, updateVelocity?: boolean): void;
  setPosition(body: Matter.Body, position: Matter.Vector, updateVelocity?: boolean): void;
} = Matter.Body;
export class EnvironmentSystem {
  switchActive = false;
  puzzleComplete = false;
  constructor(
    readonly room: RoomDefinition,
    private readonly host: AbilityHost,
  ) {
    for (const field of room.fields) host.gravity.addField(field);
  }
  hazardActive(index: number): boolean {
    const hazard = this.room.hazards[index];
    return (
      hazard.kind === 'wind' ||
      hazard.kind === 'spikes' ||
      (this.host.time + hazard.phase) % hazard.period > hazard.period * 0.45
    );
  }
  tick(): void {
    for (const [index, wall] of this.room.walls.entries()) {
      if (!wall.motion) continue;
      const body = this.host.world.walls[index];
      if (!body) continue;
      if (wall.motion === 'rotate') movingBody.setAngle(body, this.host.time * 0.35, true);
      else
        movingBody.setPosition(
          body,
          {
            x: wall.x + (wall.motion === 'horizontal' ? Math.sin(this.host.time * 0.6) * 100 : 0),
            y: wall.y + (wall.motion === 'vertical' ? Math.sin(this.host.time * 0.6) * 80 : 0),
          },
          true,
        );
    }
    for (const [index, hazard] of this.room.hazards.entries()) {
      if (!this.hazardActive(index)) continue;
      for (const entity of this.host.world.entities.values()) {
        const position = entity.body.position;
        if (
          Math.abs(position.x - hazard.x) > hazard.width / 2 + entity.definition.radius ||
          Math.abs(position.y - hazard.y) > hazard.height / 2 + entity.definition.radius
        )
          continue;
        if (hazard.kind === 'wind')
          this.host.world.accelerate(entity, { x: Math.sin(this.host.time) * 0.001, y: -0.0015 });
        else if (this.host.time - entity.lastImpact > 0.6) {
          entity.lastImpact = this.host.time;
          this.host.applyDamage(
            entity,
            hazard.kind === 'laser' ? 18 : 24,
            entity.chainId ?? this.host.createCause(),
            'Environmental',
          );
        }
      }
    }
    if (this.room.puzzle) {
      if (!this.switchActive)
        this.switchActive = [...this.host.world.entities.values()].some(
          (entity) =>
            entity.kind !== 'player' &&
            entity.body.mass >= 3 &&
            length(subtract(entity.body.position, this.room.puzzle!.switch)) < 50,
        );
      this.puzzleComplete =
        this.switchActive &&
        length(subtract(this.host.player.body.position, this.room.puzzle.exit)) < 55;
    }
  }
}
