import { expect, test } from '@playwright/test';
import { generateMap } from '../../src/progression/map';

test('optional event combat begins from a choice and recovery returns to the unclaimed event', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  const current = generateMap('event-paths', 0).find((node) => node.type === 'event')!.id;
  await page.evaluate((current) => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    Object.assign(data.checkpoint, {
      seed: 'event-paths',
      current,
      phase: 'event',
      eventId: 'arena',
      message: 'An optional challenge awaits.',
      visited: [],
    });
    data.checkpoint.metrics.assisted = 1;
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  }, current);
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await expect(page.getByRole('heading', { name: 'The unlicensed arena' })).toBeVisible();
  await page.getByRole('button', { name: /Accept the trial/ }).click();
  await expect(page.locator('#timer')).not.toHaveText('00:00');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-event-arena.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await expect(page.getByRole('heading', { name: 'The unlicensed arena' })).toBeVisible();
  await page.getByRole('button', { name: /Decline the trial/ }).click();
  await expect(page.getByRole('button', { name: /Continue expedition/ })).toBeVisible();
  expect(errors).toEqual([]);
});
