import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('actual service worker handles an uncached offline tool and explicit online recovery', async ({ page, context, baseURL }) => {
  const writes: string[] = [];
  // Context routing includes worker-originated network traffic. Never use
  // request.frame() here: service-worker requests do not belong to a frame.
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/start');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cachedTools = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = (await Promise.all(keys.map(async key => (await caches.open(key)).keys()))).flat();
    return requests.filter(request => /\/assets\/PendulumLabPage-/.test(new URL(request.url).pathname)).length;
  });
  expect(cachedTools).toBe(0);
  try {
    await context.setOffline(true);
    await page.evaluate(() => { window.location.hash = '/pendulum-lab'; });
    await expect(page.getByRole('heading', { name: 'This page could not load' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to getting started' }).click();
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'This page could not load' })).toHaveCount(0);
  } finally { await context.setOffline(false); }
  // React caches rejected imports for the current document. A new explicit
  // navigation may show the same safe error; the user chooses whether to reload.
  await page.evaluate(() => { window.location.hash = '/pendulum-lab'; });
  await expect(page.getByRole('heading', { name: 'This page could not load' })).toBeVisible();
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('heading', { name: 'Experiential STEM Physics Laboratory', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});
