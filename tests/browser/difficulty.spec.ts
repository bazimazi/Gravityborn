import { expect, test } from '@playwright/test';

test('difficulty selection explains resource pressure and boss traps before starting', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.locator('#run-difficulty').selectOption('5');
  await expect(page.locator('#difficulty-description')).toContainText('boss repulsion traps');
  await expect(page.locator('#difficulty-description')).toContainText('80%');
  await page.locator('#run-difficulty').selectOption('6');
  await expect(page.locator('#difficulty-description')).toContainText('vortices');
  await expect(page.locator('#difficulty-description')).toContainText('70%');
  await page.locator('#run-difficulty').selectOption('0');
  await expect(page.locator('#difficulty-description')).toContainText('Standard enemy strength');
});
