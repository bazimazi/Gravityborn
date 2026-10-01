import './style.css';
import balance from './data/balance.json';
import { defaults, loadSettings, saveSettings, type Settings } from './core/settings';
import type { Vec2 } from './core/vector';
import { Game } from './gameplay/game';
import type { EntityKind } from './physics/world';
import { Feedback } from './presentation/feedback';
import { GameAudio } from './presentation/audio';
import { Renderer } from './presentation/renderer';
import { shell } from './presentation/shell';
import { abilities, abilityById } from './content/abilities';
import { enemyDefinitions, eliteModifiers, type EliteModifier } from './content/enemies';
import { Expedition } from './progression/expedition';
import { expeditionView } from './presentation/expedition';
import { SaveStore } from './core/save';
import {
  newProfile,
  readProfile,
  settleRun,
  unlockClass,
  type Profile,
} from './progression/profile';
import { classes } from './content/classes';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = shell;
const element = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
let settings: Settings;
try {
  settings = loadSettings(window.localStorage);
} catch {
  settings = { ...defaults };
}
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) settings.reducedMotion = true;
const game = new Game();
const run = new Expedition(game);
let saveStore: SaveStore;
try {
  saveStore = new SaveStore(window.localStorage);
} catch {
  saveStore = new SaveStore({
    getItem: () => null,
    setItem: () => {
      throw new Error('Storage unavailable');
    },
  });
}
const saved = saveStore.load() as { profile?: unknown; checkpoint?: unknown } | null;
let profile: Profile = saved?.profile ? readProfile(saved.profile) : newProfile();
let checkpoint: unknown = saved?.checkpoint ?? null;
element('.header-right').insertAdjacentHTML(
  'afterbegin',
  '<button class="icon-button" id="profile-open" aria-label="Progression hub" title="Progression and saved expedition">✦</button>',
);
document.body.insertAdjacentHTML(
  'beforeend',
  '<dialog id="profile-dialog" aria-labelledby="profile-title"><button data-close aria-label="Close progression">×</button></dialog>',
);
element('#start').insertAdjacentHTML(
  'afterend',
  '<button class="primary-button" data-run-action="new">Begin expedition</button>',
);
element('#spawn-kind').insertAdjacentHTML(
  'beforeend',
  Object.entries(enemyDefinitions)
    .map(([id, definition]) => `<option value="${id}">${definition.name}</option>`)
    .join(''),
);
element('.debug-grid').insertAdjacentHTML(
  'beforeend',
  `<label>Elite modifier <select id="elite-modifier"><option value="">None</option>${eliteModifiers.map((id) => `<option>${id}</option>`).join('')}</select></label>`,
);
element('#controls').insertAdjacentHTML(
  'afterend',
  `<div class="ability-bar"><label for="ability-select">Core power</label><select id="ability-select">${abilities.map((ability) => `<option value="${ability.id}">${ability.name}</option>`).join('')}</select><button id="ability-cast" class="text-button">Cast · Q</button><span id="energy-value" class="mono"></span><p id="ability-description"></p></div>`,
);
element<HTMLSelectElement>('#ability-select').onchange = () => {
  const id = element<HTMLSelectElement>('#ability-select').value;
  if (!run.active && !game.abilities.levels.has(id)) game.abilities.learn(id);
  element('#ability-description').textContent = abilityById.get(id)!.description;
};
element('#ability-description').textContent = abilities[0].description;
function castPower(): void {
  const id = element<HTMLSelectElement>('#ability-select').value;
  if (!run.active && !game.abilities.levels.has(id)) game.abilities.learn(id);
  const target = renderer.aim ?? {
    x: game.player.body.position.x + 160,
    y: game.player.body.position.y,
  };
  if (game.castAbility(id, target)) void audio.unlock();
  else if (game.state === 'playing') toast('Power needs energy, cooldown, or a valid target.');
}
element('#ability-cast').onclick = castPower;
const feedback = new Feedback(game.events);
const audio = new GameAudio(game.events, settings);
const canvas = element<HTMLCanvasElement>('#game');
const renderer = new Renderer(canvas, settings);
const overlay = element('#overlay');
const initialOverlay = overlay.innerHTML;
const keys = new Set<string>();
const directions: Record<string, Vec2> = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
};
let joystick: Vec2 = { x: 0, y: 0 };
let joystickPointer: number | null = null;
let moved = false;
let armedWell = false;
let toastUntil = 0;
let resumeAfterDialog = false;
let lastState = game.state;
let runViewKey = '';
let powerListKey = '';
let upgradePaused = false;

function persist(): void {
  if (run.active && run.phase !== 'room') {
    settleRun(profile, run);
    checkpoint = run.snapshot();
  }
  saveStore.save({ profile, checkpoint });
}
function renderProfile(): void {
  element('#profile-dialog').innerHTML =
    `<div class="dialog-header"><h2 id="profile-title">The observatory</h2><button data-run-action="profile-close" aria-label="Close progression">×</button></div><p class="run-stats mono">${profile.shards} GRAVITY SHARDS · ${profile.research} RESEARCH · ${profile.runs} RUNS · ${profile.wins} WINS</p><p class="dialog-copy">Discoveries and class mastery survive death. Expeditions save at room boundaries; reloading returns to the last saved route.</p>${checkpoint ? '<button class="primary-button" data-run-action="resume">Resume saved route</button>' : ''}<label class="setting-row">Expedition seed <input id="run-seed" maxlength="64" placeholder="Random seed"></label><div class="class-grid">${classes.map((definition) => `<button class="run-card" data-class="${definition.id}" ${!profile.classes.includes(definition.id) && profile.shards < definition.cost ? 'disabled' : ''}><small>${profile.classes.includes(definition.id) ? (profile.selectedClass === definition.id ? 'SELECTED' : `MASTERY ${profile.mastery[definition.id] ?? 0}`) : `UNLOCK · ${definition.cost} SHARDS`}</small><strong>${definition.name}</strong><span>${definition.description}</span></button>`).join('')}</div><button class="primary-button" data-run-action="new">Start selected class</button><div class="save-tools"><button class="text-button" data-run-action="export">Export save</button><label class="text-button">Import save <input id="import-save" type="file" accept="application/json" hidden></label><span class="mono">SAVE: ${saveStore.state.toUpperCase()}</span></div>`;
  element<HTMLInputElement>('#import-save').onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const data = saveStore.import(await file.text()) as
      | { profile?: unknown; checkpoint?: unknown }
      | undefined;
    if (!data?.profile) {
      toast('This save could not be verified.');
      return;
    }
    profile = readProfile(data.profile);
    checkpoint = data.checkpoint ?? null;
    saveStore.save({ profile, checkpoint });
    renderProfile();
    toast('Save imported. Resume the saved route when ready.');
  };
}
element('#profile-open').onclick = () => {
  renderProfile();
  openDialog('#profile-dialog');
};

function refreshRun(): void {
  if (!run.active) return;
  if (run.build.pending > 0 && run.phase === 'room' && game.state === 'playing') {
    game.pause();
    clearInput();
    upgradePaused = true;
  }
  if (!run.build.pending && upgradePaused) {
    upgradePaused = false;
    if (run.phase === 'room') game.resume();
  }
  const visible = run.phase !== 'room' || run.build.pending > 0;
  if (!visible) {
    if (overlay.classList.contains('run-overlay')) {
      overlay.classList.remove('run-overlay');
      overlay.hidden = true;
    }
    return;
  }
  const key = `${run.phase}:${run.biome}:${run.rooms}:${run.build.pending}:${run.build.currency}:${run.message}`;
  if (key !== runViewKey) {
    runViewKey = key;
    clearInput();
    overlay.innerHTML = expeditionView(run);
    if (run.phase !== 'room') persist();
  }
  overlay.classList.add('run-overlay');
  overlay.hidden = false;
}

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.class) {
    const id = button.dataset.class;
    if (profile.classes.includes(id) || unlockClass(profile, id)) profile.selectedClass = id;
    saveStore.save({ profile, checkpoint });
    renderProfile();
    return;
  }
  if (button.dataset.runAction === 'profile-close') {
    element<HTMLDialogElement>('#profile-dialog').close();
    return;
  }
  if (button.dataset.runAction === 'export') {
    const blob = new Blob([saveStore.export({ profile, checkpoint })], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gravityborn-save.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (button.dataset.runAction === 'new') {
    const seed = document.querySelector<HTMLInputElement>('#run-seed')?.value;
    resumeAfterDialog = false;
    element<HTMLDialogElement>('#profile-dialog').close();
    run.start(
      seed ||
        `${new Date().toISOString().slice(0, 10)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
      profile.selectedClass,
    );
    feedback.clear();
    renderer.clear();
    clearInput();
    void audio.unlock();
  } else if (button.dataset.runAction === 'resume') {
    if (!checkpoint || !run.restore(checkpoint)) {
      toast('The checkpoint could not be restored. Your profile is still available.');
      return;
    }
    resumeAfterDialog = false;
    element<HTMLDialogElement>('#profile-dialog').close();
    feedback.clear();
    renderer.clear();
    clearInput();
  } else if (button.dataset.runAction === 'lab') {
    run.abandon();
    overlay.classList.remove('run-overlay');
    restart();
    return;
  } else if (button.dataset.room) {
    if (run.enter(button.dataset.room)) {
      feedback.clear();
      renderer.clear();
      toast(run.message);
    }
  } else if (button.dataset.upgrade) run.build.choose(button.dataset.upgrade);
  else if (button.dataset.buy) run.buy(button.dataset.buy);
  else if (button.dataset.event)
    run.resolveEvent(button.dataset.event as 'risk' | 'repair' | 'leave');
  else if (button.dataset.runAction === 'advance') run.advance();
  else if (button.dataset.runAction === 'leave-shop') run.leaveShop();
  else return;
  runViewKey = '';
  refreshRun();
  updateHud(60);
  if (run.phase === 'room' && !run.build.pending) canvas.focus({ preventScroll: true });
});

function toast(message: string): void {
  element('#toast').textContent = message;
  element('#toast').hidden = false;
  toastUntil = performance.now() + 2600;
}
function clearInput(): void {
  keys.clear();
  joystick = { x: 0, y: 0 };
  joystickPointer = null;
  element('#joystick-knob').style.transform = '';
  game.move = { x: 0, y: 0 };
}
function begin(): void {
  void audio.unlock();
  clearInput();
  game.start();
  updateHud(60);
  overlay.hidden = true;
  canvas.focus({ preventScroll: true });
  toast('Flip gravity to launch objects into hostiles.');
}
function restart(): void {
  if (run.active) run.abandon();
  overlay.classList.remove('run-overlay');
  game.reset();
  feedback.clear();
  renderer.clear();
  clearInput();
  moved = false;
  armedWell = false;
  overlay.classList.remove('summary');
  overlay.innerHTML = initialOverlay;
  overlay.hidden = false;
  element('#start').onclick = begin;
  element('#intro-help').onclick = () => openDialog('#help-dialog');
}
function pauseToggle(): void {
  if (run.active && (run.phase !== 'room' || run.build.pending > 0)) return;
  if (document.querySelector('dialog[open]')) return;
  clearInput();
  if (game.state === 'playing') game.pause();
  else if (game.state === 'paused') game.resume();
}
function openDialog(selector: string): void {
  resumeAfterDialog = game.state === 'playing';
  game.pause();
  clearInput();
  element<HTMLDialogElement>(selector).showModal();
}
function castWell(): void {
  const target = renderer.aim ?? {
    x: game.player.body.position.x + game.gravity.direction.x * 160,
    y: game.player.body.position.y + game.gravity.direction.y * 160,
  };
  if (game.createWell(target)) {
    armedWell = false;
    void audio.unlock();
  } else if (game.state === 'playing') toast('Gravity well is recharging.');
}

element('#start').onclick = begin;
element('#intro-help').onclick = () => openDialog('#help-dialog');
element('#help').onclick = () => openDialog('#help-dialog');
element('#settings').onclick = () => openDialog('#settings-dialog');
element('#pause').onclick = pauseToggle;
element('#debug-open').onclick = () => openDialog('#debug-dialog');
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (resumeAfterDialog) game.resume();
    resumeAfterDialog = false;
    canvas.focus({ preventScroll: true });
  });
}
// A secondary touch does not reliably generate click. Act on pointerdown,
// retaining keyboard-generated clicks for accessible button activation.
function bindPress(button: HTMLButtonElement, action: () => void): void {
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || button.disabled) return;
    event.preventDefault();
    action();
  });
  button.onclick = (event) => {
    if (event.detail === 0 && !button.disabled) action();
  };
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
  bindPress(button, () => {
    if (game.flip(directions[button.dataset.direction!])) void audio.unlock();
  });
}
bindPress(element<HTMLButtonElement>('#well'), () => {
  if (window.matchMedia('(pointer: coarse)').matches) {
    armedWell = !armedWell;
    toast(armedWell ? 'Tap the arena to place a gravity well.' : 'Well targeting cancelled.');
  } else castWell();
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse') renderer.aim = renderer.toWorld(event.clientX, event.clientY);
});
canvas.addEventListener('pointerleave', () => {
  renderer.aim = null;
});
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || game.state !== 'playing') return;
  renderer.aim = renderer.toWorld(event.clientX, event.clientY);
  castWell();
  if (event.pointerType !== 'mouse') renderer.aim = null;
});
const pad = element('#joystick');
function updateJoystick(event: PointerEvent): void {
  const bounds = pad.getBoundingClientRect();
  const radius = bounds.width * 0.32;
  const x = (event.clientX - bounds.left - bounds.width / 2) / radius;
  const y = (event.clientY - bounds.top - bounds.height / 2) / radius;
  const magnitude = Math.max(1, Math.hypot(x, y));
  joystick = { x: x / magnitude, y: y / magnitude };
  element('#joystick-knob').style.transform =
    `translate(${joystick.x * radius}px,${joystick.y * radius}px)`;
}
pad.addEventListener('pointerdown', (event) => {
  if (joystickPointer !== null || game.state !== 'playing') return;
  joystickPointer = event.pointerId;
  pad.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
pad.addEventListener('pointermove', (event) => {
  if (event.pointerId === joystickPointer) updateJoystick(event);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
  pad.addEventListener(name, (event) => {
    if ((event as PointerEvent).pointerId === joystickPointer) {
      joystickPointer = null;
      joystick = { x: 0, y: 0 };
      element('#joystick-knob').style.transform = '';
    }
  });

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('button') && (event.code === 'Space' || event.code === 'Enter')) return;
  if (
    document.querySelector('dialog[open]') ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  )
    return;
  if (event.key === 'Escape') {
    event.preventDefault();
    pauseToggle();
    return;
  }
  if (event.code === 'Backquote') {
    event.preventDefault();
    openDialog('#debug-dialog');
    return;
  }
  if (event.code === 'KeyR' && (game.state === 'won' || game.state === 'lost')) {
    restart();
    begin();
    return;
  }
  if (game.state !== 'playing') return;
  if (event.code === 'KeyQ' && !event.repeat) {
    event.preventDefault();
    castPower();
    return;
  }
  if (
    [
      'ArrowUp',
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
      'Space',
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
    ].includes(event.code)
  )
    event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  const direction = (
    { ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down' } as Record<
      string,
      string
    >
  )[event.code];
  if (direction) game.flip(directions[direction]);
  if (event.code === 'Space') castWell();
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});
window.addEventListener('blur', () => {
  clearInput();
  game.pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    game.pause();
  }
});

function applySettings(): void {
  element('#controls').classList.toggle('left-handed', settings.leftHanded);
  try {
    saveSettings(window.localStorage, settings);
  } catch {
    /* Storage access itself may be blocked. */
  }
}
element<HTMLInputElement>('#volume').value = String(settings.volume);
element<HTMLInputElement>('#volume').oninput = (event) => {
  settings.volume = Number((event.target as HTMLInputElement).value);
  void audio.unlock();
  applySettings();
};
for (const [selector, key] of [
  ['#reduced-motion', 'reducedMotion'],
  ['#left-handed', 'leftHanded'],
  ['#low-quality', 'lowQuality'],
] as const) {
  element<HTMLInputElement>(selector).checked = settings[key];
  element<HTMLInputElement>(selector).onchange = (event) => {
    settings[key] = (event.target as HTMLInputElement).checked;
    applySettings();
  };
}
applySettings();
element('#spawn').onclick = () => {
  const entity = game.world.spawn(element<HTMLSelectElement>('#spawn-kind').value as EntityKind, {
    x: 700,
    y: 370,
  });
  const modifier = element<HTMLSelectElement>('#elite-modifier').value as EliteModifier;
  if (entity && modifier && entity.definition.faction === 'enemy')
    game.enemies.setElite(entity, modifier);
};
element('#debug-heal').onclick = () => {
  game.player.health = game.player.definition.health;
};
element('#debug-reset').onclick = () => {
  restart();
  resumeAfterDialog = false;
  element<HTMLDialogElement>('#debug-dialog').close();
};
element('#debug-step').onclick = () => {
  if (game.state === 'paused') {
    game.resume();
    game.step();
    game.pause();
  }
};
element('#debug-well').onclick = () => {
  if (game.state === 'paused') {
    game.resume();
    game.wellCooldown = 0;
    game.createWell({ x: 700, y: 370 });
    game.pause();
  }
};
element<HTMLInputElement>('#debug-overlay').onchange = (event) => {
  renderer.debug = (event.target as HTMLInputElement).checked;
};
element<HTMLInputElement>('#gravity-strength').value = String(game.gravity.strength);
element<HTMLInputElement>('#gravity-strength').oninput = (event) => {
  game.gravity.strength = Number((event.target as HTMLInputElement).value);
};

function showState(): void {
  if (run.active && (run.phase !== 'room' || run.build.pending > 0)) {
    refreshRun();
    return;
  }
  if (game.state === 'playing') {
    overlay.hidden = true;
    return;
  }
  if (game.state === 'ready') return;
  const paused = game.state === 'paused';
  const won = game.state === 'won';
  overlay.classList.add('summary');
  overlay.hidden = false;
  overlay.innerHTML = `<div class="intro-content"><div class="prototype-label mono">${paused ? 'SIMULATION SUSPENDED' : won ? 'EXPERIMENT COMPLETE' : 'CORE SIGNAL LOST'}</div><h2 class="intro-title">${paused ? 'Hold that thought.' : won ? 'You changed<span>the outcome.</span>' : 'Gravity gives.<span>Gravity takes.</span>'}</h2><p class="intro-description">${paused ? 'The chamber will be right where you left it.' : won ? 'Six hostiles. Zero weapons. You made the room do the work.' : 'Try a new direction. Pull a barrel into the crowd. Every experiment teaches you something.'}</p>${paused ? '' : `<div class="run-results"><div><strong>${game.stats.kills}</strong><small>HOSTILES</small></div><div><strong>${game.chains.best}×</strong><small>BEST CHAIN</small></div><div><strong>${game.stats.score}</strong><small>SCORE</small></div></div>`}<div class="intro-actions"><button class="primary-button" id="continue">${paused ? 'Resume experiment' : 'Try another experiment ↗'}</button>${paused ? '<button class="text-button" id="restart">Restart</button>' : ''}</div></div>`;
  element('#continue').onclick = () => {
    if (paused) {
      game.resume();
      canvas.focus();
    } else {
      restart();
      begin();
    }
  };
  if (paused) element('#restart').onclick = restart;
  if (!document.querySelector('dialog[open]')) element('#continue').focus({ preventScroll: true });
}

function updateHud(fps: number): void {
  const listKey = run.active
    ? [...game.abilities.levels].map(([id, level]) => `${id}:${level}`).join(',')
    : 'laboratory';
  if (listKey !== powerListKey) {
    powerListKey = listKey;
    const select = element<HTMLSelectElement>('#ability-select');
    const previous = select.value;
    select.innerHTML = abilities
      .filter((ability) => !run.active || game.abilities.levels.has(ability.id))
      .map(
        (ability) =>
          `<option value="${ability.id}">${ability.name}${run.active ? ` ${game.abilities.levels.get(ability.id)}` : ''}</option>`,
      )
      .join('');
    if ([...select.options].some((option) => option.value === previous)) select.value = previous;
    element('#ability-description').textContent = abilityById.get(select.value)?.description ?? '';
  }
  const selectedPower = element<HTMLSelectElement>('#ability-select').value;
  const cooldown = game.abilities.cooldowns.get(selectedPower) ?? 0;
  element('#energy-value').textContent =
    `${Math.floor(game.abilities.energy)} / ${game.abilities.maxEnergy} ENERGY`;
  element('#ability-cast').textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : 'Cast · Q';
  element<HTMLButtonElement>('#ability-cast').disabled = game.state !== 'playing' || cooldown > 0;
  const health = Math.ceil(game.player.health);
  element('#health-value').textContent = `${health} / ${game.maxHealth}`;
  element('#health-fill').style.width = `${(health / game.maxHealth) * 100}%`;
  element('[role="progressbar"]').setAttribute('aria-valuemax', String(game.maxHealth));
  element('[role="progressbar"]').setAttribute('aria-valuenow', String(health));
  element('#timer').textContent = `${Math.floor(game.time / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(game.time % 60)
    .toString()
    .padStart(2, '0')}`;
  const g = game.gravity.direction;
  const direction = g.x < -0.5 ? 'left' : g.x > 0.5 ? 'right' : g.y < -0.5 ? 'up' : 'down';
  element('#gravity-name').textContent = direction.toUpperCase();
  element('#gravity-arrow').textContent = { left: '←', right: '→', up: '↑', down: '↓' }[direction];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
    button.classList.toggle('active', button.dataset.direction === direction);
    button.setAttribute('aria-pressed', String(button.dataset.direction === direction));
    button.disabled = game.state !== 'playing';
  }
  element('#status').textContent =
    game.state === 'won'
      ? 'CHAMBER CLEARED · EXPERIMENT COMPLETE'
      : `${game.enemyCount} HOSTILES · ${game.state === 'paused' ? 'PAUSED' : 'CHAMBER SEALED'}`;
  element('#chain').textContent = `${game.chains.current}× CHAIN`;
  element<HTMLButtonElement>('#well').disabled = game.state !== 'playing' || game.wellCooldown > 0;
  element('#well').classList.toggle('armed', armedWell);
  element('#well-state').textContent =
    game.wellCooldown > 0 ? `${game.wellCooldown.toFixed(1)}s` : armedWell ? 'TAP ARENA' : 'WELL';
  element<HTMLButtonElement>('#pause').disabled = !['playing', 'paused'].includes(game.state);
  element('#pause').textContent = game.state === 'paused' ? '▷' : 'Ⅱ';
  element('#pause').setAttribute(
    'aria-label',
    game.state === 'paused' ? 'Resume game' : 'Pause game',
  );
  for (const [id, complete] of [
    ['move', moved],
    ['flip', game.stats.flips > 0],
    ['well', game.stats.wells > 0],
    ['kill', game.stats.kills > 0],
  ] as const)
    element(`#objective-${id}`).classList.toggle('complete', complete);
  element('#performance').textContent =
    `${Math.round(fps)} FPS · ${game.world.entities.size} BODIES`;
  element('#debug-status').textContent =
    `Bodies ${game.world.entities.size}/${balance.physics.maxBodies} · Fields ${game.gravity.fields.size} · Step ${balance.physics.stepMs.toFixed(2)} ms · Solver ${game.world.engine.timing.lastElapsed.toFixed(2)} ms`;
}

let previous = performance.now();
let accumulator = 0;
let hudTime = 0;
let fps = 60;
function frame(now: number): void {
  const elapsed = Math.min(Math.max(now - previous, 0), balance.physics.maxFrameMs);
  previous = now;
  fps = fps * 0.94 + (1000 / Math.max(elapsed, 1)) * 0.06;
  game.move = {
    x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + joystick.x,
    y: Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + joystick.y,
  };
  if (game.state === 'playing') {
    if (Math.hypot(game.move.x, game.move.y) > 0.1) moved = true;
    accumulator += elapsed;
    while (accumulator >= balance.physics.stepMs) {
      game.step();
      accumulator -= balance.physics.stepMs;
    }
  } else accumulator = 0;
  feedback.update(elapsed / 1000);
  renderer.draw(game, feedback, now);
  if (game.state !== lastState) {
    lastState = game.state;
    if (game.state === 'won' || game.state === 'lost') clearInput();
    showState();
  }
  refreshRun();
  if (now - hudTime > 80) {
    updateHud(fps);
    hudTime = now;
  }
  if (now > toastUntil) element('#toast').hidden = true;
  requestAnimationFrame(frame);
}
updateHud(60);
requestAnimationFrame(frame);

// Read-only diagnostics for browser tests and local playtest reports.
if (import.meta.env.DEV)
  Object.defineProperty(window, '__gravityborn', {
    value: () => ({
      state: game.state,
      time: game.time,
      health: game.player.health,
      position: { ...game.player.body.position },
      direction: { ...game.gravity.direction },
      fields: game.gravity.fields.size,
      stats: { ...game.stats },
      bodies: game.world.entities.size,
      move: { ...game.move },
      expedition: run.active
        ? {
            phase: run.phase,
            seed: run.seed,
            rooms: run.rooms,
            biome: run.biome,
            level: run.build.level,
            pending: run.build.pending,
            currency: run.build.currency,
          }
        : null,
    }),
  });
