import type { EventBus } from '../core/events';
import type { Settings } from '../core/settings';

/** Local synthesized sounds: no downloads, licenses, or network at runtime. */
export class GameAudio {
  private context: AudioContext | undefined;
  private voices = 0;
  private lastImpact = 0;
  constructor(
    events: EventBus,
    private readonly settings: Settings,
  ) {
    events.on('gravityChanged', () => this.tone(320, 95, 0.22, 'sine', 0.15));
    events.on('wellCreated', () => this.tone(90, 220, 0.5, 'sine', 0.2));
    events.on('collected', () => this.tone(500, 800, 0.08, 'sine', 0.035));
    events.on('abilityUsed', () => this.tone(180, 420, 0.2, 'triangle', 0.12));
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

  private tone(
    start: number,
    end: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    if (
      !this.context ||
      this.context.state !== 'running' ||
      this.settings.volume <= 0 ||
      this.voices >= 12
    )
      return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(end, context.currentTime + duration);
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.linearRampToValueAtTime(gain * this.settings.volume, context.currentTime + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(envelope).connect(context.destination);
    this.voices++;
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }
}
