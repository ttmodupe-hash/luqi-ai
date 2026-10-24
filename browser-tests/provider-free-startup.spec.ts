import { test, expect } from '@playwright/test';

// Built UI, anonymous synthetic browsing only. No real account or provider call.
test('public entry pages remain usable at 320px without a global query provider', async ({ page }) => {
  const errors: string[] = [], apiCalls: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => { apiCalls.push(new URL(route.request().url()).pathname); await route.abort(); });
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/', '/start', '/login', '/join', '/pricing', '/contact']) {
    await page.goto('/#' + path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

for (const path of ['/lab-simulator', '/self-healing', '/experiential-edu']) {
  test(`${path} retains its query context with a safely unavailable synthetic backend`, async ({ page }) => {
    // Never contact live backend services; unavailable test replies are explicit.
    await page.route('**/api/**', route => {
      const procedures = new URL(route.request().url()).pathname.split('/').pop()!.split(',');
      return route.fulfill({ status: 503, json: procedures.map(() => ({ error: { json: {
        message: 'Synthetic backend unavailable', code: -32603,
        data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 503 },
      } } })) });
    });
    await page.goto('/#' + path);
    await expect(page.locator('h1').filter({ hasNotText: /Loading this tool|This page could not load/ }).first()).toBeVisible();
    await expect(page.locator('#page-load-error')).toHaveCount(0);
  });
}
