import type { EventBus } from '../core/events';
import type { Vec2 } from '../core/vector';
import balance from '../data/balance.json';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
export interface Ring {
  position: Vec2;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}
export interface Label {
  position: Vec2;
  text: string;
  life: number;
  color: string;
}

export class Feedback {
  readonly particles: Particle[] = [];
  readonly rings: Ring[] = [];
  readonly labels: Label[] = [];
  private readonly pool: Particle[] = [];
  shake = 0;
  constructor(events: EventBus) {
    for (let i = 0; i < balance.presentation.maxParticles; i++)
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '', size: 0 });
    events.on('impact', (event) => {
      this.burst(
        event.position,
        event.color,
        Math.min(14, Math.floor(event.force)),
        event.force * 12,
      );
      this.shake = Math.max(this.shake, Math.min(balance.presentation.shake, event.force * 0.18));
    });
    events.on('explosion', (event) => {
      this.burst(event.position, '#ffb978', 30, 210);
      this.ring(event.position, event.radius, '#ffb978');
      this.shake = balance.presentation.shake;
    });
    events.on('wellCreated', (event) => {
      this.ring(event.position, 70, '#b5a0ff');
    });
    events.on('abilityUsed', (event) => {
      this.ring(event.position, 160, '#80e6d1');
      this.burst(event.position, '#b5a0ff', 12, 110);
    });
    events.on('killed', (event) => {
      this.burst(event.position, event.kind === 'barrel' ? '#ffb978' : '#f9adc0', 18, 110);
      if (event.chainLength > 1)
        this.label(event.position, `${event.chainLength}× CHAIN`, '#c9baff');
    });
    events.on('damaged', (event) => {
      this.label(
        event.position,
        `${Math.ceil(event.amount)}`,
        event.player ? '#ffa6b7' : '#edf4fa',
      );
      if (event.player) this.shake = Math.max(this.shake, 3);
    });
  }

  private label(position: Vec2, text: string, color: string): void {
    const nearby = this.labels.filter(
      (label) => Math.hypot(label.position.x - position.x, label.position.y - position.y) < 45,
    ).length;
    if (this.labels.length < 20)
      this.labels.push({
        position: { x: position.x, y: position.y - nearby * 17 },
        text,
        color,
        life: 0.8,
      });
  }
  private ring(position: Vec2, radius: number, color: string): void {
    if (this.rings.length < 20)
      this.rings.push({ position: { ...position }, radius, color, life: 0.5, maxLife: 0.5 });
  }
  private burst(position: Vec2, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.pool.pop();
      if (!particle) break;
      const angle = Math.random() * Math.PI * 2;
      Object.assign(particle, {
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.4,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
      particle.maxLife = particle.life;
      this.particles.push(particle);
    }
  }
  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 15);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.pool.push(particle);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      } else {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.exp(-dt * 3);
        particle.vy *= Math.exp(-dt * 3);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--)
      if ((this.rings[i].life -= dt) <= 0) this.rings.splice(i, 1);
    for (let i = this.labels.length - 1; i >= 0; i--) {
      this.labels[i].life -= dt;
      this.labels[i].position.y -= dt * 25;
      if (this.labels[i].life <= 0) this.labels.splice(i, 1);
    }
  }
  clear(): void {
    this.pool.push(...this.particles);
    this.particles.length = 0;
    this.rings.length = 0;
    this.labels.length = 0;
    this.shake = 0;
  }
}
