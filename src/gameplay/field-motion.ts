import type { AbilityDefinition } from '../content/abilities';
import type { Vec2 } from '../core/vector';

export interface FieldMotion {
  origin: Vec2;
  direction: Vec2;
  radius: number;
  strength: number;
  start: number;
  duration: number;
  phase: number;
  parameters: NonNullable<AbilityDefinition['parameters']>;
}

/** Analytic motion is independent of frame size; GravitySystem still computes all forces. */
export function fieldMotionAt(program: FieldMotion, time: number, anchor = program.origin) {
  const elapsed = Math.max(0, Math.min(program.duration, time - program.start));
  const progress = elapsed / program.duration;
  const p = program.parameters;
  const angle =
    Math.atan2(program.direction.y, program.direction.x) +
    program.phase +
    (p.orbitSpeed ?? 0) * elapsed;
  const offset = p.fieldOffset ?? 0;
  const travel =
    (p.returning ? Math.min(elapsed, program.duration - elapsed) : elapsed) * (p.travelSpeed ?? 0);
  const turn = (p.directionSpeed ?? 0) * elapsed;
  return {
    position: {
      x: anchor.x + Math.cos(angle) * offset + program.direction.x * travel,
      y: anchor.y + Math.sin(angle) * offset + program.direction.y * travel,
    },
    direction: {
      x: program.direction.x * Math.cos(turn) - program.direction.y * Math.sin(turn),
      y: program.direction.x * Math.sin(turn) + program.direction.y * Math.cos(turn),
    },
    radius: Math.max(
      1,
      Math.min(
        600,
        program.radius *
          ((p.radiusStart ?? 1) + ((p.radiusEnd ?? 1) - (p.radiusStart ?? 1)) * progress),
      ),
    ),
    strength:
      program.strength *
      (p.strengthPeriod ? Math.cos((Math.PI * 2 * elapsed) / p.strengthPeriod) : 1),
  };
}
