import { expect, test } from '@playwright/test';

// Synthetic, no real sign-in, provider access, exports or paid requests.
test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      return route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } });
    }
    return route.continue();
  });
});

test('existing /companion bookmark preserves private-notes sign-in and export surface', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/companion');
  await expect(page.getByRole('heading', { name: 'Companion conversations' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await page.goto('/#/companion/notes');
  await expect(page.getByRole('heading', { name: 'Companion conversations' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('new AI Companion is accessible and private notes stay separate without paid requests', async ({ page }) => {
  const paid: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) paid.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/ai-companion');
  await expect(page.getByRole('heading', { name: 'Think, learn and move forward together.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Talk with LUQI' })).toBeVisible();
  await page.getByRole('link', { name: /My private notes/i }).click();
  await expect(page.getByRole('heading', { name: 'Companion conversations' })).toBeVisible();
  expect(paid).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
