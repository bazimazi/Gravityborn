import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
await page.goto('http://127.0.0.1:5180');
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByLabel('Text size', { exact: true }).fill('1.4');
await page.getByLabel('Joystick size', { exact: true }).fill('1.3');
await page.getByRole('button', { name: 'Close settings' }).click();
console.log(
  await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => {
        const r = element.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < 0);
      })
      .map((element) => ({
        tag: element.tagName,
        id: element.id,
        class: element.className,
        right: element.getBoundingClientRect().right,
        text: element.textContent?.slice(0, 60),
      })),
  ),
);
await page.screenshot({ path: 'artifacts/accessibility-320.png', fullPage: true });
await browser.close();
