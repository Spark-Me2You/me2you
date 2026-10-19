import { defineConfig, devices } from '@playwright/test';

const PORT = 61000;

/**
 * Smoke-tests every Ladle story: `npm run ladle:build && npm run test:stories`.
 */
export default defineConfig({
  testDir: './tests/stories',
  fullyParallel: true,
  // Kiosk stories render WebGL in software and are memory-hungry; pass --workers to override.
  workers: 2,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: `npx ladle preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
