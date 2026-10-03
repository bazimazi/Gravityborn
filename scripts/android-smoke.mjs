import { _android as android, expect } from '@playwright/test';
import { rm, writeFile } from 'node:fs/promises';
// An unavailable/crashed WebView can otherwise leave discovery waiting forever.
const deadline = setTimeout(() => {
  console.error('Native smoke exceeded three minutes; inspect emulator logcat and window focus.');
  process.exit(1);
}, 180_000);
await rm('artifacts/android-native-result.json', { force: true });
const devices = await android.devices();
const device = devices.find((device) => device.serial() === 'emulator-5556');
if (!device) throw new Error('Expected isolated emulator-5556. No physical devices will be used.');
await device.shell('input keyevent 224');
await device.shell('wm dismiss-keyguard');
const webview = await device.webView({ pkg: 'com.bazimazi.gravityborn' });
const page = await webview.page();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await expect(page.getByRole('button', { name: /Enter the chamber/ })).toBeVisible();
const assertLayout = async () => {
  const visible = await page.evaluate(() => {
    const arena = document.querySelector('#stage').getBoundingClientRect();
    const powers = document.querySelector('.ability-bar').getBoundingClientRect();
    return (
      document.documentElement.scrollWidth <= innerWidth + 1 &&
      document.documentElement.scrollHeight <= innerHeight + 1 &&
      arena.height >= 160 &&
      arena.top >= 0 &&
      powers.bottom <= innerHeight + 1
    );
  });
  if (!visible) throw new Error('Packaged arena or controls overflow the native viewport.');
};
await assertLayout();
await expect(page.locator('#overlay')).toHaveJSProperty('scrollTop', 0);
if (!(await page.locator('#overlay').evaluate((e) => e.scrollHeight <= e.clientHeight + 1)))
  throw new Error('Packaged intro requires scrolling to reach its start actions.');
if (
  (await page.locator('#debug-ability option').count()) < 100 ||
  (await page.locator('#debug-relic option').count()) < 100
)
  throw new Error('The installed APK does not contain the complete launch catalogs.');
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByLabel('Reduced flashing').check();
await page.getByRole('button', { name: 'Close settings' }).click();
await page.getByRole('button', { name: 'Progression hub' }).click();
await page.locator('#run-archive summary').click();
await page.locator('#ghost-enabled').uncheck();
await page.getByRole('button', { name: 'Export save', exact: true }).click();
const focusedWindow = async () =>
  (await device.shell('dumpsys window'))
    .toString()
    .split('\n')
    .find((line) => line.includes('mCurrentFocus=')) ?? '';
// The system resolver's first cold-start can exceed the web assertion timeout.
await expect.poll(focusedWindow, { timeout: 30_000 }).toContain('ChooserActivity');
const exported = JSON.parse(
  (
    await device.shell('run-as com.bazimazi.gravityborn cat cache/gravityborn-save.json')
  ).toString(),
);
if (exported.version !== 2 || !exported.payload.profile)
  throw new Error('Native JSON export was not written');
await device.shell('input keyevent 4');
await expect.poll(focusedWindow, { timeout: 30_000 }).toContain('com.bazimazi.gravityborn');
await expect(page.locator('#run-seed')).toBeVisible();
await page.locator('#run-seed').fill('offline-recovery');
await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
await page.locator('[data-room]:enabled').click();
await page.getByRole('button', { name: 'Gravity left', exact: true }).click();
await expect(page.locator('#gravity-name')).toHaveText('LEFT');
await expect(page.locator('#timer')).not.toHaveText('00:00');
await page.getByRole('button', { name: 'Pause game', exact: true }).click();
await assertLayout();
await page.getByRole('button', { name: 'About selected power' }).click();
await expect(page.locator('#ability-details')).not.toBeEmpty();
await expect(page.getByRole('heading', { name: 'Current effects', exact: true })).toBeVisible();
await expect(page.locator('#effect-details')).not.toBeEmpty();
await page.getByRole('button', { name: 'Close power details' }).click();
await expect(page.getByRole('button', { name: 'Resume game', exact: true })).toBeVisible();
await device.screenshot({ path: 'artifacts/android-native.png' });
await page.getByRole('button', { name: 'Progression hub' }).click();
const diagnostics = page.locator('details').filter({
  has: page.locator('[data-run-action="diagnostics-clear"]'),
});
await diagnostics.locator('summary').click();
await expect(diagnostics.getByRole('heading', { name: 'Chamber outcomes' })).toBeVisible();
await expect(diagnostics.locator('article').first()).toContainText('average damage received');
await page.getByRole('button', { name: 'Close progression' }).click();
await device.shell('am force-stop com.bazimazi.gravityborn');
await device.shell('am start -n com.bazimazi.gravityborn/.MainActivity');
const resumed = await (await device.webView({ pkg: 'com.bazimazi.gravityborn' })).page();
await resumed.getByRole('button', { name: 'Settings', exact: true }).click();
await expect(resumed.getByLabel('Reduced flashing')).toBeChecked();
await resumed.getByRole('button', { name: 'Close settings' }).click();
await resumed.getByRole('button', { name: 'Progression hub' }).click();
await resumed.locator('#run-archive summary').click();
await expect(resumed.locator('#ghost-enabled')).not.toBeChecked();
await expect(resumed.locator('[data-run-action="resume"]')).toBeEnabled();
await resumed.locator('[data-run-action="resume"]').click();
await expect(resumed.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
console.log('Baseline native gameplay and process recovery passed; loading persistence fixtures.');
// Assisted synthetic legacy records exercise the actual Preferences bridge and process restart.
const catalog = await resumed.evaluate(async () => {
  const preferences = (method, options) =>
    window.Capacitor.nativePromise('Preferences', method, options);
  const { value } = await preferences('get', { key: 'gravityborn.save' });
  const data = JSON.parse(value).payload;
  const markers = Array.from({ length: 2500 }, (_, depth) => `secret:0:${depth}`);
  Object.assign(data.profile, {
    shards: 1234,
    research: 56,
    runs: 8,
    wins: 2,
    skills: ['endless'],
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
  await preferences('set', {
    key: 'gravityborn.save',
    value: JSON.stringify({ version: 1, ...data }),
  });
  const powers = [...document.querySelectorAll('#debug-ability option')].map((option) => ({
    id: option.value,
    name: option.textContent,
  }));
  const relics = [...document.querySelectorAll('#debug-relic option')].map(
    (option) => option.value,
  );
  const previous = await preferences('get', { key: 'gravityborn.archive' });
  const archive = JSON.parse(previous.value);
  archive.reports.unshift({
    id: 'native-full-catalog-fixture',
    revision: 'native-persistence-fixture',
    recipe: {
      seed: 'native-full-catalog-fixture',
      classId: 'manipulator',
      mode: 'quick',
      contract: 'none',
      difficulty: 0,
      biome: 0,
    },
    loadout: '{}',
    outcome: 'defeat',
    assisted: true,
    imported: false,
    elapsed: 600,
    score: 999,
    chain: 30,
    rooms: 10,
    depth: 0,
    powers: powers.map((power) => power.id),
    powerLevels: powers.map(() => 1),
    relics,
    wellLevel: 4,
    level: 100,
    bonuses: [],
    ghost: [],
  });
  archive.reports = archive.reports.slice(0, 20);
  await preferences('set', { key: 'gravityborn.archive', value: JSON.stringify(archive) });
  return { powers, relics };
});
await device.shell('am force-stop com.bazimazi.gravityborn');
await device.shell('am start -n com.bazimazi.gravityborn/.MainActivity');
const recovered = await (await device.webView({ pkg: 'com.bazimazi.gravityborn' })).page();
recovered.on('pageerror', (error) => errors.push(error.message));
await recovered.getByRole('button', { name: 'Progression hub' }).click();
await expect(recovered.locator('#profile-dialog')).toContainText(
  '1234 GRAVITY SHARDS · 56 RESEARCH · 8 RUNS · 2 WINS',
);
await recovered.locator('#run-archive summary').click();
await expect(recovered.locator('#run-archive')).toContainText('ARCHIVE: READY');
await expect(recovered.locator('#archive-selection')).toHaveValue('native-full-catalog-fixture');
console.log('Native restart recovered the legacy profile and full-catalog archive.');
const buildText = await recovered.locator('#run-archive').innerText();
for (const power of catalog.powers) expect(buildText).toContain(`${power.name} 1`);
await recovered.getByRole('button', { name: 'Export selected run' }).click();
await expect.poll(focusedWindow, { timeout: 30_000 }).toContain('ChooserActivity');
const shared = JSON.parse(
  (await device.shell('run-as com.bazimazi.gravityborn cat cache/gravityborn-run.json')).toString(),
);
expect(shared.report.powers).toEqual(catalog.powers.map((power) => power.id));
expect(shared.report.powerLevels).toEqual(catalog.powers.map(() => 1));
expect(shared.report.relics).toEqual(catalog.relics);
expect(shared.report.assisted).toBe(true);
await device.shell('input keyevent 4');
await expect.poll(focusedWindow, { timeout: 30_000 }).toContain('com.bazimazi.gravityborn');
await recovered.locator('[data-run-action="resume"]').click();
await expect(recovered.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
await expect(recovered.getByRole('button', { name: 'SECRET', exact: true })).toBeVisible();
await expect
  .poll(async () => {
    return recovered.evaluate(async () => {
      const { value } = await window.Capacitor.nativePromise('Preferences', 'get', {
        key: 'gravityborn.save',
      });
      return JSON.parse(value);
    });
  })
  .toMatchObject({
    version: 2,
    payload: {
      profile: {
        shards: 1234,
        research: 56,
        runs: 8,
        wins: 2,
        discoveries: ['lore:secret:0', 'planet:0'],
        metrics: { secretsRevealed: 2500 },
      },
      checkpoint: {
        depth: 3000,
        discoveries: ['secret:0:3000', 'lore:secret:0', 'planet:0'],
        metrics: { secretsRevealed: 2501, assisted: 1 },
        build: { currency: 75 },
      },
    },
  });
// A syntactically valid primary with invalid progress must recover the valid native backup.
await recovered.evaluate(async () => {
  const preferences = (method, data) => window.Capacitor.nativePromise('Preferences', method, data);
  const { value } = await preferences('get', { key: 'gravityborn.save' });
  const data = JSON.parse(value).payload;
  await preferences('set', { key: 'gravityborn.save.backup', value });
  data.profile.shards = -1;
  await preferences('set', {
    key: 'gravityborn.save',
    value: JSON.stringify({ version: 1, ...data }),
  });
});
await device.shell('am force-stop com.bazimazi.gravityborn');
await device.shell('am start -n com.bazimazi.gravityborn/.MainActivity');
const backupRecovered = await (await device.webView({ pkg: 'com.bazimazi.gravityborn' })).page();
backupRecovered.on('pageerror', (error) => errors.push(error.message));
await backupRecovered.getByRole('button', { name: 'Progression hub' }).click();
await expect(backupRecovered.locator('#profile-dialog')).toContainText('SAVE: RECOVERED');
await expect(backupRecovered.locator('#profile-dialog')).toContainText(
  '1234 GRAVITY SHARDS · 56 RESEARCH · 8 RUNS · 2 WINS',
);
await backupRecovered.locator('[data-run-action="resume"]').click();
await expect(backupRecovered.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
await expect(backupRecovered.getByRole('button', { name: 'SECRET', exact: true })).toBeVisible();
if (errors.length) throw new Error(errors.join('\n'));
await writeFile(
  'artifacts/android-native-result.json',
  JSON.stringify(
    {
      serial: device.serial(),
      success: true,
      checks: [
        'native startup',
        '100-power and 100-relic packaged catalogs',
        'input',
        'physics time',
        'pause',
        'process termination',
        'native settings persistence',
        'route checkpoint recovery',
        'native JSON file export',
        'OS share chooser and cancellation',
        'native archive setting persistence',
        'live chamber diagnostics',
        'arena and controls fit the native viewport',
        'intro actions require no scrolling',
        'power details preserve paused play',
        'current-effect details are available',
        'full-catalog native archive recovery',
        'full-catalog native run export',
        'legacy native discovery recovery preserves progression',
        'deep checkpoint keeps its current hidden route',
        'invalid native profile recovers the valid backup without losing its route',
      ],
    },
    null,
    2,
  ),
);
console.log('Native emulator smoke passed, including process-death save recovery.');
await device.close();
clearTimeout(deadline);
