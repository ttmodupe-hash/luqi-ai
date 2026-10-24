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
