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
await expect.poll(focusedWindow).toContain('ChooserActivity');
const exported = JSON.parse(
  (
    await device.shell('run-as com.bazimazi.gravityborn cat cache/gravityborn-save.json')
  ).toString(),
);
if (exported.version !== 2 || !exported.payload.profile)
  throw new Error('Native JSON export was not written');
await device.shell('input keyevent 4');
await expect.poll(focusedWindow).toContain('com.bazimazi.gravityborn');
await expect(page.locator('#run-seed')).toBeVisible();
await page.locator('#run-seed').fill('offline-recovery');
await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
await page.locator('[data-room]:enabled').click();
await page.getByRole('button', { name: 'Gravity left', exact: true }).click();
await expect(page.locator('#gravity-name')).toHaveText('LEFT');
await expect(page.locator('#timer')).not.toHaveText('00:00');
await page.getByRole('button', { name: 'Pause game', exact: true }).click();
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
      ],
    },
    null,
    2,
  ),
);
console.log('Native emulator smoke passed, including process-death save recovery.');
await device.close();
clearTimeout(deadline);
