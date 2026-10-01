import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/offline',
  outputDir: 'artifacts/offline-tests',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5298', ...devices['Pixel 7'], screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5298 --strictPort',
    url: 'http://127.0.0.1:5298',
    reuseExistingServer: false,
  },
});
