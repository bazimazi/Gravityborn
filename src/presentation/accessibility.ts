import type { Settings } from '../core/settings';
import type { EventBus } from '../core/events';
import type { Vec2 } from '../core/vector';
import { vibrate as platformVibrate } from '../core/platform';

/** Radial dead zone retains analog precision after the threshold. */
export function joystickInput(x: number, y: number, deadzone: number): Vec2 {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) return { x: 0, y: 0 };
  const strength = (Math.min(1, magnitude) - deadzone) / (1 - deadzone);
  return { x: (x / magnitude) * strength, y: (y / magnitude) * strength };
}
export function installAccessibility(
  settings: Settings,
  events: EventBus,
  changed: () => void,
): void {
  const panel = document.querySelector('#settings-dialog')!;
  for (const [id, label, description] of [
    ['reducedFlashing', 'Reduced flashing', 'Steady immunity outlines and subdued impact effects'],
    [
      'highContrast',
      'High contrast indicators',
      'Bright outlines with symbols for gravity and hazards',
    ],
    ['haptics', 'Vibration', 'Brief feedback on supported devices'],
  ] as const) {
    const row = document.createElement('label');
    row.className = 'setting-row';
    row.innerHTML = `<span>${label}<small>${description}</small></span><input type="checkbox" id="${id}">`;
    const input = row.querySelector('input')!;
    input.checked = settings[id];
    input.onchange = () => {
      settings[id] = input.checked;
      changed();
    };
    panel.append(row);
  }
  for (const [id, label, min, max, step] of [
    ['musicVolume', 'Music volume', 0, 1, 0.05],
    ['uiScale', 'Text size', 1, 1.4, 0.1],
    ['joystickScale', 'Joystick size', 0.8, 1.3, 0.1],
    ['joystickDeadzone', 'Joystick dead zone', 0, 0.35, 0.05],
  ] as const) {
    const row = document.createElement('label');
    row.className = 'setting-row';
    row.innerHTML = `<span>${label}<small></small></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;
    const input = row.querySelector('input')!;
    input.value = String(settings[id]);
    const display = () => {
      row.querySelector('small')!.textContent = `${Math.round(settings[id] * 100)}%`;
    };
    input.oninput = () => {
      settings[id] = Number(input.value);
      display();
      changed();
    };
    display();
    panel.append(row);
  }
  const row = document.createElement('label');
  row.className = 'setting-row';
  row.innerHTML =
    '<span>Frame rate<small>30 FPS saves rendering power</small></span><select aria-label="Frame rate"><option value="60">60 FPS</option><option value="30">30 FPS</option></select>';
  const select = row.querySelector('select')!;
  select.value = String(settings.frameRate);
  select.onchange = () => {
    settings.frameRate = Number(select.value);
    changed();
  };
  panel.append(row);
  let lastVibration = -Infinity;
  const vibrate = (duration: number) => {
    const now = performance.now();
    if (settings.haptics && !document.hidden && now - lastVibration > 120) {
      try {
        platformVibrate(duration);
        lastVibration = now;
      } catch {
        /* Unsupported device. */
      }
    }
  };
  events.on('gravityChanged', () => vibrate(12));
  events.on('wellCreated', () => vibrate(18));
  events.on('damaged', ({ player }) => {
    if (player) vibrate(25);
  });
}
