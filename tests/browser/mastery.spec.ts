import { expect, test } from '@playwright/test';
import { newProfile } from '../../src/progression/profile';
import { freshMastery } from '../../src/progression/mastery';

test('control powers show attainable mastery objectives and restore their progress', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const profile = newProfile();
  profile.abilityMastery.tether_cut = {
    ...freshMastery(),
    casts: 50,
    controlTargets: 100,
    controlRooms: 3,
    controlBosses: 1,
    controlPeak: 3,
    wins: 1,
  };
  await page.evaluate(
    (profile) => localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, profile })),
    profile,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.getByText('Ability mastery', { exact: true }).click();
  const cut = page.locator('[data-mastery="tether_cut"]');
  await expect(cut).toContainText('Cut the Lines · 5 / 5');
  await expect(cut).toContainText('Intervention: 100 / 100');
  await expect(cut).toContainText('Precision: 3 / 3');
  await expect(cut).not.toContainText('Cause 100 kills');
  await expect(page.locator('[data-mastery="pulse"]')).toContainText('Cause 100 kills');
  await expect(page.locator('[data-mastery="gyroscopic_brake"]')).toContainText(
    'stop spinning bodies',
  );
  await cut.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  expect(await cut.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-control-mastery.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close progression' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.getByText('Ability mastery', { exact: true }).click();
  await expect(cut).toContainText('Cut the Lines · 5 / 5');
});
