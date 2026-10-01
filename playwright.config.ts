import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  fullyParallel: true,
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5187',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
  ],
});
