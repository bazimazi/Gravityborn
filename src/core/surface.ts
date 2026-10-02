export const surfaceLimits = {
  restitution: [0, 1.2],
  friction: [0, 1],
  frictionStatic: [0, 10],
  frictionAir: [0, 0.3],
} as const;
export type SurfaceProperty = keyof typeof surfaceLimits;
export type SurfaceValues = Record<SurfaceProperty, number>;
