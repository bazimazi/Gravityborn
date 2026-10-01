import { abilityById } from './abilities';
export function abilityFeedback(id: string): {
  color: string;
  startFrequency: number;
  endFrequency: number;
  soundDuration: number;
  radius: number;
} {
  const ability = abilityById.get(id);
  const voidPower = ability?.tags.includes('Void');
  const orbit = ability?.tags.includes('Orbit');
  return {
    color: ability?.feedback?.color ?? (voidPower ? '#c09af5' : orbit ? '#98ceff' : '#80e6d1'),
    startFrequency: ability?.feedback?.startFrequency ?? (voidPower ? 75 : orbit ? 220 : 180),
    endFrequency: ability?.feedback?.endFrequency ?? (voidPower ? 35 : orbit ? 550 : 420),
    soundDuration: ability?.feedback?.soundDuration ?? (voidPower ? 0.45 : 0.2),
    radius: Math.min(380, Math.max(60, ability?.radius ?? 160)),
  };
}
