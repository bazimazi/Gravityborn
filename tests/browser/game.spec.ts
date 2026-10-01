import { expect, test, type Page } from '@playwright/test';
import { newProfile } from '../../src/progression/profile';

interface Snapshot {
  state: string;
  time: number;
  health: number;
  position: { x: number; y: number };
  direction: { x: number; y: number };
  fields: number;
  bodies: number;
  stats: { kills: number; flips: number; wells: number };
  move: { x: number; y: number };
}
const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => (window as unknown as { __gravityborn: () => Snapshot }).__gravityborn());

test('observatory purchases equipment and research, then starts a contracted run', async ({
  page,
}) => {
  await page.goto('/');
  const profile = newProfile();
  profile.shards = 100;
  profile.research = 20;
  await page.evaluate(
    (profile) => localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, profile })),
    profile,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.getByText('Codex & collection', { exact: true }).click();
  await page.getByText('Materials · 9 / 9', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Metal', exact: true })).toBeVisible();
  await page.getByText('Research · six progression trees', { exact: true }).click();
  await page.locator('[data-research="field_theory"]').click();
  await expect(page.locator('[data-research="field_theory"]')).toBeDisabled();
  await page.getByText('Equipment · six slots', { exact: true }).click();
  await page.getByText('Craft equipment · 50 designs', { exact: true }).click();
  await page.locator('[data-craft="basalt_core"]').click();
  await expect(page.locator('[data-equip-slot="core"]')).toHaveValue('basalt_core');
  await page.locator('#run-contract').selectOption('locked');
  await page.locator('#run-mode').selectOption('quick');
  await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
  await page.locator('[data-room]:enabled').click();
  await expect(page.getByRole('button', { name: 'Gravity left', exact: true })).toBeDisabled();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gravityborn.save')!).payload.profile,
  );
  expect(saved.equipment.basalt_core).toBe(1);
  expect(saved.skills).toContain('field_theory');
  expect(saved.shards).toBe(88);
});

test('starts a seeded expedition and restricts powers to the current build', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  await expect(page.locator('[data-room]:enabled')).toHaveCount(1);
  await page.locator('[data-room]:enabled').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#ability-select option')).toHaveCount(2);
  expect((await snapshot(page)).state).toBe('playing');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  expect((await snapshot(page)).state).toBe('paused');
});

test('reloads a saved route and starts the same room without losing progression', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gravityborn.save')!).payload.checkpoint,
  );
  await page.locator('[data-room]:enabled').click();
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.getByRole('button', { name: 'Resume saved route', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gravityborn.save')!).payload.checkpoint,
  );
  expect(after.id).toBe(before.id);
  expect(after.seed).toBe(before.seed);
  expect(after.build).toEqual(before.build);
  await page.locator('[data-room]:enabled').click();
  expect((await snapshot(page)).state).toBe('playing');
});

test('selects and casts a physical power with visible energy and cooldown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.locator('#ability-select').selectOption('zero');
  await page.locator('#ability-cast').click();
  await expect(page.locator('#ability-cast')).toBeDisabled();
  await expect(page.locator('#ability-description')).toContainText('Existing momentum');
  expect((await snapshot(page)).fields).toBeGreaterThan(0);
  await expect(page.locator('#energy-value')).not.toHaveText('100 / 100 ENERGY');
});

test('phone landscape keeps gameplay and touch controls within the viewport', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(!isMobile, 'Landscape touch layout is a phone check.');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  const bounds = (await page
    .getByRole('button', { name: 'Gravity left', exact: true })
    .boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-landscape.png` });
});

test('starts, moves, changes gravity, casts a well, pauses and restarts', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Enter the chamber/ })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-ready.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  const initial = await snapshot(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  expect((await snapshot(page)).position.x).toBeGreaterThan(initial.position.x + 10);
  await page.getByRole('button', { name: 'Gravity up', exact: true }).click();
  await expect(page.locator('#gravity-name')).toHaveText('UP');
  expect((await snapshot(page)).direction).toEqual({ x: 0, y: -1 });
  const bounds = (await page.locator('#game').boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width * 0.67, bounds.y + bounds.height * 0.5);
  expect((await snapshot(page)).fields).toBe(1);
  await expect(page.getByRole('button', { name: 'Place gravity well' })).toBeDisabled();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-playing.png` });
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('button', { name: 'Resume experiment' })).toBeVisible();
  const time = (await snapshot(page)).time;
  await page.waitForTimeout(250);
  expect((await snapshot(page)).time).toBe(time);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  const reset = await snapshot(page);
  expect(reset.health).toBe(100);
  expect(reset.fields).toBe(0);
  expect(reset.stats).toMatchObject({ kills: 0, flips: 0, wells: 0 });
  expect(errors).toEqual([]);
});

test('focused control buttons retain native keyboard activation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await expect(page.getByRole('button', { name: 'Gravity up', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Gravity up', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#gravity-name')).toHaveText('UP');
  expect((await snapshot(page)).stats.wells).toBe(0);
  await page.getByRole('button', { name: 'Place gravity well' }).focus();
  await page.keyboard.press('Enter');
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    await expect(page.locator('#well-state')).toHaveText('TAP ARENA');
  } else expect((await snapshot(page)).fields).toBe(1);
});

test('settings persist and closing a modal resumes only an active game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduced motion').check();
  await page.getByLabel('Left-handed controls').check();
  await page.getByLabel('Reduced flashing').check();
  await page.getByLabel('High contrast indicators').check();
  await page.getByLabel('Text size', { exact: true }).fill('1.4');
  await page.getByLabel('Joystick size', { exact: true }).fill('1.3');
  await page.getByLabel('Frame rate', { exact: true }).selectOption('30');
  await page.getByRole('button', { name: 'Close settings' }).click();
  expect((await snapshot(page)).state).toBe('ready');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Reduced motion')).toBeChecked();
  await expect(page.getByLabel('Left-handed controls')).toBeChecked();
  await expect(page.getByLabel('Reduced flashing')).toBeChecked();
  await expect(page.getByLabel('Text size', { exact: true })).toHaveValue('1.4');
  await expect(page.getByLabel('Frame rate', { exact: true })).toHaveValue('30');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  expect((await snapshot(page)).state).toBe('paused');
  await page.getByRole('button', { name: 'Close instructions' }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
});

test('largest text and joystick remain usable on a 320 pixel viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Text size', { exact: true }).fill('1.4');
  await page.getByLabel('Joystick size', { exact: true }).fill('1.3');
  await expect(page.getByLabel('Frame rate', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.getByRole('button', { name: 'Gravity right', exact: true }).click();
  await expect(page.locator('#gravity-name')).toHaveText('RIGHT');
});

test('clears held input when focus is lost and supports inspector frame stepping', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await snapshot(page)).state).toBe('paused');
  await page.keyboard.up('KeyD');
  await page.getByRole('button', { name: 'Resume experiment' }).click();
  await page.waitForTimeout(50);
  expect((await snapshot(page)).move).toEqual({ x: 0, y: 0 });
  await page.keyboard.press('Backquote');
  await expect(page.getByRole('dialog', { name: 'Physics inspector' })).toBeVisible();
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'Step physics frame' }).click();
  expect((await snapshot(page)).time - before.time).toBeCloseTo(1 / 120, 6);
  await page.getByRole('button', { name: 'Spawn at center' }).click();
  expect((await snapshot(page)).bodies).toBe(before.bodies + 1);
});

test('touch joystick supports simultaneous gravity input and cancellation', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(
    !isMobile || browserName !== 'chromium',
    'CDP multitouch runs on the Android emulation.',
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).tap();
  const pad = (await page.locator('#joystick').boundingBox())!;
  const up = (await page.getByRole('button', { name: 'Gravity up', exact: true }).boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const first = { x: pad.x + pad.width * 0.78, y: pad.y + pad.height / 2, id: 1 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await page.waitForTimeout(100);
  expect((await snapshot(page)).move.x).toBeGreaterThan(0.5);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, { x: up.x + up.width / 2, y: up.y + up.height / 2, id: 2 }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [first] });
  await expect(page.locator('#gravity-name')).toHaveText('UP');
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(50);
  expect((await snapshot(page)).move).toEqual({ x: 0, y: 0 });
});
