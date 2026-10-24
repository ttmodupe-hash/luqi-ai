import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test('manual reload recovers a no-store HTTP 503 tool download without replaying writes', async ({ page, baseURL }) => {
  let broken = true, attempts = 0;
  const writes: string[] = [], external: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) { external.push(url.origin); return route.abort(); }
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (/^\/assets\/PendulumLabPage-[A-Za-z0-9_-]+\.js$/.test(url.pathname)) {
      attempts++;
      if (broken) return route.fulfill({ status: 503, contentType: 'text/plain',
        headers: { 'Cache-Control': 'no-store' }, body: 'Synthetic temporary unavailability' });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/pendulum-lab');
  await expect(page.getByRole('heading', { name: 'This page could not load', exact: true })).toBeVisible();
  await expect(page.getByText(/Reloading clears unsaved text/)).toBeVisible();
  expect(attempts).toBe(1); broken = false;
  await page.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Experiential STEM Physics Laboratory', exact: true })).toBeVisible();
  expect(attempts).toBe(2); expect(writes).toEqual([]); expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
