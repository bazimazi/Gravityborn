import { expect, test, type Page } from '@playwright/test';

const sizes = [
  [1512, 509],
  [1366, 768],
  [1440, 1000],
  [768, 1024],
  [390, 600],
  [320, 568],
  [844, 390],
] as const;
async function fitsViewport(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const { x, y, width, height, bottom, right } = document
        .querySelector(selector)!
        .getBoundingClientRect();
      return { x, y, width, height, bottom, right };
    };
    return {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      stage: rect('#stage'),
      canvas: rect('#game'),
      controls: rect('#controls'),
      powers: rect('.ability-bar'),
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 1);
  expect(metrics.stage.height).toBeGreaterThanOrEqual(160);
  for (const box of [metrics.stage, metrics.canvas, metrics.controls, metrics.powers]) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(metrics.width + 1);
    expect(box.bottom).toBeLessThanOrEqual(metrics.height + 1);
  }
}
for (const [width, height] of sizes)
  test(`arena and start actions fit ${width} × ${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('#start')).toBeVisible();
    await fitsViewport(page);
    expect(
      await page.locator('#overlay').evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
    ).toBe(true);
    const overlay = (await page.locator('#overlay').boundingBox())!;
    for (const selector of [
      '#start',
      '[data-run-action="new"]',
      '[data-training="start"]',
      '#intro-help',
    ]) {
      const button = (await page.locator(selector).boundingBox())!;
      expect(button.y).toBeGreaterThanOrEqual(overlay.y);
      expect(button.y + button.height).toBeLessThanOrEqual(overlay.y + overlay.height + 1);
      expect(button.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `artifacts/${testInfo.project.name}-layout-${width}x${height}.png`,
    });
    await page.locator('#start').click();
    await expect(page.locator('#overlay')).toBeHidden();
    await fitsViewport(page);
    await page.getByRole('button', { name: 'Gravity right', exact: true }).click();
    await expect(page.locator('#gravity-name')).toHaveText('RIGHT');
  });

test('power details stay accessible without changing arena height, and pause then resume play', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/');
  await page.locator('#start').click();
  await page.locator('#ability-select').selectOption('tension_release');
  const stage = (await page.locator('#stage').boundingBox())!;
  await fitsViewport(page);
  await page.getByRole('button', { name: 'About selected power' }).click();
  await expect(page.getByRole('heading', { name: 'Tension Release', exact: true })).toBeVisible();
  await expect(page.locator('#ability-details')).toContainText('Requires a tether-creating power');
  const state = () =>
    page.evaluate(
      () => (window as unknown as { __gravityborn: () => { state: string } }).__gravityborn().state,
    );
  expect(await state()).toBe('paused');
  await page.getByRole('button', { name: 'Close power details' }).click();
  expect(await state()).toBe('playing');
  expect((await page.locator('#stage').boundingBox())!.height).toBe(stage.height);
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.getByRole('button', { name: 'About selected power' }).click();
  await page.getByRole('button', { name: 'Close power details' }).click();
  expect(await state()).toBe('paused');
});

test('large text, live effects and rotation preserve a usable arena', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Text size', { exact: true }).fill('1.4');
  await page.getByLabel('Joystick size', { exact: true }).fill('1.3');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await fitsViewport(page);
  expect(await page.locator('#overlay').evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(
    true,
  );
  await page.locator('#start').click();
  await page.keyboard.press('Backquote');
  await page.locator('#debug-relic').selectOption('full_spectrum');
  await page.locator('#debug-give-relic').click();
  await page.getByRole('button', { name: 'Close physics inspector' }).click();
  await expect(page.locator('#status-effects')).toContainText('Full Spectrum');
  const badge = await page.locator('#status-effects').evaluate((e) => {
    const { x, y, width, height } = e.querySelector('span')!.getBoundingClientRect();
    return { x: x + width / 2, y: y + height / 2 };
  });
  await page.mouse.click(badge.x, badge.y);
  await expect(page.getByRole('button', { name: 'Place gravity well' })).toBeDisabled();
  await fitsViewport(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await fitsViewport(page);
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-layout-scaled-landscape.png` });
  await page.getByRole('button', { name: 'Resume experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Gravity left', exact: true }).click();
  await expect(page.locator('#gravity-name')).toHaveText('LEFT');
  const arrow = (await page
    .getByRole('button', { name: 'Gravity left', exact: true })
    .boundingBox())!;
  if (testInfo.project.name !== 'desktop') {
    expect(arrow.width).toBeGreaterThanOrEqual(44);
    expect(arrow.height).toBeGreaterThanOrEqual(44);
  }
});

test('training instructions and controls fit a small phone and landscape rotation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Text size', { exact: true }).fill('1.4');
  await page.getByLabel('Joystick size', { exact: true }).fill('1.3');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Learn by playing', exact: true }).click();
  await expect(page.locator('#tutorial-guide')).toBeVisible();
  await fitsViewport(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await fitsViewport(page);
  await expect(page.locator('#status-effects')).toContainText('Training shield');
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-layout-training-landscape.png`,
  });
  await page.keyboard.down('d');
  await expect(page.locator('#tutorial-next')).toBeEnabled();
  await page.keyboard.up('d');
  await page.locator('#tutorial-next').click();
  await expect(page.locator('#tutorial-title')).toContainText('2 / 7');
  await fitsViewport(page);
});
