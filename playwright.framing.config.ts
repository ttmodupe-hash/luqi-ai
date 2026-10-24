import { defineConfig, devices } from '@playwright/test';

// Use the built production HTTP server, not Vite preview: preview does not
// reproduce the server security headers that caused the embedded-lab failure.
for (const name of ['LUQI_BROWSER_BASE_URL', 'DATABASE_URL', 'LUQI_PILOT_GEMINI_API_KEY',
  'LUQI_PILOT_OPENAI_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY']) {
  if (process.env[name]) throw new Error('Framing acceptance requires isolated, credential-free local hosting.');
}
export default defineConfig({
  testDir: './framing-browser-tests', timeout: 20_000, globalTimeout: 180_000,
  workers: 2, retries: 0, forbidOnly: true, maxFailures: 4,
  outputDir: 'test-results-framing', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4386', serviceWorkers: 'block',
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], browserName: 'chromium',
      launchOptions: process.env.LUQI_CHROMIUM_PATH ? { executablePath: process.env.LUQI_CHROMIUM_PATH } : {} } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'], browserName: 'chromium',
      launchOptions: process.env.LUQI_CHROMIUM_PATH ? { executablePath: process.env.LUQI_CHROMIUM_PATH } : {} } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], browserName: 'webkit' } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: [
    { command: 'node dist/boot.js', url: 'http://127.0.0.1:4386/v1/health',
      reuseExistingServer: false, timeout: 30_000,
      env: { NODE_ENV: 'production', PORT: '4386',
        JWT_SECRET: 'synthetic-framing-ci-only-not-a-production-secret',
        LUQI_AI_PROVIDER_ENABLED: 'false', LUQI_AI_CREDENTIAL_CHECK_ENABLED: 'false' } },
    { command: 'node scripts/ci-frame-parent.mjs', url: 'http://127.0.0.1:4387/lab',
      reuseExistingServer: false, timeout: 10_000 },
  ],
});
