import { defineConfig, devices } from '@playwright/test';
if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.DATABASE_URL !== 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci') {
  throw new Error('Refusing session browser writes outside exact disposable MySQL CI fixture');
}
export default defineConfig({
  testDir: './session-browser-tests', testMatch: '**/*.pw.ts', timeout: 45_000,
  workers: 1, retries: 0, forbidOnly: true,
  use: { baseURL: 'https://127.0.0.1:8769', ignoreHTTPSErrors: true,
    serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chromium-sessions', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'iphone-webkit-sessions', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: { command: 'node /tmp/luqi-session-browser.js', url: 'https://127.0.0.1:8769/v1/health',
    ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 60_000 },
});
