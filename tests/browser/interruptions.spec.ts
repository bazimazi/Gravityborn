import { expect, test, type Page } from '@playwright/test';

interface Snapshot {
  state: string;
  time: number;
  move: { x: number; y: number };
  expedition: { pending: number };
}
const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => (window as unknown as { __gravityborn: () => Snapshot }).__gravityborn());

async function interrupt(page: Page, kind: 'blur' | 'hidden'): Promise<void> {
  await page.evaluate((kind) => {
    if (kind === 'blur') window.dispatchEvent(new Event('blur'));
    else {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  }, kind);
}
async function foreground(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}
async function expectFrozen(page: Page): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).state).toBe('paused');
  const before = await snapshot(page);
  await page.waitForTimeout(250);
  expect(await snapshot(page)).toMatchObject({
    state: 'paused',
    time: before.time,
    move: { x: 0, y: 0 },
  });
}

for (const kind of ['blur', 'hidden'] as const) {
  for (const dialog of [
    { open: 'How to play', close: 'Close instructions', selector: '#help-dialog' },
    {
      open: 'About selected power and current effects',
      close: 'Close power details',
      selector: '#ability-dialog',
    },
  ]) {
    test(`${kind} during ${dialog.open} cancels automatic resume until the player resumes`, async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /Enter the chamber/ }).click();
      await page.keyboard.down('KeyD');
      await page.getByRole('button', { name: dialog.open, exact: true }).click();
      await interrupt(page, kind);
      // A system dismissal can close the dialog before the app returns to the foreground.
      await page.locator(dialog.selector).evaluate((element: HTMLDialogElement) => element.close());
      await expectFrozen(page);
      await foreground(page);
      await expectFrozen(page);
      await page.keyboard.up('KeyD');
      await page.getByRole('button', { name: 'Resume experiment', exact: true }).click();
      await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
      expect((await snapshot(page)).move).toEqual({ x: 0, y: 0 });
    });
  }
}

async function enterWithUpgrade(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  // Award one synthetic level at the next room's build application, through the real XP API.
  await page.evaluate(async () => {
    const path = '/src/progression/build.ts';
    const { RunBuild } = await import(path);
    const apply = RunBuild.prototype.apply;
    RunBuild.prototype.apply = function () {
      apply.call(this);
      RunBuild.prototype.apply = apply;
      this.gainXP(this.threshold);
    };
  });
  await page.locator('[data-room]:enabled').click();
  await expect(page.getByRole('heading', { name: 'Choose your next power' })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).state).toBe('paused');
}

test('an uninterrupted combat upgrade resumes automatically', async ({ page }) => {
  await enterWithUpgrade(page);
  await page.locator('[data-upgrade]').first().click();
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
  await expect(page.locator('#overlay')).toBeHidden();
});

test('an interrupted combat upgrade leaves an explicit resume action after the final choice', async ({
  page,
}) => {
  await enterWithUpgrade(page);
  await page
    .getByRole('button', { name: 'About selected power and current effects', exact: true })
    .click();
  await interrupt(page, 'blur');
  await foreground(page);
  await page.getByRole('button', { name: 'Close power details' }).click();
  await page.locator('[data-upgrade]').first().click();
  expect((await snapshot(page)).expedition.pending).toBe(0);
  await expectFrozen(page);
  await expect(page.getByRole('button', { name: 'Resume experiment', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume experiment', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
});
