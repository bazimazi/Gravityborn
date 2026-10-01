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
import { profileView } from './presentation/profile';
import {
  craftEquipment,
  upgradeEquipment,
  reforgeEquipment,
  purchaseResearch,
} from './progression/profile';
import { equipmentById } from './content/equipment';
import { modes, type RunMode } from './content/modes';
import { contracts, phenomena, type Contract } from './content/phenomena';
import { objectDefinitions } from './content/objects';
import { installAccessibility, joystickInput } from './presentation/accessibility';
import { installPlatform } from './core/platform';
import { openStorage } from './core/storage';
import { Tutorial } from './gameplay/tutorial';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = shell;
const element = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
const storage = await openStorage();
let settings: Settings;
try {
  settings = loadSettings(storage);
} catch {
  settings = { ...defaults };
}
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) settings.reducedMotion = true;
const game = new Game();
const run = new Expedition(game);
let saveStore: SaveStore;
try {
  saveStore = new SaveStore(storage);
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
  Object.entries({ ...enemyDefinitions, ...objectDefinitions })
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
const tutorial = new Tutorial(game, () => {
  profile.tutorialCompleted = true;
  persist();
  restart();
  toast('Training complete. Begin an expedition when you are ready.');
});
element('#stage').insertAdjacentHTML(
  'beforebegin',
  '<section id="tutorial-guide" class="tutorial-guide" aria-label="Playable training" hidden><strong id="tutorial-title"></strong><p id="tutorial-instruction"></p><small>Your training core is protected.</small><button id="tutorial-next" data-training="next">Next experiment →</button></section>',
);
element('#start').insertAdjacentHTML(
  'beforebegin',
  '<button class="text-button" data-training="start">Learn by playing</button>',
);
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
  void storage.flush?.().then((ok) => {
    if (!ok) toast('Save storage is unavailable. Export your progress before closing.');
  });
}
function renderProfile(): void {
  const preserved = Object.fromEntries(
    ['run-mode', 'run-contract', 'run-difficulty'].map((id) => [
      id,
      document.querySelector<HTMLSelectElement>(`#${id}`)?.value,
    ]),
  );
  const seed = document.querySelector<HTMLInputElement>('#run-seed')?.value ?? '';
  const region = document.querySelector<HTMLSelectElement>('#run-region')?.value ?? '0';
  const open = [...element('#profile-dialog').querySelectorAll('details')].map(
    (detail) => detail.open,
  );
  element('#profile-dialog').innerHTML = profileView(profile, saveStore.state, Boolean(checkpoint));
  element<HTMLInputElement>('#run-seed').value = seed;
  element<HTMLSelectElement>('#run-region').value = region;
  for (const [id, value] of Object.entries(preserved))
    if (value) element<HTMLSelectElement>(`#${id}`).value = value;
  element('#profile-dialog')
    .querySelectorAll('details')
    .forEach((detail, index) => {
      if (open[index] !== undefined) detail.open = open[index];
    });
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
document.addEventListener('change', (event) => {
  const select = event.target as HTMLSelectElement;
  if (select.id === 'run-mode') {
    element('#mode-description').textContent =
      modes.find((mode) => mode.id === select.value)?.description ?? '';
    return;
  }
  if (select.id === 'run-contract') {
    element('#contract-description').textContent =
      contracts.find((contract) => contract.id === select.value)?.description ?? '';
    return;
  }
  if (select.dataset.equipSlot) {
    const slot = select.dataset.equipSlot;
    if (select.value === '') delete profile.loadout[slot];
    else if (profile.equipment[select.value] && equipmentById.get(select.value)?.slot === slot)
      profile.loadout[slot] = select.value;
  } else if (select.dataset.affixFor) {
    if (!reforgeEquipment(profile, select.dataset.affixFor, select.value))
      toast('Reforging needs Precision Workshop and 3 research.');
  } else if (select.id === 'mutation-select' && profile.skills.includes('mutations'))
    profile.mutation = select.value;
  else return;
  saveStore.save({ profile, checkpoint });
  renderProfile();
});

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
    if (run.build.pending > 0) audio.cue('level');
    runViewKey = key;
    clearInput();
    overlay.innerHTML = expeditionView(run);
    overlay.scrollTop = 0;
    if (run.phase !== 'room') persist();
  }
  overlay.classList.add('run-overlay');
  overlay.hidden = false;
}

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.training === 'start') {
    startTraining();
    return;
  }
  if (button.dataset.training === 'next') {
    tutorial.advance();
    feedback.clear();
    renderer.clear();
    clearInput();
    return;
  }
  if (button.dataset.research || button.dataset.craft || button.dataset.upgradeEquipment) {
    if (button.dataset.research) purchaseResearch(profile, button.dataset.research);
    if (button.dataset.craft) craftEquipment(profile, button.dataset.craft);
    if (button.dataset.upgradeEquipment) upgradeEquipment(profile, button.dataset.upgradeEquipment);
    saveStore.save({ profile, checkpoint });
    renderProfile();
    return;
  }
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
    tutorial.stop();
    const seed = document.querySelector<HTMLInputElement>('#run-seed')?.value;
    resumeAfterDialog = false;
    element<HTMLDialogElement>('#profile-dialog').close();
    run.start(
      seed ||
        `${new Date().toISOString().slice(0, 10)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
      profile.selectedClass,
      profile,
      Number(document.querySelector<HTMLSelectElement>('#run-region')?.value ?? 0),
      {
        mode: (document.querySelector<HTMLSelectElement>('#run-mode')?.value ??
          'standard') as RunMode,
        contract: (document.querySelector<HTMLSelectElement>('#run-contract')?.value ??
          'none') as Contract,
        difficulty: Number(
          document.querySelector<HTMLSelectElement>('#run-difficulty')?.value ?? 0,
        ),
      },
    );
    feedback.clear();
    renderer.clear();
    clearInput();
    void audio.unlock();
  } else if (button.dataset.runAction === 'resume') {
    tutorial.stop();
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
      if (run.current?.type === 'boss') audio.cue('boss');
      feedback.clear();
      renderer.clear();
      toast(run.message);
    }
  } else if (button.dataset.upgrade) run.build.choose(button.dataset.upgrade);
  else if (button.dataset.runAction === 'reroll') run.build.reroll();
  else if (button.dataset.buy) {
    if (run.buy(button.dataset.buy)) audio.cue('relic');
  } else if (button.dataset.event)
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
  tutorial.stop();
  void audio.unlock();
  clearInput();
  game.start();
  updateHud(60);
  overlay.hidden = true;
  canvas.focus({ preventScroll: true });
  toast('Flip gravity to launch objects into hostiles.');
}
function startTraining(): void {
  run.abandon();
  tutorial.start();
  feedback.clear();
  renderer.clear();
  clearInput();
  armedWell = false;
  overlay.hidden = true;
  overlay.classList.remove('run-overlay', 'summary');
  void audio.unlock();
  canvas.focus({ preventScroll: true });
}
function restart(): void {
  tutorial.stop();
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
  joystick = joystickInput(x, y, settings.joystickDeadzone);
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
  document.documentElement.style.setProperty('--ui-scale', String(settings.uiScale));
  document.documentElement.style.setProperty('--joystick-scale', String(settings.joystickScale));
  document.documentElement.classList.toggle('high-contrast', settings.highContrast);
  document.documentElement.classList.toggle('reduced-flashing', settings.reducedFlashing);
  try {
    saveSettings(storage, settings);
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
installAccessibility(settings, game.events, applySettings);
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
  if (paused) {
    element('#restart').textContent = tutorial.active ? 'Restart training' : 'Restart';
    element('#restart').onclick = tutorial.active ? startTraining : restart;
  }
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
    button.disabled = game.state !== 'playing' || game.rules.directionLocked;
  }
  element('#status').textContent =
    game.state === 'won'
      ? 'CHAMBER CLEARED · EXPERIMENT COMPLETE'
      : `${game.enemyCount} HOSTILES · ${game.state === 'paused' ? 'PAUSED' : 'CHAMBER SEALED'}`;
  element('#chain').textContent = `${game.chains.current}× CHAIN`;
  if (game.nextWaveAt !== undefined)
    element('#chain').textContent =
      `NEXT WAVE · ${Math.max(0, game.nextWaveAt - game.time).toFixed(1)}s`;
  if (run.active && run.phase === 'room') {
    const phenomenon = phenomena.find((phenomenon) => phenomenon.id === game.rules.phenomenon);
    element('#status').textContent = game.room.puzzle
      ? game.environment.switchActive
        ? 'EXIT OPEN · REACH THE GATE'
        : 'MOVE HEAVY MATTER TO THE SWITCH'
      : `${game.enemyCount} HOSTILES${phenomenon ? ` · ${phenomenon.name.toUpperCase()}` : ''}`;
  }
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
let lastDraw = 0;
function frame(now: number): void {
  const elapsed = Math.min(Math.max(now - previous, 0), balance.physics.maxFrameMs);
  previous = now;
  game.move = {
    x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + joystick.x,
    y: Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + joystick.y,
  };
  if (game.state === 'playing') {
    if (Math.hypot(game.move.x, game.move.y) > 0.1) moved = true;
    accumulator += elapsed;
    while (accumulator >= balance.physics.stepMs) {
      game.step();
      tutorial.tick();
      accumulator -= balance.physics.stepMs;
    }
  } else accumulator = 0;
  feedback.update(elapsed / 1000);
  renderer.tutorialTarget = tutorial.active ? (tutorial.beacon ?? null) : null;
  const guide = element('#tutorial-guide');
  guide.hidden = !tutorial.active || game.state !== 'playing';
  if (tutorial.active) {
    element('#tutorial-title').textContent =
      `${tutorial.index + 1} / 7 · ${tutorial.lesson.name}${tutorial.complete ? ' · Complete' : ''}`;
    element('#tutorial-instruction').textContent = tutorial.lesson.text;
    element<HTMLButtonElement>('#tutorial-next').disabled = !tutorial.complete;
    element('#tutorial-next').textContent =
      tutorial.index === 6 ? 'Finish training →' : 'Next experiment →';
  }
  element('#well').classList.toggle(
    'training-focus',
    tutorial.active && !tutorial.complete && tutorial.lesson.hint === 'well',
  );
  element('.dpad').classList.toggle(
    'training-focus',
    tutorial.active && !tutorial.complete && tutorial.lesson.hint === 'gravity',
  );
  element('#joystick').classList.toggle(
    'training-focus',
    tutorial.active && !tutorial.complete && tutorial.lesson.hint === 'joystick',
  );
  if (now - lastDraw >= 1000 / settings.frameRate - 1) {
    if (lastDraw) fps = fps * 0.94 + (1000 / Math.max(now - lastDraw, 1)) * 0.06;
    renderer.draw(game, feedback, now);
    lastDraw = now;
  }
  if (game.state !== lastState) {
    lastState = game.state;
    if (game.state === 'won' || game.state === 'lost') clearInput();
    showState();
  }
  refreshRun();
  if (now - hudTime > 80) {
    audio.soundtrack(
      document.hidden ||
        document.querySelector('dialog[open]') ||
        (game.state === 'paused' && !upgradePaused)
        ? 'off'
        : game.state === 'playing'
          ? game.player.health < game.maxHealth * 0.25
            ? 'critical'
            : game.bosses.active
              ? 'boss'
              : game.room.type === 'elite'
                ? 'elite'
                : game.enemyCount > 7
                  ? 'danger'
                  : 'combat'
          : (run.active ? run.phase === 'summary' && run.won : game.state === 'won')
            ? 'victory'
            : run.active && run.phase !== 'summary'
              ? 'exploration'
              : 'off',
      Boolean(game.rules.phenomenon),
    );
    updateHud(fps);
    hudTime = now;
  }
  if (now > toastUntil) element('#toast').hidden = true;
  requestAnimationFrame(frame);
}
updateHud(60);
requestAnimationFrame(frame);

void installPlatform(
  () => {
    clearInput();
    game.pause();
    audio.soundtrack('off');
    persist();
  },
  () => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialog) dialog.close();
    else if (game.state === 'playing') {
      clearInput();
      game.pause();
    }
  },
).catch(() => {
  /* A missing native plugin must not prevent play. */
});

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
