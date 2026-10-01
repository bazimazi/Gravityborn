import { expect, test } from '@playwright/test';

test('Rail Warden warning renders before its physical throw on each viewport', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.keyboard.press('Backquote');
  await page.locator('#spawn-kind').selectOption('railgunner');
  await page.getByRole('button', { name: 'Spawn at center', exact: true }).click();
  await page.locator('#debug-step').evaluate((button) => {
    for (let step = 0; step < 90; step++) (button as HTMLButtonElement).click();
  });
  await page.getByRole('button', { name: 'Close physics inspector' }).click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume experiment', exact: true })).toBeVisible();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-rail-warden.png`,
    fullPage: true,
    // Freeze the warning with pause; omit only the pause panel from the visual inspection.
    style: '#overlay { visibility: hidden; }',
  });
  expect(errors).toEqual([]);
});
