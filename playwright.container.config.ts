import { defineConfig, devices } from '@playwright/test';

// Intentionally independent of preview hosting: tests hit the running Docker
// image on this fixed loopback address. Never accept a production URL.
const origin = 'http://127.0.0.1:4173';
if (process.env.LUQI_BROWSER_BASE_URL && process.env.LUQI_BROWSER_BASE_URL !== origin) {
  throw new Error('Container acceptance is restricted to the fixed loopback origin.');
}
export default defineConfig({
  testDir: './browser-tests',
  testMatch: ['provider-free-startup.spec.ts', 'workspace-tool-search.spec.ts', 'algebra-content.spec.ts', 'business-connect.spec.ts'],
  timeout: 30_000,
  globalTimeout: 4 * 60_000,
  workers: 2,
  retries: 0,
  forbidOnly: true,
  outputDir: 'test-results-container',
  reporter: 'list',
  use: {
    baseURL: origin,
    serviceWorkers: 'block',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'container-chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'container-chromium-mobile', use: { ...devices['Pixel 5'] } },
    { name: 'container-webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'container-webkit-iphone', use: { ...devices['iPhone 13'] } },
  ],
  // No webServer: a preview server must never replace the image under test.
});
