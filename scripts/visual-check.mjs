import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [name, options] of [
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
  ['phone', devices['Pixel 7']],
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5180');
  await page.getByRole('button', { name: 'Learn by playing', exact: true }).click();
  await page.screenshot({ path: `artifacts/${name}-tutorial.png`, fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
  await page.screenshot({ path: `artifacts/${name}-map.png`, fullPage: true });
  await page.locator('[data-room]:enabled').click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.screenshot({ path: `artifacts/${name}-run.png`, fullPage: true });
  await context.close();
}
await browser.close();
