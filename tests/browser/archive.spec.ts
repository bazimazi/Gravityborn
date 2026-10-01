import { expect, test } from '@playwright/test';
import { replayRevision } from '../../src/progression/archive';
import { challengeCode } from '../../src/progression/challenge-code';

test('shared runs import, export, persist and prepare historical challenge rules', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.locator('#run-archive summary').click();
  const raw = JSON.stringify({
    format: 'gravityborn-run',
    version: 1,
    report: {
      id: 'shared',
      revision: replayRevision,
      recipe: {
        seed: 'daily:2025-01-10',
        mode: 'daily',
        contract: 'none',
        difficulty: 1,
        biome: 0,
        classId: 'manipulator',
      },
      loadout: '{}',
      outcome: 'victory',
      assisted: false,
      imported: false,
      elapsed: 60,
      score: 200,
      chain: 12,
      rooms: 7,
      depth: 0,
      powers: ['pulse'],
      relics: [],
      ghost: [],
    },
  });
  await page
    .locator('#import-run')
    .setInputFiles({ name: 'run.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await expect(page.locator('#archive-selection')).toContainText('imported / unverified');
  await expect(page.locator('#run-archive')).toContainText('LOCAL BEST · SCORE 0');
  await expect(page.locator('#shared-challenge-code')).toHaveValue(/^GB1\./);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected run' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gravityborn-run.json');
  await page.locator('#ghost-enabled').uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.locator('#run-archive summary').click();
  await expect(page.locator('#ghost-enabled')).not.toBeChecked();
  await expect(page.locator('#archive-selection')).toContainText('daily:2025-01-10');
  await page.getByRole('button', { name: 'Use these run rules' }).click();
  await expect(page.locator('#run-mode')).toHaveValue('daily');
  await expect(page.locator('#run-seed')).toHaveValue('daily:2025-01-10');
  await expect(page.locator('#mode-description')).toContainText('Archived daily challenge');
  await page.locator('#run-archive').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-archive.png`, fullPage: true });
  await page.getByRole('button', { name: 'Start selected class' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  const seed = await page.evaluate(() => (window as any).__gravityborn().expedition.seed);
  expect(seed).toBe('daily:2025-01-10');
});

test('challenge codes validate, respect unlocks and prepare historical dates without importing rewards', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.locator('#run-archive summary').click();
  const seedBefore = await page.locator('#run-seed').inputValue();
  await page.locator('#challenge-code').fill('GB1.damaged.0');
  await page.getByRole('button', { name: 'Use challenge code' }).click();
  await expect(page.locator('#run-seed')).toHaveValue(seedBefore);
  const recipe = {
    seed: 'coded-route',
    classId: 'manipulator',
    mode: 'endless' as const,
    contract: 'none' as const,
    difficulty: 0,
    biome: 0,
  };
  await page.locator('#challenge-code').fill(challengeCode(recipe));
  await page.getByRole('button', { name: 'Use challenge code' }).click();
  await expect(page.locator('#run-mode')).not.toHaveValue('endless');
  await page
    .locator('#challenge-code')
    .fill(challengeCode({ ...recipe, mode: 'daily', seed: 'daily:2025-01-10' }, 'older-revision'));
  await page.getByRole('button', { name: 'Use challenge code' }).click();
  await expect(page.locator('#run-seed')).toHaveValue('daily:2025-01-10');
  await expect(page.locator('#mode-description')).toContainText('different game revision');
  await page.locator('#run-archive summary').click();
  await expect(page.locator('#run-archive')).toContainText('No recorded runs yet.');
  await page.getByRole('button', { name: 'Start selected class' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  const seed = await page.evaluate(() => (window as any).__gravityborn().expedition.seed);
  expect(seed).toBe('daily:2025-01-10');
});
