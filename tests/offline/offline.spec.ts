import { test, expect } from '@playwright/test';

test('production build cold-starts offline, plays, and preserves settings and a saved route', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  expect(await page.evaluate(() => '__gravityborn' in window)).toBe(false);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduced flashing').check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.locator('#run-seed').fill('offline-recovery');
  await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Reduced flashing')).toBeChecked();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.locator('[data-run-action="resume"]').click();
  await page.locator('[data-room]:enabled').click();
  await page.getByRole('button', { name: 'Gravity left', exact: true }).click();
  await expect(page.locator('#gravity-name')).toHaveText('LEFT');
  await expect(page.locator('#timer')).not.toHaveText('00:00', { timeout: 5000 });
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  const fresh = await context.newPage();
  await fresh.goto('/');
  await expect(fresh.getByRole('button', { name: /Enter the chamber/ })).toBeVisible();
  expect(errors).toEqual([]);
});
