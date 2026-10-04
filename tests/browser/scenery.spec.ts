import { expect, test } from '@playwright/test';
import { newProfile } from '../../src/progression/profile';
import { regions } from '../../src/content/regions';

for (const [index, region] of regions.entries())
  test(`${region.id} opens with its authored scenery and keeps accessibility controls usable`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(45000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const profile = newProfile();
    profile.skills.push('navigation', 'survey');
    await page.goto('/');
    await page.evaluate(
      (profile) =>
        localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, profile })),
      profile,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('High contrast').uncheck();
    await page.getByLabel('Reduced motion').uncheck();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
    await page.locator('#run-region').selectOption(String(index));
    await page.locator('#run-seed').fill('scenery-review');
    await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
    await page.locator('[data-room]:enabled').click();
    await page
      .locator('#game')
      .screenshot({ path: `artifacts/${testInfo.project.name}-scenery-${region.id}.png` });
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('High contrast').check();
    await page.getByLabel('Reduced motion').check();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await expect(page.locator('#game')).toBeVisible();
    expect(errors).toEqual([]);
  });
