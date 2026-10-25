import { defineConfig, devices } from '@playwright/test';

// Dedicated synthetic browser acceptance: not part of default production-style suites.
// Never route this runner to a non-loopback app or execute without the build-time UI gate.
if (process.env.LUQI_BROWSER_BASE_URL) {
  throw new Error('Vault browser acceptance is localhost-only; unset LUQI_BROWSER_BASE_URL.');
}
if (process.env.VITE_LUQI_PROJECT_VAULT_UI !== 'true') {
  throw new Error('Vault acceptance needs isolated opt-in Vite build, never production.');
}
export default defineConfig({
  testDir: './vault-browser-tests',
  timeout: 90_000,
  globalTimeout: 9 * 60_000,
  workers: 2,
  retries: 0,
  forbidOnly: true,
  outputDir: 'test-results-vault',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'vault-mobile-chromium', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 740 } } },
    { name: 'vault-webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'vault-webkit-iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
