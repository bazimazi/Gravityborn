import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:5180');
await page.getByRole('button', { name: /Enter the chamber/ }).click();
const bounds = await page.locator('#game').boundingBox();
const flips = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
const moves = ['KeyS', 'KeyD', 'KeyW', 'KeyA'];
for (let turn = 0; turn < 24; turn++) {
  const state = await page.evaluate(() => window.__gravityborn());
  if (state.state !== 'playing') break;
  await page.keyboard.press(flips[turn % 4]);
  if (turn % 4 === 0)
    await page.mouse.click(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.5);
  await page.keyboard.down(moves[turn % 4]);
  await page.waitForTimeout(1200);
  await page.keyboard.up(moves[turn % 4]);
  if (turn === 2) await page.screenshot({ path: 'artifacts/playtest-action.png' });
}
const result = await page.evaluate(() => window.__gravityborn());
console.log(JSON.stringify({ result, errors }));
await page.screenshot({ path: 'artifacts/playtest-result.png' });
await browser.close();
if (errors.length || !['won', 'lost'].includes(result.state))
  throw new Error('Browser playtest did not reach a clean end state.');
