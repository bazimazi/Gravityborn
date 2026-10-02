import { Game } from '../src/gameplay/game';
import { Expedition } from '../src/progression/expedition';
import { normalize, subtract } from '../src/core/vector';
import { modes, type RunMode } from '../src/content/modes';
import { classById } from '../src/content/classes';
import { canBuy } from '../src/progression/shop';
import {
  newProfile,
  readProfile,
  settleRun,
  purchaseResearch,
  craftEquipment,
  upgradeEquipment,
  unlockClass,
} from '../src/progression/profile';
import { researchNodes } from '../src/content/research';
import { biomes } from '../src/content/rooms';
const option = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : (process.argv[index + 1] ?? '');
};
const mode = option('--mode', 'quick') as RunMode;
const classId = option('--class', 'manipulator');
const strategy = option('--strategy', 'baseline');
const progression = option('--progression', 'fresh');
const details = process.argv.includes('--details');
const samples = Number(option('--runs', '12'));
const maxSeconds = Number(option('--seconds', mode === 'quick' ? '360' : '1800'));
if (
  !modes.some((item) => item.id === mode) ||
  !classById.has(classId) ||
  !['baseline', 'well'].includes(strategy) ||
  !['fresh', 'earned'].includes(progression) ||
  !Number.isInteger(samples) ||
  samples < 1 ||
  samples > 100 ||
  !Number.isFinite(maxSeconds) ||
  maxSeconds < 1 ||
  maxSeconds > 7200
)
  throw new Error(
    'Use a known --mode and --class, --strategy baseline|well, --progression fresh|earned, --runs 1–100, --seconds 1–7200 and optional --details.',
  );
const results = [];
let profile = newProfile();
for (let seed = 0; seed < samples; seed++) {
  if (progression === 'earned') {
    // Spend only rewards settled from earlier attempts in this batch. No fixture
    // currencies or debug grants; ordinary purchase and migration rules apply.
    for (const id of [
      'vitality',
      'field_theory',
      'agility',
      ...researchNodes.map((node) => node.id),
    ])
      purchaseResearch(profile, id);
    for (const id of [
      'basalt_shell',
      'lattice_utility',
      'lattice_gravity',
      'lattice_core',
      'lattice_movement',
      'lattice_artifact',
    ]) {
      if (profile.equipment[id]) continue;
      craftEquipment(profile, id);
    }
    for (const id of Object.values(profile.loadout))
      while (upgradeEquipment(profile, id)) {
        /* Spend earned research up to the ordinary cap. */
      }
    unlockClass(profile, classId);
  }
  const game = new Game(false);
  const run = new Expedition(game);
  const runClass =
    progression === 'earned' && !profile.classes.includes(classId) ? 'manipulator' : classId;
  run.start(`input-playtest-${seed}`, runClass, progression === 'earned' ? profile : undefined, 0, {
    mode,
  });
  if (run.mode !== mode)
    throw new Error(
      `Requested ${mode} is locked; the harness would otherwise silently run ${run.mode}.`,
    );
  const startingBuild = {
    health: game.maxHealth,
    skills: [...run.build.skills],
    equipment: structuredClone(run.build.equipment),
  };
  const damage: Record<string, number> = {};
  const route: {
    region: string;
    node: string;
    type: string;
    healthIn: number;
    healthOut: number;
    seconds: number;
    result: string;
    damage: Record<string, number>;
  }[] = [];
  let encounter: (typeof route)[number] | undefined;
  game.events.on('damaged', (event) => {
    if (!event.player) return;
    const cause = game.lastDamage;
    damage[cause] = (damage[cause] ?? 0) + event.amount;
    if (encounter) encounter.damage[cause] = (encounter.damage[cause] ?? 0) + event.amount;
  });
  game.events.on('ended', (event) => {
    if (!encounter) return;
    encounter.healthOut = Math.round(game.player.health);
    encounter.seconds = Math.round(game.time * 100) / 100;
    encounter.result = event.won ? 'cleared' : 'defeat';
    encounter = undefined;
  });
  let steps = 0;
  let timeout = false;
  while (run.phase !== 'summary' && steps < 120 * maxSeconds) {
    if (run.build.pending) {
      run.build.offer();
      const choice =
        (strategy === 'well'
          ? (run.build.choices.find(
              (choice) =>
                choice.target === 'integrity' && game.player.health < game.maxHealth * 0.5,
            ) ??
            run.build.choices.find((choice) => choice.kind === 'well') ??
            run.build.choices.find((choice) =>
              ['repair', 'aegis', 'integrity', 'recovery'].includes(choice.target),
            ))
          : undefined) ??
        run.build.choices.find((choice) =>
          ['collapse', 'pulse', 'repair', 'aegis', 'newton'].includes(choice.target),
        ) ??
        run.build.choices[0];
      run.build.choose(choice.id);
    }
    if (run.phase === 'map') {
      const node =
        run.available.find((node) => ['rest', 'treasure', 'shop'].includes(node.type)) ??
        run.available.find((node) => node.type !== 'puzzle') ??
        run.available[0];
      const healthIn = Math.round(game.player.health);
      if (!run.enter(node.id)) continue;
      const entry = {
        region: biomes[run.biome].id,
        node: node.id,
        type: node.type,
        healthIn,
        healthOut: Math.round(game.player.health),
        seconds: 0,
        result: game.state === 'playing' ? 'unfinished' : 'visited',
        damage: {},
      };
      route.push(entry);
      encounter = game.state === 'playing' ? entry : undefined;
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
      if (strategy === 'well') {
        const repair = run.shop.find((item) => item.id === 'healing' && canBuy(run.build, item));
        if (repair) run.buy(repair.id);
      }
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
    mode,
    classId: run.classId,
    strategy,
    progression,
    startingBuild,
    won: run.won,
    phase: run.phase,
    rooms: run.rooms,
    kills: run.kills,
    seconds: Math.round(steps / 120),
    health: Math.round(game.player.health),
    region: biomes[run.biome].id,
    lastRoom: run.current?.type,
    causeOfDeath: run.phase === 'summary' && !run.won ? game.lastDamage : undefined,
    damage: Object.fromEntries(
      Object.entries(damage).map(([key, value]) => [key, Math.round(value)]),
    ),
    ...(details ? { route } : {}),
    timeout: timeout || run.phase !== 'summary',
    remaining: [...game.world.entities.values()]
      .filter((entity) => entity.definition.faction === 'enemy' && entity.kind !== 'projectile')
      .map((entity) => ({ kind: entity.kind, health: Math.round(entity.health) })),
  });
  if (progression === 'earned' && run.phase === 'summary') {
    settleRun(profile, run);
    profile = readProfile(JSON.parse(JSON.stringify(profile)));
  }
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
