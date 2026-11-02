import { defineConfig } from '@playwright/test';

// This suite writes accounts and notes. Never accept a caller-selected URL.
if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.DATABASE_URL !== 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci') {
  throw new Error('Refusing real-browser writes outside the exact disposable MySQL CI fixture');
}
export default defineConfig({
  testDir: './mysql-browser-tests', testMatch: '**/*.pw.ts', timeout: 45_000,
  workers: 1, retries: 0, forbidOnly: true,
  use: {
    baseURL: 'http://127.0.0.1:8768', trace: 'retain-on-failure',
    launchOptions: process.env.LUQI_CHROMIUM_PATH ? {
      executablePath: process.env.LUQI_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'node dist/boot.js', url: 'http://127.0.0.1:8768/v1/health', reuseExistingServer: false,
    timeout: 20_000,
    env: { ...process.env, NODE_ENV: 'production', PORT: '8768',
      DATABASE_URL: `mysql://luqi_web_runtime:${'a'.repeat(64)}@127.0.0.1:3306/luqi_ci`,
      JWT_SECRET: 'ci-runtime-role-only-jwt-secret-with-over-32-characters',
      LUQI_AI_PROVIDER_ENABLED: 'false', LUQI_AI_BILLING_APPROVED: 'false',
      LUQI_AI_CREDENTIAL_CHECK_ENABLED: 'false', LUQI_OMEGA_WEB_ENABLED: 'false' },
  },
});
