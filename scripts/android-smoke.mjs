import { _android as android, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const devices = await android.devices();
const device = devices.find((device) => device.serial() === 'emulator-5556');
if (!device) throw new Error('Expected isolated emulator-5556. No physical devices will be used.');
const webview = await device.webView({ pkg: 'com.bazimazi.gravityborn' });
const page = await webview.page();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await expect(page.getByRole('button', { name: /Enter the chamber/ })).toBeVisible();
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByLabel('Reduced flashing').check();
await page.getByRole('button', { name: 'Close settings' }).click();
await page.getByRole('button', { name: 'Begin expedition', exact: true }).click();
await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
await page.locator('[data-room]:enabled').click();
await page.getByRole('button', { name: 'Gravity left', exact: true }).click();
await expect(page.locator('#gravity-name')).toHaveText('LEFT');
await expect(page.locator('#timer')).not.toHaveText('00:00');
await page.getByRole('button', { name: 'Pause game', exact: true }).click();
await page.screenshot({ path: 'artifacts/android-native.png' });
await device.shell('am force-stop com.bazimazi.gravityborn');
await device.shell('am start -n com.bazimazi.gravityborn/.MainActivity');
const resumed = await (await device.webView({ pkg: 'com.bazimazi.gravityborn' })).page();
await resumed.getByRole('button', { name: 'Settings', exact: true }).click();
await expect(resumed.getByLabel('Reduced flashing')).toBeChecked();
await resumed.getByRole('button', { name: 'Close settings' }).click();
await resumed.getByRole('button', { name: 'Progression hub' }).click();
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
        'input',
        'physics time',
        'pause',
        'process termination',
        'native settings persistence',
        'route checkpoint recovery',
      ],
    },
    null,
    2,
  ),
);
console.log('Native emulator smoke passed, including process-death save recovery.');
await device.close();
