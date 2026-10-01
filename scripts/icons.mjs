import { chromium } from '@playwright/test';
import { mkdir, readdir, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
// Original vector artwork rendered at each required size, with a mask-safe margin.
const browser = await chromium.launch();
const page = await browser.newPage();
await mkdir('public', { recursive: true });
for (const size of [192, 512, 1024]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="bg"><stop stop-color="#20314e"/><stop offset="1" stop-color="#080d18"/></radialGradient><radialGradient id="core" cx=".3" cy=".3"><stop stop-color="#ecfffc"/><stop offset=".3" stop-color="#92f2df"/><stop offset="1" stop-color="#2e9dbe"/></radialGradient></defs><rect width="512" height="512" fill="url(#bg)"/><circle cx="256" cy="256" r="167" fill="none" stroke="#405671" stroke-width="2"/><ellipse cx="256" cy="256" rx="174" ry="70" transform="rotate(-35 256 256)" stroke="#b9a3ff" fill="none" stroke-width="15"/><circle cx="256" cy="256" r="78" fill="url(#core)"/><path d="M350 336l-12 30 33-5z" fill="#f8d094"/><circle cx="155" cy="145" r="9" fill="#f8d094"/></svg>`,
  );
  await page.screenshot({ path: `public/icon-${size}.png` });
}
if (existsSync('android/app/src/main/res')) {
  for (const [density, size] of [
    ['mdpi', 48],
    ['hdpi', 72],
    ['xhdpi', 96],
    ['xxhdpi', 144],
    ['xxxhdpi', 192],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    for (const name of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'])
      await page.screenshot({ path: `android/app/src/main/res/mipmap-${density}/${name}.png` });
  }
}
if (existsSync('ios/App/App/Assets.xcassets'))
  await copyFile(
    'public/icon-1024.png',
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  );
await page.setViewportSize({ width: 2732, height: 2732 });
await page.addStyleTag({
  content: 'body{background:#080d18;display:grid;place-items:center}svg{width:512px;height:512px}',
});
const splash = await page.screenshot();
if (existsSync('ios/App/App/Assets.xcassets/Splash.imageset'))
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    await writeFile(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, splash);
if (existsSync('android/app/src/main/res'))
  for (const folder of await readdir('android/app/src/main/res')) {
    const target = `android/app/src/main/res/${folder}/splash.png`;
    if (existsSync(target)) await writeFile(target, splash);
  }
await browser.close();
