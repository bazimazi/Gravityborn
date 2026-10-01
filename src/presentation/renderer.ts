import type { Settings } from '../core/settings';
import type { Vec2 } from '../core/vector';
import { biomes } from '../content/rooms';
import balance from '../data/balance.json';
import type { Game } from '../gameplay/game';
import type { Entity } from '../physics/world';
import type { Feedback } from './feedback';
import { computeCamera } from './camera';
import { enemyGlyphs, type SpecialEnemy } from '../content/enemies';
import { bossDefinitions } from '../content/bosses';
import { objectDefinitions } from '../content/objects';
import { abilityFeedback } from '../content/ability-feedback';
import { coreCosmetics } from '../content/cosmetics';

export class Renderer {
  cosmetic: (typeof coreCosmetics)[number] = coreCosmetics[0];
  private readonly context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private scale = 1;
  private offset: Vec2 = { x: 0, y: 0 };
  private readonly trails = new Map<number, Vec2[]>();
  debug = false;
  aim: Vec2 | null = null;
  tutorialTarget: Vec2 | null = null;
  ghost: Vec2 | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly settings: Settings,
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Your browser does not support Canvas 2D.');
    this.context = context;
  }

  toWorld(clientX: number, clientY: number): Vec2 {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - bounds.left - this.offset.x) / this.scale,
      y: (clientY - bounds.top - this.offset.y) / this.scale,
    };
  }

  clear(): void {
    this.trails.clear();
  }

  draw(game: Game, feedback: Feedback, now: number): void {
    if (this.settings.reducedMotion || this.settings.reducedFlashing) now = 0;
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      this.settings.lowQuality ? 1 : balance.presentation.maxPixelRatio,
    );
    const pixelWidth = Math.round(this.width * pixelRatio);
    const pixelHeight = Math.round(this.height * pixelRatio);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const ctx = this.context;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const backdrop = ctx.createLinearGradient(0, 0, this.width, this.height);
    backdrop.addColorStop(0, '#0c1727');
    backdrop.addColorStop(1, '#090f1b');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, this.width, this.height);

    const camera = computeCamera(
      { x: this.width, y: this.height },
      { x: game.room.width, y: game.room.height },
      game.player.body.position,
    );
    this.scale = camera.scale;
    this.offset = camera.offset;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.scale(this.scale, this.scale);
    if (!this.settings.reducedMotion && feedback.shake > 0)
      ctx.translate(Math.sin(now * 0.07) * feedback.shake, Math.cos(now * 0.09) * feedback.shake);
    this.drawArena(game, now);
    if (this.ghost) {
      ctx.save();
      ctx.strokeStyle = this.settings.highContrast ? '#ffffff' : '#a5b8e8';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      this.circle(this.ghost.x, this.ghost.y, 25);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GHOST', this.ghost.x, this.ghost.y - 34);
      ctx.restore();
    }
    if (this.tutorialTarget) {
      ctx.strokeStyle = '#94e8d8';
      ctx.fillStyle = '#94e8d8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      this.circle(this.tutorialTarget.x, this.tutorialTarget.y, 60);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REACH HERE', this.tutorialTarget.x, this.tutorialTarget.y - 78);
    }
    if (game.nextWaveAt !== undefined) {
      ctx.strokeStyle = '#f4a994';
      ctx.fillStyle = '#f4a994';
      ctx.lineWidth = 2;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      for (const spawn of game.waveSpawns) {
        this.circle(spawn.x, spawn.y, 34 + Math.sin(now * 0.015) * 4);
        ctx.stroke();
        ctx.fillText('INCOMING', spawn.x, spawn.y - 43);
      }
    }
    const boss = game.bosses.active;
    if (boss) {
      ctx.fillStyle = '#171421';
      ctx.fillRect(350, 100, 500, 14);
      ctx.fillStyle = boss.entity.definition.color;
      ctx.fillRect(350, 100, (500 * boss.entity.health) / boss.entity.maxHealth, 14);
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${boss.name.toUpperCase()} · PHASE ${boss.phase}`, 600, 90);
      if (boss.telegraph > 0) {
        ctx.strokeStyle = '#ffdca4';
        ctx.lineWidth = 3;
        this.circle(
          boss.entity.body.position.x,
          boss.entity.body.position.y,
          60 + boss.telegraph * 25,
        );
        ctx.stroke();
        if (boss.aim && ['comet', 'weaver'].includes(boss.entity.kind)) {
          ctx.setLineDash([8, 8]);
          this.line(
            boss.entity.body.position.x,
            boss.entity.body.position.y,
            boss.aim.x,
            boss.aim.y,
          );
          ctx.setLineDash([]);
          this.circle(boss.aim.x, boss.aim.y, 40);
          ctx.stroke();
          ctx.fillStyle = '#ffe3b5';
          ctx.fillText(
            boss.entity.kind === 'comet' ? 'DASH PATH' : 'VOID WEAVE',
            boss.aim.x,
            boss.aim.y - 50,
          );
        }
      }
    }
    for (const field of game.gravity.fields.values()) {
      const opacity = Math.min(1, field.remaining);
      ctx.save();
      ctx.translate(field.position.x, field.position.y);
      ctx.globalAlpha = opacity;
      const color = field.source.startsWith('ability:')
        ? abilityFeedback(field.source.slice(8)).color
        : field.mode === 'zero'
          ? '#a8deff'
          : '#b5a0ff';
      const gradient = ctx.createRadialGradient(0, 0, 8, 0, 0, field.radius);
      gradient.addColorStop(0, `${color}35`);
      gradient.addColorStop(0.55, `${color}13`);
      gradient.addColorStop(1, `${color}00`);
      ctx.fillStyle = gradient;
      this.circle(0, 0, field.radius);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `${color}90`;
      ctx.setLineDash([4, 12]);
      this.circle(0, 0, field.radius);
      ctx.stroke();
      ctx.setLineDash([]);
      if (field.mode === 'directional') {
        ctx.save();
        ctx.rotate(
          Math.atan2(field.direction.y, field.direction.x) + (field.strength < 0 ? Math.PI : 0),
        );
        ctx.lineWidth = 3;
        for (const offset of [-0.5, 0, 0.5]) {
          const x = field.radius * offset;
          ctx.beginPath();
          ctx.moveTo(x - 14, -22);
          ctx.lineTo(x + 8, 0);
          ctx.lineTo(x - 14, 22);
          ctx.stroke();
        }
        ctx.restore();
      } else if (field.mode !== 'zero') {
        for (let i = 0; i < 5; i++) {
          ctx.globalAlpha = opacity * (0.8 - i * 0.12);
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            field.radius * (0.18 + i * 0.14),
            now * 0.001 + i * 1.6,
            now * 0.001 + i * 1.6 + 2.6,
          );
          ctx.stroke();
        }
      }
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#101021';
      this.circle(0, 0, 13);
      ctx.fill();
      ctx.strokeStyle = '#d3b9ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        field.mode === 'zero'
          ? '0'
          : field.mode === 'vortex'
            ? '↻'
            : field.mode === 'directional'
              ? Math.abs(field.direction.x) > Math.abs(field.direction.y)
                ? field.direction.x * field.strength < 0
                  ? '←'
                  : '→'
                : field.direction.y * field.strength < 0
                  ? '↑'
                  : '↓'
              : field.strength < 0
                ? '−'
                : '+',
        0,
        0,
      );
      ctx.restore();
    }
    for (const id of this.trails.keys()) if (!game.world.entities.has(id)) this.trails.delete(id);
    for (const entity of game.world.entities.values()) this.drawEntity(entity, game, now, feedback);
    if (this.debug) {
      ctx.strokeStyle = '#ff8aa5';
      ctx.lineWidth = 2;
      for (const collision of game.world.collisions)
        this.line(
          collision.position.x,
          collision.position.y,
          collision.position.x + collision.normal.x * 35,
          collision.position.y + collision.normal.y * 35,
        );
      ctx.fillStyle = '#e5eaf0';
      ctx.font = '11px monospace';
      for (const field of game.gravity.fields.values())
        ctx.fillText(
          `${field.source} · ${field.mode} · ${field.strength.toFixed(4)}`,
          field.position.x,
          field.position.y - 22,
        );
    }
    for (const arc of feedback.arcs) {
      ctx.strokeStyle = '#a8deff';
      ctx.lineWidth = this.settings.highContrast ? 3 : 2;
      ctx.globalAlpha = this.settings.reducedFlashing ? 0.5 : Math.min(1, arc.life * 4);
      this.line(arc.from.x, arc.from.y, arc.to.x, arc.to.y);
    }
    ctx.globalAlpha = 1;
    for (const particle of this.settings.reducedFlashing ? [] : feedback.particles) {
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    for (const ring of feedback.rings) {
      ctx.globalAlpha = (ring.life / ring.maxLife) * (this.settings.reducedFlashing ? 0.25 : 1);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2;
      this.circle(ring.position.x, ring.position.y, ring.radius * (1 - ring.life / ring.maxLife));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = '600 14px ui-monospace, monospace';
    for (const label of feedback.labels) {
      ctx.globalAlpha = Math.min(1, label.life * 2);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.position.x, label.position.y - 22);
    }
    ctx.globalAlpha = 1;
    if (this.aim && game.state === 'playing') {
      ctx.strokeStyle = game.wellCooldown > 0 ? '#8093a1' : '#bca6ff';
      ctx.lineWidth = 1;
      this.circle(this.aim.x, this.aim.y, 13);
      ctx.stroke();
      this.line(this.aim.x - 20, this.aim.y, this.aim.x - 9, this.aim.y);
      this.line(this.aim.x + 9, this.aim.y, this.aim.x + 20, this.aim.y);
      this.line(this.aim.x, this.aim.y - 20, this.aim.x, this.aim.y - 9);
      this.line(this.aim.x, this.aim.y + 9, this.aim.x, this.aim.y + 20);
    }
    ctx.restore();
  }

  private drawArena(game: Game, now: number): void {
    const ctx = this.context;
    const arena = game.room;
    ctx.fillStyle = biomes[arena.biome].color;
    ctx.fillRect(50, 50, arena.width - 100, arena.height - 100);
    ctx.strokeStyle = '#8db0d008';
    ctx.lineWidth = 1;
    for (let x = 60; x < arena.width; x += 40) this.line(x, 50, x, arena.height - 50);
    for (let y = 60; y < arena.height; y += 40) this.line(50, y, arena.width - 50, y);
    const g = game.gravity.direction;
    const drift = this.settings.reducedMotion ? 0 : now * 0.018;
    for (let i = 0; i < 48; i++) {
      const x = 55 + ((((i * 137.37 + g.x * drift) % 1090) + 1090) % 1090);
      const y = 55 + ((((i * 83.21 + g.y * drift) % 690) + 690) % 690);
      ctx.strokeStyle = '#8fdcde20';
      this.line(x, y, x + g.x * 9, y + g.y * 9);
    }
    ctx.save();
    ctx.strokeStyle = '#58748c12';
    ctx.lineWidth = 1;
    this.circle(600, 400, 180);
    ctx.stroke();
    this.circle(600, 400, 192);
    ctx.stroke();
    this.line(380, 400, 820, 400);
    this.line(600, 180, 600, 620);
    ctx.restore();
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#748a9b62';
    ctx.fillText('G / 01      GRAVITATIONAL RESEARCH DIVISION', 82, 89);
    ctx.fillText('CAUTION — UNSTABLE MASS', 803, 720);
    ctx.font = '600 48px ui-monospace, monospace';
    ctx.fillStyle = '#8cb0c409';
    ctx.fillText('THE WEIGHT', 425, 423);
    for (const [index, hazard] of arena.hazards.entries()) {
      const active = game.environment.hazardActive(index);
      ctx.fillStyle = hazard.kind === 'wind' ? '#80d9f020' : active ? '#ff82616a' : '#ff826118';
      ctx.fillRect(
        hazard.x - hazard.width / 2,
        hazard.y - hazard.height / 2,
        hazard.width,
        hazard.height,
      );
      ctx.strokeStyle = hazard.kind === 'wind' ? '#80d9f0' : '#ff8261';
      ctx.strokeRect(
        hazard.x - hazard.width / 2,
        hazard.y - hazard.height / 2,
        hazard.width,
        hazard.height,
      );
      ctx.font = '12px monospace';
      ctx.fillStyle = '#f9ddcb';
      ctx.fillText(hazard.kind.toUpperCase(), hazard.x - hazard.width / 2 + 6, hazard.y - 8);
    }
    if (arena.puzzle) {
      ctx.strokeStyle = game.environment.switchActive ? '#8cf2e3' : '#eabb7d';
      ctx.lineWidth = 3;
      this.circle(arena.puzzle.switch.x, arena.puzzle.switch.y, 40);
      ctx.stroke();
      ctx.font = '12px monospace';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText('MASS SWITCH', arena.puzzle.switch.x - 40, arena.puzzle.switch.y - 48);
      ctx.strokeRect(arena.puzzle.exit.x - 35, arena.puzzle.exit.y - 35, 70, 70);
      ctx.fillText(
        game.environment.switchActive ? 'EXIT OPEN' : 'EXIT LOCKED',
        arena.puzzle.exit.x - 40,
        arena.puzzle.exit.y - 48,
      );
    }
    for (const wall of game.world.walls) {
      const x = wall.bounds.min.x;
      const y = wall.bounds.min.y;
      const width = wall.bounds.max.x - x;
      const height = wall.bounds.max.y - y;
      if (Math.abs(wall.angle % Math.PI) > 0.01) {
        ctx.beginPath();
        wall.vertices.forEach((vertex, index) =>
          index ? ctx.lineTo(vertex.x, vertex.y) : ctx.moveTo(vertex.x, vertex.y),
        );
        ctx.closePath();
        ctx.fillStyle = '#142336';
        ctx.strokeStyle = '#87bdd3';
        ctx.fill();
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#142336';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#33485e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.strokeStyle = '#87bdd344';
      this.line(x + 5, y + 1, x + width - 5, y + 1);
      if (width < 400 && height < 300) {
        ctx.fillStyle = '#08121f';
        ctx.fillRect(x + 7, y + 7, width - 14, height - 14);
        ctx.strokeStyle = '#d3b27755';
        for (let stripe = 0; stripe < 4; stripe++)
          this.line(x + 12 + stripe * 7, y + 5, x + 5 + stripe * 7, y + height - 5);
        ctx.fillStyle = '#78d8ce';
        ctx.fillRect(x + width - 13, y + height / 2 - 2, 5, 4);
      }
    }
    ctx.strokeStyle = '#88dcdb';
    ctx.lineWidth = 2;
    for (const [x, y, signX, signY] of [
      [58, 58, 1, 1],
      [1142, 58, -1, 1],
      [58, 742, 1, -1],
      [1142, 742, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + signY * 16);
      ctx.lineTo(x, y);
      ctx.lineTo(x + signX * 16, y);
      ctx.stroke();
    }
  }

  private drawEntity(entity: Entity, game: Game, now: number, feedback: Feedback): void {
    const ctx = this.context;
    const { x, y } = entity.body.position;
    const radius = entity.definition.radius;
    const color = entity.redirected
      ? '#adf4ec'
      : this.settings.highContrast
        ? entity.kind === 'player'
          ? '#80ffff'
          : entity.definition.faction === 'enemy'
            ? '#ffda66'
            : '#ffffff'
        : entity.kind === 'player'
          ? this.cosmetic.color
          : entity.definition.color;
    if (entity.kind === 'projectile' || entity.kind === 'player' || entity.body.speed > 5) {
      const trail = this.trails.get(entity.id) ?? [];
      if (game.state === 'playing') {
        trail.push({ x, y });
        if (trail.length > 9) trail.shift();
      }
      this.trails.set(entity.id, trail);
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        ctx.globalAlpha = (i / trail.length) * 0.18;
        ctx.strokeStyle = color;
        ctx.lineWidth = radius * (i / trail.length) * 0.65;
        this.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    if (!this.settings.reducedMotion && !this.debug && !entity.body.isStatic) {
      const reaction = feedback.reactions.get(entity.id);
      const motion = Math.min(0.12, entity.body.speed * 0.008);
      const angle = reaction
        ? Math.atan2(reaction.normal.y, reaction.normal.x)
        : Math.atan2(entity.body.velocity.y, entity.body.velocity.x);
      const squash = reaction
        ? reaction.strength *
          Math.sin((Math.PI * reaction.life) / balance.presentation.reactionDuration)
        : -motion;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(1 - squash, 1 / (1 - squash));
      ctx.rotate(-angle);
      ctx.translate(-x, -y);
    }
    if (
      entity.kind === 'player' ||
      entity.kind === 'projectile' ||
      entity.kind === 'xp' ||
      entity.kind === 'shard'
    ) {
      if (!this.settings.lowQuality) {
        ctx.shadowBlur = entity.kind === 'player' ? 24 : 10;
        ctx.shadowColor = color;
      }
      ctx.fillStyle = color;
      this.circle(x, y, radius * 0.78);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eafffc';
      this.circle(x - radius * 0.17, y - radius * 0.17, radius * 0.32);
      ctx.fill();
      if (entity.kind === 'player') {
        if (this.cosmetic.sides > 0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= this.cosmetic.sides; i++) {
            const angle = (i * Math.PI * 2) / this.cosmetic.sides - Math.PI / 2;
            const px = x + Math.cos(angle) * (radius + 8);
            const py = y + Math.sin(angle) * (radius + 8);
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
        for (let i = 0; i < this.cosmetic.satellites; i++) {
          const angle = (i * Math.PI * 2) / this.cosmetic.satellites + now * 0.0007;
          ctx.fillStyle = color;
          this.circle(x + Math.cos(angle) * (radius + 12), y + Math.sin(angle) * (radius + 12), 3);
          ctx.fill();
        }
        const pulse =
          this.settings.reducedMotion || this.settings.reducedFlashing
            ? 0
            : Math.sin(Math.PI * Math.max(feedback.gravityTurn / 0.3, feedback.activation / 0.25)) *
              7;
        ctx.strokeStyle = '#98f2e8';
        ctx.lineWidth = 1.5;
        this.circle(x, y, radius + 5 + pulse);
        ctx.stroke();
        ctx.strokeStyle = '#98f2e860';
        this.circle(x, y, radius + 10 + pulse);
        ctx.stroke();
        const g = game.gravity.direction;
        ctx.fillStyle = '#bffff7';
        ctx.beginPath();
        ctx.moveTo(x + g.x * 34, y + g.y * 34);
        ctx.lineTo(x + g.x * 25 - g.y * 5, y + g.y * 25 + g.x * 5);
        ctx.lineTo(x + g.x * 25 + g.y * 5, y + g.y * 25 - g.x * 5);
        ctx.closePath();
        ctx.fill();
        if (entity.invulnerability > 0) {
          ctx.strokeStyle = '#fff5';
          this.circle(x, y, 33);
          ctx.stroke();
        }
      }
    } else {
      ctx.beginPath();
      entity.body.vertices.forEach((vertex, index) =>
        index ? ctx.lineTo(vertex.x, vertex.y) : ctx.moveTo(vertex.x, vertex.y),
      );
      ctx.closePath();
      ctx.fillStyle = `${color}20`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.7;
      ctx.fill();
      ctx.stroke();
      ctx.translate(x, y);
      ctx.rotate(entity.body.angle);
      if (entity.kind === 'chaser') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(9, 8);
        ctx.lineTo(0, 3);
        ctx.lineTo(-9, 8);
        ctx.closePath();
        ctx.fill();
      } else if (entity.kind === 'shooter') {
        ctx.strokeRect(-7, -7, 14, 14);
        this.line(-26, 0, -14, 0);
        this.line(14, 0, 26, 0);
        this.line(0, -26, 0, -14);
        this.line(0, 14, 0, 26);
        if (entity.shotTimer < balance.enemies.telegraph) {
          ctx.strokeStyle = '#ffe3b5';
          ctx.lineWidth = 2;
          this.circle(0, 0, 25 + Math.sin(now * 0.025) * 2);
          ctx.stroke();
        }
      } else if (entity.kind === 'heavy') {
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.fillStyle = color;
        ctx.fillRect(-5, -5, 10, 10);
      } else if (entity.kind in objectDefinitions) {
        ctx.font = 'bold 17px monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          (
            {
              crystal: '◇',
              mine: '!',
              generator: 'G',
              gravity_core: '◎',
              metal_plate: '=',
              container: '!!',
              energy_cell: '+',
              fragment: '◌',
              rubber: 'R',
              ice: '❄',
              void_matter: 'V',
              magnet: 'M',
              rift_seal: '⋈',
            } as Record<string, string>
          )[entity.kind] ?? '•',
          0,
          0,
        );
      } else if (entity.kind in bossDefinitions) {
        ctx.lineWidth = 3;
        this.circle(0, 0, 20);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          this.line(0, -15, 0, -35);
        }
      } else if (entity.kind in enemyGlyphs) {
        ctx.fillStyle = color;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemyGlyphs[entity.kind as SpecialEnemy], 0, 0);
        if ((entity.telegraph ?? 0) > 0) {
          ctx.globalAlpha = entity.telegraph!;
          this.circle(0, 0, radius + 7);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (entity.kind === 'barrel') {
        ctx.fillStyle = `${color}45`;
        ctx.fillRect(-12, -16, 24, 6);
        ctx.fillRect(-12, 10, 24, 6);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(7, 6);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(-1, -2, 2, 4);
      } else if (entity.kind === 'crate') {
        this.line(-13, -13, 13, 13);
        this.line(-13, 13, 13, -13);
        ctx.strokeRect(-14, -14, 28, 28);
      } else {
        this.line(-10, -14, 6, -3);
        this.line(6, -3, 15, 9);
        this.line(6, -3, -9, 13);
      }
    }
    ctx.restore();
    if (entity.kind === 'rift_seal') {
      ctx.fillStyle = '#d9c3ff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FRACTURED SEAL', x, y - radius - 14);
    }
    if (game.materials.isBurning(entity)) {
      ctx.strokeStyle = '#ffb978';
      ctx.lineWidth = 2;
      this.circle(x, y, radius + 8);
      ctx.stroke();
      ctx.fillStyle = '#ffb978';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FIRE', x, y + radius + 22);
    }
    if (entity.elite) {
      ctx.strokeStyle = '#ffe08c';
      ctx.lineWidth = 2;
      this.circle(x, y, radius + 5);
      ctx.stroke();
      ctx.fillStyle = '#ffe08c';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(entity.elite.toUpperCase(), x, y - radius - 16);
    }
    if (
      entity.definition.faction === 'enemy' &&
      entity.kind !== 'projectile' &&
      entity.health < entity.maxHealth
    ) {
      ctx.fillStyle = '#121a28';
      ctx.fillRect(x - 19, y - radius - 12, 38, 3);
      ctx.fillStyle = color;
      ctx.fillRect(x - 19, y - radius - 12, (38 * entity.health) / entity.maxHealth, 3);
    }
    if (this.debug) {
      ctx.strokeStyle = '#80e4ad';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        entity.body.bounds.min.x,
        entity.body.bounds.min.y,
        entity.body.bounds.max.x - entity.body.bounds.min.x,
        entity.body.bounds.max.y - entity.body.bounds.min.y,
      );
      ctx.strokeStyle = '#ffc96b';
      this.line(x, y, x + entity.body.velocity.x * 7, y + entity.body.velocity.y * 7);
      const acceleration = game.gravity.sample(
        entity.body.position,
        entity.definition.gravityResponse * entity.gravityScale,
        [entity.definition.material, ...entity.definition.tags],
      );
      ctx.strokeStyle = '#b599ff';
      this.line(x, y, x + acceleration.x * 8000, y + acceleration.y * 8000);
      ctx.fillStyle = '#e5eaf0';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `m ${entity.body.mass.toFixed(1)} · c ${entity.chainId ?? '—'}`,
        x,
        y + radius + 16,
      );
    }
  }

  private circle(x: number, y: number, radius: number): void {
    this.context.beginPath();
    this.context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  }
  private line(x1: number, y1: number, x2: number, y2: number): void {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  }
}
