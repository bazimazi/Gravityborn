import { performance } from 'node:perf_hooks';
import balance from '../src/data/balance.json';
import arena from '../src/data/arena.json';
import { GravitySystem } from '../src/physics/gravity';
import { PhysicsWorld } from '../src/physics/world';
import { Game } from '../src/gameplay/game';
import { lensPoint, selectLenses } from '../src/presentation/lensing';

for (const [count, sources] of [
  [15, 1],
  [100, 12],
  [220, 50],
]) {
  const gravity = new GravitySystem(balance.gravity.strength, balance.physics.maxAcceleration);
  const world = new PhysicsWorld(gravity);
  for (const wall of arena.walls) world.addWall(wall.x, wall.y, wall.width, wall.height);
  for (let i = 0; i < count; i++)
    world.spawn(i % 3 === 0 ? 'projectile' : 'chaser', {
      x: 90 + (i % 20) * 52,
      y: 90 + Math.floor(i / 20) * 52,
    });
  for (let i = 0; i < sources; i++)
    gravity.addField({
      source: 'stress',
      mode: 'radial',
      position: { x: 150 + (i % 5) * 220, y: 130 + Math.floor(i / 5) * 55 },
      direction: { x: 0, y: 0 },
      strength: 0.002,
      radius: 260,
      falloff: 'linear',
      remaining: 60,
    });
  const times: number[] = [];
  for (let step = 0; step < 1500; step++) {
    if (step % 240 === 0) gravity.setDirection({ x: Math.sin(step), y: Math.cos(step) });
    const start = performance.now();
    world.step();
    if (step > 100) times.push(performance.now() - start);
    for (const entity of world.entities.values()) {
      if (!Number.isFinite(entity.body.position.x + entity.body.position.y + entity.body.speed))
        throw new Error('Non-finite state under stress');
    }
  }
  times.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      bodies: count,
      fields: sources,
      meanMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3),
      p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(3),
      budgetMs: +balance.physics.stepMs.toFixed(3),
    }),
  );
  if (sources === 50) {
    const lenses = selectLenses(gravity.fields.values(), { x: 600, y: 400 });
    const timings: number[] = [];
    for (let frame = 0; frame < 120; frame++) {
      const start = performance.now();
      for (let y = 50; y < 750; y += 20)
        for (let x = 50; x < 1150; x += 20) lensPoint({ x, y }, lenses);
      if (frame >= 20) timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        stage: 'background-lens-math',
        lenses: lenses.length,
        samples: 1925,
        p95Ms: +timings[Math.floor(timings.length * 0.95)].toFixed(3),
      }),
    );
  }
  world.dispose();
}

for (const spacing of [55, 44])
  for (const enabled of [false, true]) {
    const world = new PhysicsWorld(new GravitySystem(0, balance.physics.maxAcceleration));
    if (enabled) world.focus = { x: 0, y: 0 };
    for (let index = 0; index < balance.physics.maxBodies; index++)
      world.spawn('rock', {
        x: 600 + (index % 20) * spacing,
        y: 80 + Math.floor(index / 20) * spacing,
      });
    const timings: number[] = [];
    for (let step = 0; step < 1500; step++) {
      const start = performance.now();
      world.step();
      if (step >= 1000) timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        stage: 'distant-force-free-props',
        dormancy: enabled,
        spacing,
        sleeping: [...world.entities.values()].filter((entity) => entity.body.isSleeping).length,
        p95Ms: +timings[Math.floor(timings.length * 0.95)].toFixed(3),
      }),
    );
    world.dispose();
  }

// Exercise gameplay attribution as well as the solver at both shared budgets.
const saturated = new Game(false);
saturated.player.invulnerability = 1000;
saturated.abilities.learn('vortex');
for (let index = 0; saturated.world.entities.size < balance.physics.maxBodies; index++) {
  const entity = saturated.world.spawn(index % 2 ? 'rock' : 'chaser', {
    x: 90 + (index % 20) * 52,
    y: 90 + Math.floor(index / 20) * 52,
  })!;
  entity.invulnerability = 1000;
}
for (let index = 0; index < balance.physics.maxFields; index++)
  saturated.abilities.cast(
    'vortex',
    { x: 180 + (index % 5) * 210, y: 150 + Math.floor(index / 5) * 50 },
    true,
  );
saturated.start();
saturated.abilities.learn('constellation');
for (let index = 0; index < 4; index++)
  if (!saturated.abilities.cast('constellation', { x: 600, y: 400 }, true))
    throw new Error('Could not populate tether stress case');
const fullTimings: number[] = [];
for (let step = 0; step < 480; step++) {
  const start = performance.now();
  saturated.step();
  if (step >= 100) fullTimings.push(performance.now() - start);
}
fullTimings.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    stage: 'full-gameplay-field-attribution',
    bodies: saturated.world.entities.size,
    fields: saturated.gravity.fields.size,
    tethers: saturated.abilities.tethers.length,
    p95Ms: +fullTimings[Math.floor(fullTimings.length * 0.95)].toFixed(3),
    budgetMs: +balance.physics.stepMs.toFixed(3),
  }),
);
saturated.world.dispose();

// A repeatable input-only playthrough confirms that the authored arena is winnable.
const game = new Game();
game.start();
const directions = [
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
];
for (let step = 0; step < 120 * 90 && game.state === 'playing'; step++) {
  if (step % 180 === 0) game.flip(directions[Math.floor(step / 180) % 4]);
  if (step % 720 === 0) {
    const target = [...game.world.entities.values()].find(
      (entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile',
    );
    if (target) game.createWell(target.body.position);
  }
  game.move = { x: Math.sin(step / 180), y: Math.cos(step / 180) };
  game.step();
}
console.log(
  JSON.stringify({
    playthrough: game.state,
    seconds: +game.time.toFixed(2),
    health: +game.player.health.toFixed(1),
    bestChain: game.chains.best,
    ...game.stats,
  }),
);
game.world.dispose();
