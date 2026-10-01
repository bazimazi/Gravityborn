import type { EventBus } from '../core/events';
import type { Settings } from '../core/settings';
import { abilitySound } from '../content/ability-feedback';

export type MusicState =
  | 'off'
  | 'exploration'
  | 'combat'
  | 'danger'
  | 'elite'
  | 'boss'
  | 'critical'
  | 'victory';
const arrangements: Record<
  Exclude<MusicState, 'off'>,
  { beat: number; notes: number[]; bass: number; gain: number }
> = {
  exploration: { beat: 0.8, notes: [62, 69, 65, 72, 69, 65, 74, 69], bass: 38, gain: 0.06 },
  combat: { beat: 0.4, notes: [62, 65, 69, 74, 69, 65, 72, 69], bass: 38, gain: 0.08 },
  danger: { beat: 0.3, notes: [62, 63, 69, 70, 65, 63, 69, 74], bass: 38, gain: 0.085 },
  elite: { beat: 0.35, notes: [60, 67, 63, 70, 72, 67, 63, 67], bass: 36, gain: 0.08 },
  boss: { beat: 0.28, notes: [50, 57, 62, 63, 69, 63, 62, 57], bass: 26, gain: 0.085 },
  critical: { beat: 0.5, notes: [62, 0, 63, 0, 62, 0, 57, 0], bass: 38, gain: 0.065 },
  victory: { beat: 0.55, notes: [62, 66, 69, 74, 78, 74, 69, 66], bass: 38, gain: 0.08 },
};

/** Local synthesized sounds: no downloads, licenses, or network at runtime. */
export class GameAudio {
  private context: AudioContext | undefined;
  private voices = 0;
  private lastImpact = 0;
  private musicState: MusicState = 'off';
  private nextBeat = 0;
  private beat = 0;
  private readonly musicVoices = new Set<OscillatorNode>();
  constructor(
    events: EventBus,
    private readonly settings: Settings,
  ) {
    events.on('gravityChanged', () => this.tone(320, 95, 0.22, 'sine', 0.15));
    events.on('wellCreated', () => this.tone(90, 220, 0.5, 'sine', 0.2));
    events.on('collected', () => this.tone(500, 800, 0.08, 'sine', 0.035));
    events.on('abilityUsed', (event) => {
      for (const layer of abilitySound(event.id))
        this.tone(
          layer.start,
          layer.end,
          layer.duration,
          layer.waveform,
          layer.gain,
          false,
          layer.delay,
        );
    });
    events.on('explosion', () => this.tone(130, 25, 0.35, 'sawtooth', 0.18));
    events.on('killed', () => this.tone(260, 80, 0.1, 'triangle', 0.12));
    events.on('damaged', (event) => {
      if (event.player) this.tone(140, 65, 0.18, 'square', 0.07);
    });
    events.on('impact', (event) => {
      const now = this.context?.currentTime ?? 0;
      if (now - this.lastImpact > 0.075) {
        this.lastImpact = now;
        this.tone(80 + event.force * 10, 40, 0.08, 'triangle', Math.min(0.15, event.force * 0.008));
      }
    });
    events.on('ended', (event) => {
      this.tone(event.won ? 300 : 180, event.won ? 600 : 45, 0.7, 'sine', 0.18);
    });
  }

  async unlock(): Promise<void> {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      /* Audio unavailable: play silently. */
    }
  }

  cue(kind: 'level' | 'relic' | 'boss'): void {
    const notes = { level: [440, 880], relic: [520, 1040], boss: [100, 40] }[kind];
    this.tone(notes[0], notes[1], 0.5, 'triangle', 0.12);
  }

  soundtrack(state: MusicState, anomaly = false): void {
    if (state !== this.musicState) {
      this.musicState = state;
      this.beat = 0;
      this.nextBeat = 0;
    }
    if (state === 'off' || this.settings.musicVolume === 0) {
      for (const voice of this.musicVoices) {
        try {
          voice.stop();
        } catch {
          /* Already ended. */
        }
      }
      this.musicVoices.clear();
      return;
    }
    if (
      !this.context ||
      this.context.state !== 'running' ||
      this.context.currentTime < this.nextBeat
    )
      return;
    const arrangement = arrangements[state];
    const note = arrangement.notes[this.beat % arrangement.notes.length];
    const frequency = (pitch: number) => 440 * 2 ** ((pitch - 69 + (anomaly ? -1 : 0)) / 12);
    if (note)
      this.tone(
        frequency(note),
        frequency(note + (anomaly ? 0.3 : 0)),
        arrangement.beat * 1.6,
        'sine',
        arrangement.gain,
        true,
      );
    if (this.beat % 4 === 0)
      this.tone(
        frequency(arrangement.bass),
        frequency(arrangement.bass),
        arrangement.beat * 3.5,
        'triangle',
        arrangement.gain * 0.8,
        true,
      );
    this.beat++;
    this.nextBeat = this.context.currentTime + arrangement.beat;
  }

  private tone(
    start: number,
    end: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    music = false,
    delay = 0,
  ): void {
    if (
      !this.context ||
      this.context.state !== 'running' ||
      (music ? this.settings.musicVolume : this.settings.volume) <= 0 ||
      this.voices >= 12
    )
      return;
    const context = this.context;
    const when = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, when);
    oscillator.frequency.exponentialRampToValueAtTime(end, when + duration);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(
      gain * (music ? this.settings.musicVolume : this.settings.volume),
      when + (music ? 0.04 : 0.008),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope).connect(context.destination);
    this.voices++;
    if (music) this.musicVoices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices--;
      this.musicVoices.delete(oscillator);
    };
    oscillator.start(when);
    oscillator.stop(when + duration);
  }
}
