import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  timeout: 30_000,
  use: {
    baseURL: process.env.LUQI_BROWSER_BASE_URL || 'http://127.0.0.1:4173',
    // Account/UI fixtures intercept browser requests. Keep the real PWA worker
    // out of these synthetic journeys so a background install/claim cannot
    // race a mobile reload or bypass request interception. Dedicated
    // public-cache-worker and mobile-loading-worker specs explicitly opt in
    // with test.use({ serviceWorkers: 'allow' }) and still test the real worker.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    launchOptions: process.env.LUQI_CHROMIUM_PATH ? {
      executablePath: process.env.LUQI_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.LUQI_BROWSER_BASE_URL ? undefined : {
    command: 'npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI,
  },
});
