import { defineConfig, devices } from '@playwright/test';

// This acceptance suite must never be pointed at production or supplied keys.
if (process.env.LUQI_BROWSER_BASE_URL) {
  throw new Error('WebKit acceptance is local-only; unset LUQI_BROWSER_BASE_URL.');
}

export default defineConfig({
  testDir: './browser-tests',
  // Playwright's service-worker inspection/routing is Chromium-only. Keep the
  // real-worker cases in the unchanged Chromium suite, not false WebKit proof.
  testIgnore: ['**/mobile-loading-worker.spec.ts', '**/public-cache-worker.spec.ts'],
  timeout: 30_000,
  // Run every desktop and iPhone journey, preserving 30s per-test deadlines,
  // zero retries and existing failure thresholds. The 2 November run reached
  // 421 passing tests, then its 12-minute global cap left 13 tests unrun.
  // Allow a bounded 15 minutes for the complete suite on shared CI runners;
  // the workflow step independently caps execution at 16 minutes.
  globalTimeout: 15 * 60_000,
  workers: 2,
  maxFailures: 10,
  retries: 0,
  forbidOnly: true,
  outputDir: 'test-results-webkit',
  reporter: [['list'], ['json', { outputFile: 'test-results-webkit/results.json' }]],
  use: {
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    // Deliberately do not inherit Chromium executable paths or launch args.
  },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
