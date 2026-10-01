import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { normalize, subtract } from '../src/core/vector';
const results = [];
for (let seed = 0; seed < 12; seed++) {
  const game = new Game(false);
  const run = new Expedition(game);
  run.start(`input-playtest-${seed}`, 'manipulator', undefined, 0, { mode: 'quick' });
  let steps = 0;
  let timeout = false;
  while (run.phase !== 'summary' && steps < 120 * 360) {
    if (run.build.pending) {
      run.build.offer();
      const choice =
        run.build.choices.find((choice) =>
          ['collapse', 'pulse', 'repair', 'aegis', 'newton'].includes(choice.target),
        ) ?? run.build.choices[0];
      run.build.choose(choice.id);
    }
    if (run.phase === 'map') {
      const node =
        run.available.find((node) => ['rest', 'treasure', 'shop'].includes(node.type)) ??
        run.available.find((node) => node.type !== 'puzzle') ??
        run.available[0];
      run.enter(node.id);
      continue;
    }
    if (run.phase === 'reward') {
      run.advance();
      continue;
    }
    if (run.phase === 'event') {
      run.resolveEvent('leave');
      continue;
    }
    if (run.phase === 'shop') {
      const item = run.shop.find((item) => !item.sold && item.price <= run.build.currency);
      if (item) run.buy(item.id);
      run.leaveShop();
      continue;
    }
    const position = game.player.body.position;
    const enemy = [...game.world.entities.values()]
      .filter((entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile')
      .sort(
        (a, b) =>
          Math.hypot(a.body.position.x - position.x, a.body.position.y - position.y) -
          Math.hypot(b.body.position.x - position.x, b.body.position.y - position.y),
      )[0];
    const center = normalize(
      subtract(
        { x: 600 + Math.sin(game.time) * 180, y: 400 + Math.cos(game.time) * 140 },
        position,
      ),
    );
    const away = enemy ? normalize(subtract(position, enemy.body.position)) : { x: 0, y: 0 };
    game.move = normalize({ x: center.x + away.x * 0.65, y: center.y + away.y * 0.65 });
    if (steps % 108 === 0)
      game.flip(
        [
          { x: 1, y: 0 },
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
        ][Math.floor(steps / 108) % 4],
      );
    if (enemy && game.wellCooldown === 0) game.createWell(enemy.body.position);
    for (const id of game.abilities.levels.keys())
      if (id !== 'slingshot' && steps % 30 === 0)
        game.castAbility(id, enemy?.body.position ?? position);
    game.step();
    steps++;
    if (game.time > 150) {
      timeout = true;
      break;
    }
  }
  results.push({
    seed,
    won: run.won,
    phase: run.phase,
    rooms: run.rooms,
    kills: run.kills,
    seconds: Math.round(steps / 120),
    health: Math.round(game.player.health),
    timeout,
    remaining: [...game.world.entities.values()]
      .filter((entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile')
      .map((entity) => ({ kind: entity.kind, health: Math.round(entity.health) })),
  });
  game.world.dispose();
}
for (const result of results) console.log(JSON.stringify(result));
console.log(
  JSON.stringify({
    runs: results.length,
    wins: results.filter((result) => result.won).length,
    timeouts: results.filter((result) => result.timeout).length,
  }),
);
