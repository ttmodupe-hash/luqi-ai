import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  testMatch: /drive-earth(?:-live)?\.spec\.ts/,
  timeout: 30000,
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.LUQI_BROWSER_BASE_URL || 'http://127.0.0.1:4173', serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.LUQI_BROWSER_BASE_URL ? undefined : { command: 'npx vite preview --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
