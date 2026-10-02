import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { abilities } from '../src/content/abilities';
import { ModifierSet } from '../src/progression/modifiers';

describe('physical powers', () => {
  for (const definition of abilities)
    it(`${definition.name} casts, spends energy, and remains finite`, () => {
      const game = new Game(false);
      game.world.spawn('heavy', { x: 400, y: 450 });
      game.world.spawn('crate', { x: 460, y: 450 });
      game.world.spawn('projectile', { x: 440, y: 400 });
      game.abilities.learn(definition.id);
      if (definition.effect === 'split') {
        game.abilities.learn('planet');
        game.abilities.cast('planet', { x: 410, y: 450 }, true);
      }
      if (['tether_cut', 'tether_release', 'reanchor'].includes(definition.effect)) {
        game.abilities.learn('skyhook');
        game.abilities.cast('skyhook', { x: 410, y: 450 }, true);
      }
      game.start();
      expect(game.castAbility(definition.id, { x: 410, y: 450 })).toBe(true);
      expect(game.abilities.energy).toBe(100 - definition.energy);
      expect(game.castAbility(definition.id, { x: 410, y: 450 })).toBe(false);
      for (let i = 0; i < 180; i++) game.step();
      for (const entity of game.world.entities.values()) {
        expect(Number.isFinite(entity.body.position.x + entity.body.position.y)).toBe(true);
        expect(Number.isFinite(entity.body.velocity.x + entity.body.velocity.y)).toBe(true);
      }
      game.world.dispose();
    });
  it('restores locked masses and grants resistance to repeated locks', () => {
    const game = new Game(false);
    const target = game.world.spawn('heavy', { x: 500, y: 350 })!;
    const mass = target.body.mass;
    game.abilities.learn('lock');
    game.start();
    game.castAbility('lock', target.body.position);
    expect(target.body.isStatic).toBe(true);
    game.time = 2;
    game.abilities.tick(2);
    expect(target.body.isStatic).toBe(false);
    expect(target.body.mass).toBe(mass);
    game.abilities.cooldowns.clear();
    game.castAbility('lock', target.body.position);
    expect(target.body.isStatic).toBe(false);
  });
  it('a traveling wave moves its spatial influence, launches matter and expires cleanly', () => {
    const game = new Game(false);
    game.gravity.strength = 0;
    const guard = game.world.spawn('anchor', { x: 1040, y: 200 })!;
    guard.invulnerability = 20;
    const rock = game.world.spawn('rock', { x: 520, y: 470 })!;
    game.abilities.learn('wave');
    game.start();
    game.castAbility('wave', { x: 1100, y: 470 });
    const wave = [...game.gravity.fields.values()].find(
      (field) => field.source === 'ability:wave',
    )!;
    const origin = { ...wave.position };
    for (let i = 0; i < 100; i++) game.step();
    expect(wave.position.x).toBeCloseTo(origin.x + (320 * 100) / 120, 4);
    expect(rock.body.position.x).toBeGreaterThan(530);
    expect(game.chains.source(rock.chainId)).toBe('wave');
    // The source has left the origin; its old grid cells must not retain its force.
    game.gravity.removeField(
      [...game.gravity.fields.values()].find((field) => field.source.startsWith('enemy:'))?.id ??
        -1,
    );
    expect(game.gravity.sample(origin).x).toBe(0);
    for (let i = 0; i < 230; i++) game.step();
    expect([...game.gravity.fields.values()].some((field) => field.source === 'ability:wave')).toBe(
      false,
    );
  });
  it('transfers actual velocity between bodies and records one cause', () => {
    const game = new Game(false);
    const a = game.world.spawn('crate', { x: 500, y: 350 })!;
    const b = game.world.spawn('rock', { x: 570, y: 350 })!;
    Matter.Body.setVelocity(a.body, { x: 8, y: -2 });
    Matter.Body.setVelocity(b.body, { x: -1, y: 3 });
    game.abilities.learn('transfer');
    game.start();
    game.castAbility('transfer', a.body.position);
    expect(Matter.Body.getVelocity(b.body)).toEqual({ x: 8, y: -2 });
    expect(Matter.Body.getVelocity(a.body)).toEqual({ x: -1, y: 3 });
    expect(a.chainId).toBe(b.chainId);
  });
  it('targeted powers attribute only bodies they actually manipulate', () => {
    const game = new Game(false);
    const target = game.world.spawn('crate', { x: 500, y: 470 })!;
    const partner = game.world.spawn('rock', { x: 550, y: 470 })!;
    const bystander = game.world.spawn('crate', { x: 590, y: 550 })!;
    game.abilities.learn('transfer');
    game.start();
    game.castAbility('transfer', target.body.position);
    expect(target.chainId).not.toBeNull();
    expect(partner.chainId).toBe(target.chainId);
    expect(bystander.chainId).toBeNull();
    const other = new Game(false);
    const onRay = other.world.spawn('crate', { x: 600, y: 470 })!;
    const offRay = other.world.spawn('crate', { x: 700, y: 570 })!;
    other.abilities.learn('beam');
    other.start();
    other.castAbility('beam', { x: 1000, y: 470 });
    expect(onRay.chainId).not.toBeNull();
    expect(offRay.chainId).toBeNull();
  });
  it('slingshot attributes the moving core rather than untouched nearby bodies', () => {
    const game = new Game(false);
    const nearby = game.world.spawn('crate', { x: 360, y: 470 })!;
    game.abilities.learn('slingshot');
    game.start();
    game.castAbility('slingshot', { x: 600, y: 470 });
    expect(game.chains.source(game.player.chainId)).toBe('slingshot');
    expect(nearby.chainId).toBeNull();
  });
  it('suppresses all field acceleration in zero G while preserving momentum', () => {
    const game = new Game(false);
    game.abilities.learn('zero');
    game.start();
    game.castAbility('zero', { x: 500, y: 350 });
    expect(game.gravity.sample({ x: 520, y: 360 })).toEqual({ x: 0, y: 0 });
    expect(game.gravity.sample({ x: 1000, y: 360 }).y).toBeGreaterThan(0);
  });
  it('unlocks evolution only after mastering its parent', () => {
    const game = new Game(false);
    expect(game.abilities.learn('pulse')).toBe('pulse');
    expect(game.abilities.learn('pulse')).toBe('pulse');
    expect(game.abilities.learn('pulse')).toBe('nova');
    expect(game.abilities.learn('pulse')).toBeNull();
  });
});

it('composes tagged modifiers and rate limits triggers independently', () => {
  const modifiers = new ModifierSet();
  modifiers.add({ id: 'a', stat: 'strength', operation: 'add', value: 2 });
  modifiers.add({ id: 'b', stat: 'strength', operation: 'multiply', value: 3, tags: ['Orbit'] });
  expect(modifiers.evaluate('strength', 4, ['Orbit'])).toBe(18);
  expect(modifiers.evaluate('strength', 4, ['Impact'])).toBe(6);
  modifiers.rules.set('heal', {
    id: 'heal',
    trigger: 'OnKill',
    effect: 'heal',
    value: 2,
    cooldown: 1,
  });
  expect(modifiers.fire('OnKill', 0)).toHaveLength(1);
  expect(modifiers.fire('OnKill', 0.5)).toHaveLength(0);
  expect(modifiers.fire('OnKill', 1)).toHaveLength(1);
});
