import { defineConfig, devices } from '@playwright/test';
import mysqlFixture from './playwright.mysql.config';

// Importing the original configuration enforces exact disposable database,
// fixture approval and GitHub Actions guards before any account can be written.
if (process.env.LUQI_BROWSER_BASE_URL) {
  throw new Error('WebKit MySQL checks refuse a caller-selected browser URL');
}
export default defineConfig({
  ...mysqlFixture,
  globalTimeout: 6 * 60_000,
  outputDir: 'test-results-webkit-mysql',
  reporter: [['list'], ['json', { outputFile: 'webkit-mysql-results.json' }]],
  use: {
    ...mysqlFixture.use,
    browserName: 'webkit', launchOptions: {}, serviceWorkers: 'block',
    locale: 'en-ZA', timezoneId: 'Africa/Johannesburg', screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'webkit-mysql-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mysql-mobile', use: { ...devices['iPhone 13'] } },
  ],
});
