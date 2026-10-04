import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('a legacy long fallback build resumes, chooses its next upgrade and survives export/reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    data.profile.shards = 42;
    Object.assign(data.checkpoint.build, {
      level: 1501,
      pending: 1,
      currency: 73,
      passives: Array.from(
        { length: 1500 },
        (_, index) => ['integrity', 'recovery', 'cooling', 'force'][index % 4],
      ),
      choices: [{ id: 'passive:integrity', kind: 'passive', target: 'integrity' }],
    });
    data.checkpoint.metrics.assisted = 1;
    localStorage.removeItem('gravityborn.save.backup');
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await expect(page.locator('#profile-dialog')).toContainText('42 GRAVITY SHARDS');
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  const choice = page.locator('[data-upgrade="passive:integrity"]');
  await expect(choice).toContainText('LEVEL 375 → 376');
  await choice.click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  const file = await pending;
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8')).payload;
  expect(exported.checkpoint.build.passives).toHaveLength(1501);
  expect(
    exported.checkpoint.build.passives.filter((id: string) => id === 'integrity'),
  ).toHaveLength(376);
  expect(exported.checkpoint.build).toMatchObject({ level: 1501, pending: 0, currency: 73 });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  await page.locator('[data-room]:enabled').click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(page.locator('#level-value')).toHaveText('LEVEL 1501');
  await expect(page.locator('#health-value')).toHaveText('120 / 2000');
});

test('the maximum saved level stays playable and shows the completed growth limit', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    data.checkpoint.build.level = 10000;
    data.checkpoint.metrics.assisted = 1;
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await page.locator('[data-room]:enabled').click();
  await expect(page.locator('#level-value')).toHaveText('LEVEL 10000');
  await expect(page.locator('#xp-value')).toHaveText('MAXIMUM LEVEL');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume experiment' })).toBeVisible();
});
