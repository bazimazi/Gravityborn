import { abilityById } from './abilities';
export interface AbilitySoundLayer {
  start: number;
  end: number;
  duration: number;
  waveform: 'sine' | 'triangle' | 'square' | 'sawtooth';
  gain: number;
  delay: number;
}
export function abilitySound(id: string): AbilitySoundLayer[] {
  const ability = abilityById.get(id);
  const feedback = abilityFeedback(id);
  const primary: AbilitySoundLayer = {
    start: feedback.startFrequency,
    end: feedback.endFrequency,
    duration: feedback.soundDuration,
    waveform: 'triangle',
    gain: 0.1,
    delay: 0,
  };
  let secondary: AbilitySoundLayer | undefined;
  switch (ability?.effect) {
    case 'deploy':
      primary.waveform = 'square';
      primary.gain = 0.045;
      primary.duration = 0.1;
      secondary = {
        start: primary.start * 1.5,
        end: primary.end,
        duration: 0.25,
        waveform: 'triangle',
        gain: 0.07,
        delay: 0.07,
      };
      break;
    case 'tether':
      primary.duration = 0.14;
      secondary = {
        ...primary,
        start: primary.start * 1.5,
        end: primary.end * 1.5,
        gain: 0.06,
        delay: 0.06,
      };
      break;
    case 'planet':
    case 'split':
    case 'collapse':
      primary.waveform = 'sine';
      primary.duration = Math.max(0.4, primary.duration);
      secondary = {
        ...primary,
        start: primary.start / 2,
        end: primary.end / 2,
        gain: 0.06,
        delay: 0.03,
      };
      break;
    case 'response':
    case 'mass':
      primary.waveform = 'sine';
      primary.duration = 0.35;
      secondary = { ...primary, start: primary.end, end: primary.start, gain: 0.045, delay: 0.08 };
      break;
    case 'surface':
      primary.waveform = 'sine';
      primary.start = ability.parameters?.surface?.restitution ? 220 : 620;
      primary.end = ability.parameters?.surface?.restitution ? 660 : 140;
      primary.duration = 0.2;
      secondary = {
        ...primary,
        start: primary.start * 1.5,
        end: primary.end * 1.5,
        gain: 0.04,
        delay: 0.09,
      };
      break;
    case 'dash':
      primary.start = ability.strength < 0 ? 650 : 180;
      primary.end = ability.strength < 0 ? 120 : 720;
      primary.duration = 0.16;
      break;
    case 'beam':
      primary.waveform = 'sawtooth';
      primary.gain = 0.05;
      primary.start = 420;
      primary.end = 90;
      primary.duration = 0.12;
      break;
    case 'impulse':
    case 'orbit_impulse':
    case 'burst':
      primary.start = ability.strength < 0 ? 65 : 180;
      primary.end = ability.strength < 0 ? 180 : 45;
      primary.duration = 0.18;
      if (ability.parameters?.momentumScale !== undefined)
        secondary = { ...primary, start: 700, end: 240, gain: 0.04, duration: 0.07, delay: 0 };
      break;
    case 'lock':
      primary.waveform = 'square';
      primary.gain = 0.035;
      primary.duration = 0.08;
      break;
    case 'vector_turn':
    case 'steer':
      primary.start = 300;
      primary.end = 620;
      primary.duration = 0.16;
      secondary = { ...primary, start: 620, end: 300, gain: 0.04, delay: 0.05 };
      break;
    case 'field':
      if (ability.mode === 'zero') {
        primary.waveform = 'sine';
        primary.duration = 0.5;
      } else if (ability.parameters?.travelSpeed) {
        primary.start = 90;
        primary.end = 480;
        primary.duration = 0.35;
      }
      break;
  }
  return secondary ? [primary, secondary] : [primary];
}
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
