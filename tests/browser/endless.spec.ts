import { expect, test } from '@playwright/test';

test('a deep frontier checkpoint exposes its combined rules without obscuring touch controls', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    data.profile.skills = ['endless'];
    data.checkpoint.mode = 'endless';
    data.checkpoint.rooms = 499;
    data.checkpoint.depth = 71;
    data.checkpoint.metrics.assisted = 1;
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await page.locator('[data-room]:enabled').click();
  await expect(page.locator('#status-effects')).toContainText('Frontier 500');
  await expect(page.locator('#status-effects')).toContainText('Planetary Collision');
  await expect(page.locator('#status-effects')).toContainText('Gravity Storm');
  await page.getByRole('button', { name: 'Gravity up', exact: true }).click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-frontier.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
