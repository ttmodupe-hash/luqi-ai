import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  // Preserve the original page journeys alongside the new useful-work flows.
  testMatch: ['township-business-workspace.spec.ts', 'municipal-township.spec.ts'],
  projects: [
    { name: 'township-chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'township-chromium-320', use: { browserName: 'chromium', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
    { name: 'township-webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'township-webkit-320', use: { browserName: 'webkit', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
