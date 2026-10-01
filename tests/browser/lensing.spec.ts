import { expect, test } from '@playwright/test';

test('void fields render with a dark core and remain usable with visual accessibility settings', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the chamber/ }).click();
  await page.keyboard.press('Backquote');
  await page.locator('#debug-ability').selectOption('black_hole');
  await page.getByRole('button', { name: 'Give ability', exact: true }).click();
  await page.getByRole('button', { name: 'Close physics inspector' }).click();
  await page.locator('#ability-select').selectOption('black_hole');
  await page.locator('#ability-cast').click();
  await expect(page.locator('#energy-value')).not.toHaveText('100 / 100 ENERGY');
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-black-hole.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduced motion').check();
  await page.getByLabel('Reduced flashing').check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-black-hole-reduced.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
