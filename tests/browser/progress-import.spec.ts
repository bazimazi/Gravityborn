import { expect, test, type Page } from '@playwright/test';
import { checksum } from '../../src/core/save';
import { newProfile } from '../../src/progression/profile';
import { readFile } from 'node:fs/promises';

const encode = (payload: unknown) =>
  JSON.stringify({ version: 2, checksum: checksum(JSON.stringify(payload)), payload });
async function existing(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
    Object.assign(data.profile, {
      shards: 250,
      research: 37,
      classes: ['manipulator', 'massborn'],
      selectedClass: 'massborn',
    });
    localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await page.locator('[data-room]:enabled').click();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  return page.evaluate(() => JSON.parse(localStorage.getItem('gravityborn.save')!).payload);
}
async function upload(page: Page, raw: string, name = 'progress.json') {
  await page.locator('#import-save').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  });
}
async function exported(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  const download = await pending;
  return JSON.parse(await readFile((await download.path())!, 'utf8')).payload;
}

test('invalid progress files keep the current profile, route, active play and stored records', async ({
  page,
}) => {
  const baseline = await existing(page);
  const liveBefore = await exported(page);
  const state = await page.evaluate(() => (window as any).__gravityborn());
  const records = await page.evaluate(() => [
    localStorage.getItem('gravityborn.save'),
    localStorage.getItem('gravityborn.save.backup'),
  ]);
  for (const [index, change] of [
    (data: any) => {
      data.profile.shards = -1;
    },
    (data: any) => {
      data.checkpoint.powers.levels.pulse = null;
    },
    (data: any) => {
      data.checkpoint.phase = 'event';
      data.checkpoint.current = null;
    },
  ].entries()) {
    const data = structuredClone(baseline);
    change(data);
    await upload(
      page,
      index === 0 ? JSON.stringify({ version: 1, ...data }) : encode(data),
      `bad-${index}.json`,
    );
    await expect(page.locator('#toast')).toContainText('This save could not be verified.');
    await expect(page.locator('#profile-dialog')).toContainText('250 GRAVITY SHARDS · 37 RESEARCH');
    expect(await page.evaluate(() => (window as any).__gravityborn())).toEqual(state);
    expect(
      await page.evaluate(() => [
        localStorage.getItem('gravityborn.save'),
        localStorage.getItem('gravityborn.save.backup'),
      ]),
    ).toEqual(records);
  }
  expect((await exported(page)).profile).toEqual(liveBefore.profile);
});

test('a rejected storage write keeps the previous live profile and expedition', async ({
  page,
}) => {
  const baseline = await existing(page);
  const liveBefore = await exported(page);
  const state = await page.evaluate(() => (window as any).__gravityborn());
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gravityborn.save') throw new Error('Import fixture: storage is full');
      original.call(this, key, value);
    };
  });
  const next = structuredClone(baseline);
  next.profile.shards = 999;
  next.checkpoint.seed = 'different-imported-route';
  await upload(page, encode(next));
  await expect(page.locator('#toast')).toContainText('Save import could not be stored.');
  await expect(page.locator('#profile-dialog')).toContainText('250 GRAVITY SHARDS · 37 RESEARCH');
  expect(await page.evaluate(() => (window as any).__gravityborn())).toEqual(state);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gravityborn.save')!).payload),
  ).toEqual(baseline);
  await page.evaluate(() => (window as any).__restoreStorage());
  expect((await exported(page)).profile).toEqual(liveBefore.profile);
});

test('a successful import ends the previous expedition and resumes only the imported route', async ({
  page,
}) => {
  const baseline = await existing(page);
  const next = structuredClone(baseline);
  next.profile.shards = 999;
  next.checkpoint.id = 'imported-route-fixture';
  next.checkpoint.seed = 'different-imported-route';
  next.checkpoint.build.currency = 73;
  await upload(page, encode(next));
  await expect(page.locator('#profile-dialog')).toContainText('999 GRAVITY SHARDS · 37 RESEARCH');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gravityborn().expedition))
    .toBeNull();
  await page.getByRole('button', { name: 'Close progression' }).click();
  await expect(page.getByRole('button', { name: 'Begin expedition', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__gravityborn().state)).toBe('ready');
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await expect(page.locator('#profile-dialog')).toContainText('999 GRAVITY SHARDS · 37 RESEARCH');
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gravityborn().expedition)).toMatchObject({
    seed: 'different-imported-route',
    currency: 73,
  });
});

test('newer backups remain protected and cannot be replaced through import', async ({ page }) => {
  const future = JSON.stringify({ version: 99, payload: { future: true } });
  await page.addInitScript((future) => {
    localStorage.setItem('gravityborn.save', 'damaged-primary');
    localStorage.setItem('gravityborn.save.backup', future);
  }, future);
  await page.goto('/');
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await expect(page.locator('#profile-dialog')).toContainText('SAVE: FUTURE');
  await upload(page, encode({ profile: { ...newProfile(), shards: 999 }, checkpoint: null }));
  await expect(page.locator('#toast')).toContainText('newer game version and cannot be replaced');
  await expect(page.locator('#profile-dialog')).toContainText('0 GRAVITY SHARDS');
  expect(
    await page.evaluate(() => [
      localStorage.getItem('gravityborn.save'),
      localStorage.getItem('gravityborn.save.backup'),
    ]),
  ).toEqual(['damaged-primary', future]);
});

test('pending file reads keep play paused and a failed read can be retried', async ({ page }) => {
  const baseline = await existing(page);
  const state = await page.evaluate(() => (window as any).__gravityborn());
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      return new Promise<string>((_, reject) => {
        (window as any).__rejectImport = () => {
          File.prototype.text = original;
          reject(new Error('Import fixture: file read failed'));
        };
      });
    };
  });
  await upload(page, encode(baseline));
  await expect(page.locator('#toast')).toContainText('Importing save');
  await expect(page.locator('#profile-dialog')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#profile-dialog')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gravityborn())).toEqual(state);
  await page.evaluate(() => (window as any).__rejectImport());
  await expect(page.locator('#toast')).toContainText('This save could not be read.');
  await expect(page.locator('#profile-dialog')).toHaveJSProperty('inert', false);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gravityborn.save')!).payload),
  ).toEqual(baseline);
  expect(await page.evaluate(() => (window as any).__gravityborn())).toEqual(state);
  await upload(page, encode(baseline));
  await expect(page.locator('#toast')).toContainText('Save imported.');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gravityborn().expedition))
    .toBeNull();
});
