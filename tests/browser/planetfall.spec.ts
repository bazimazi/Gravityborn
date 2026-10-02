import { expect, test } from '@playwright/test';
import { newProfile } from '../../src/progression/profile';
import { challengeCode } from '../../src/progression/challenge-code';
import { planetaryRoute } from '../../src/content/modes';

test('unlocked Planetary Endless starts from a shared code without navigation research and survives reload', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const profile = newProfile();
  profile.skills.push('endless');
  await page.evaluate(
    (profile) => localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, profile })),
    profile,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.locator('#run-archive summary').click();
  await page.locator('#challenge-code').fill(
    challengeCode({
      seed: 'planetfall-browser',
      mode: 'planetary',
      classId: 'manipulator',
      biome: planetaryRoute()[0],
      contract: 'none',
      difficulty: 0,
    }),
  );
  await page.getByRole('button', { name: 'Use challenge code' }).click();
  await expect(page.locator('#run-mode')).toHaveValue('planetary');
  await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await page.locator('[data-room]:enabled').click();
  await expect(page.locator('#status-effects')).toContainText('Planetary Collision');
  await expect(page.locator('#status-effects')).toContainText('Frontier 1');
  await expect(page.locator('#ability-select option[value="planet_split"]')).toHaveText(
    'Planet Split 1',
  );
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-planetfall.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
