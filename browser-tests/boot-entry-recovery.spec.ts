import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('retired initial Vite boot JS shows a 320px manual recovery without any write or automatic reload', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const writes: string[] = [];
  let missingBoot = 0;
  let unsolicitedReload = 0;
  page.on('request', request => {
    if (request.method() !== 'GET') writes.push(request.url());
    if (request.isNavigationRequest() && request.url().startsWith(baseURL!)) unsolicitedReload++;
  });
  await page.route('**/assets/index-*.js', route => {
    missingBoot++;
    return route.fulfill({
      status: 404,
      contentType: 'text/plain',
      headers: { 'Cache-Control': 'no-store' },
      body: 'Synthetic retired entry',
    });
  });

  await page.goto('/#/start', { waitUntil: 'domcontentloaded' });
  const recovery = page.getByRole('alert', { name: 'Luqi could not start' });
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText('Copy any unsent text');
  await expect(recovery.getByRole('button', { name: 'Reload Luqi' })).toBeVisible();
  expect(missingBoot).toBeGreaterThan(0);
  expect(writes).toEqual([]);
  expect(unsolicitedReload).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.unroute('**/assets/index-*.js');
  await recovery.getByRole('button', { name: 'Reload Luqi' }).click();
  await expect(page.getByRole('heading', { name: 'A useful place to begin.' })).toBeVisible();
  await expect(page.getByRole('alert', { name: 'Luqi could not start' })).toHaveCount(0);
  expect(unsolicitedReload).toBe(2); // Only the explicit customer click.
  expect(writes).toEqual([]);
});

test('healthy entry never displays bootstrap recovery', async ({ page }) => {
  await page.goto('/#/start');
  await expect(page.getByRole('heading', { name: 'A useful place to begin.' })).toBeVisible();
  await expect(page.getByRole('alert', { name: 'Luqi could not start' })).toHaveCount(0);
});
