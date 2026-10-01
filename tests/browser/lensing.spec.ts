import { expect, test } from '@playwright/test';

for (const power of ['black_hole', 'beacon', 'constellation', 'polarity', 'densify'])
  test(`${power} renders and remains usable with visual accessibility settings`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: /Enter the chamber/ }).click();
    await page.keyboard.press('Backquote');
    await page.locator('#debug-ability').selectOption(power);
    await page.getByRole('button', { name: 'Give ability', exact: true }).click();
    await page.getByRole('button', { name: 'Close physics inspector' }).click();
    await page.locator('#ability-select').selectOption(power);
    await page.locator('#ability-cast').click();
    await expect(page.locator('#energy-value')).not.toHaveText('100 / 100 ENERGY');
    await page.screenshot({
      path: `artifacts/${testInfo.project.name}-${power}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Reduced motion').check();
    await page.getByLabel('Reduced flashing').check();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.screenshot({
      path: `artifacts/${testInfo.project.name}-${power}-reduced.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
