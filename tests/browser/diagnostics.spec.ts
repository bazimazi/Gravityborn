import { expect, test } from '@playwright/test';
import { newProfile } from '../../src/progression/profile';
import { recordDiagnostic } from '../../src/core/diagnostics';

test('chamber diagnostics display outcomes, persist opt-out and clear local records', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const profile = newProfile();
  for (const region of ['facility', 'crystal', 'dead_planet']) {
    const subject = `campaign:${region}:combat`;
    for (let i = 0; i < 3; i++)
      recordDiagnostic(profile.diagnostics, { event: 'RoomStarted', subject, value: 100 });
    recordDiagnostic(profile.diagnostics, { event: 'RoomCleared', subject, value: 40 });
    recordDiagnostic(profile.diagnostics, { event: 'RoomFailed', subject, value: 20 });
    recordDiagnostic(profile.diagnostics, { event: 'RoomDamage', subject, value: 90 });
  }
  await page.evaluate(
    (profile) => localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, profile })),
    profile,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  const panel = page
    .locator('details')
    .filter({ has: page.locator('[data-run-action="diagnostics-clear"]') });
  await panel.locator('summary').click();
  await expect(panel.locator('article')).toHaveCount(3);
  await expect(panel.locator('article').first()).toContainText(
    '3 attempts · 1 cleared · 1 defeated · 0 abandoned',
  );
  await expect(panel.locator('article').first()).toContainText(
    '30 average damage received · 40s average clear',
  );
  await panel
    .locator('.codex-grid')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  for (const card of await panel.locator('article').all()) {
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-chamber-diagnostics.png`,
    fullPage: true,
  });
  await panel.getByRole('button', { name: 'Disable recording', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub', exact: true }).click();
  await panel.locator('summary').click();
  await expect(panel.getByRole('button', { name: 'Enable recording', exact: true })).toBeVisible();
  await expect(panel.locator('article')).toHaveCount(3);
  await panel.getByRole('button', { name: 'Clear diagnostics', exact: true }).click();
  await expect(panel).toContainText('No chamber outcomes recorded yet.');
  await expect(panel.locator('article')).toHaveCount(0);
});
