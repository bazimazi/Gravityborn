import { expect, test } from '@playwright/test';

test('legacy endless discoveries recover progression and the current hidden route across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    const markers = Array.from({ length: 2500 }, (_, depth) => `secret:0:${depth}`);
    Object.assign(data.profile, {
      shards: 1234,
      research: 56,
      runs: 8,
      wins: 2,
      skills: ['endless'],
      equipment: { hollow_core: 3 },
      metrics: { secretsRevealed: 2500 },
      discoveries: [...markers, 'lore:secret:0', 'planet:0'],
    });
    Object.assign(data.checkpoint, {
      mode: 'endless',
      depth: 3000,
      discoveries: [...markers, 'secret:0:3000', 'lore:secret:0', 'planet:0'],
      metrics: { secretsRevealed: 2501, assisted: 1 },
    });
    data.checkpoint.build.currency = 75;
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  });
  // An assisted legacy fixture verifies migration, not an earned deep-frontier run.
  for (let reload = 0; reload < 2; reload++) {
    await page.reload();
    await page.getByRole('button', { name: 'Progression hub' }).click();
    await expect(page.locator('#profile-dialog')).toContainText(
      '1234 GRAVITY SHARDS · 56 RESEARCH · 8 RUNS · 2 WINS',
    );
    await page.getByRole('button', { name: 'Resume saved route' }).click();
    await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SECRET', exact: true })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gravityborn.save')!));
    expect(saved.version).toBe(2);
    expect(saved.payload.profile).toMatchObject({
      shards: 1234,
      research: 56,
      runs: 8,
      wins: 2,
      skills: ['endless'],
      equipment: { hollow_core: 3 },
      metrics: { secretsRevealed: 2500 },
      discoveries: ['lore:secret:0', 'planet:0'],
    });
    expect(saved.payload.checkpoint).toMatchObject({
      depth: 3000,
      discoveries: ['secret:0:3000', 'lore:secret:0', 'planet:0'],
      metrics: { secretsRevealed: 2501, assisted: 1 },
      build: { currency: 75 },
    });
  }
});
