import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });
const cacheName = 'luqi-public-static-v2';
async function controlled(page: Page) {
  await page.goto('/#/start');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('actual worker invalidates a public copy when a no-store response replaces it', async ({ page, context, baseURL }) => {
  const path = '/assets/cacheprobe-12345678.js';
  let privateResponse = false, disconnected = false;
  const writes: string[] = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (url.pathname === path) {
      if (disconnected) return route.abort('internetdisconnected');
      return route.fulfill({ status: 200, contentType: 'application/javascript',
        headers: { 'Cache-Control': privateResponse ? 'private, no-store' : 'public, max-age=31536000, immutable' },
        body: privateResponse ? 'SYNTHETIC-PRIVATE' : 'SYNTHETIC-PUBLIC' });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await controlled(page);
  const throughWorker = page.waitForResponse(value => new URL(value.url()).pathname === path && value.fromServiceWorker());
  expect(await page.evaluate(async p => (await fetch(p)).text(), path)).toBe('SYNTHETIC-PUBLIC');
  await throughWorker;
  await expect.poll(() => page.evaluate(async ({ name, path }) => !!await (await caches.open(name)).match(path), { name: cacheName, path })).toBe(true);
  privateResponse = true;
  expect(await page.evaluate(async p => (await fetch(p)).text(), path)).toBe('SYNTHETIC-PRIVATE');
  await expect.poll(() => page.evaluate(async ({ name, path }) => !!await (await caches.open(name)).match(path), { name: cacheName, path })).toBe(false);
  disconnected = true;
  const failed = await page.evaluate(async p => { const r = await fetch(p); return { status: r.status, text: await r.text(), cache: r.headers.get('cache-control') }; }, path);
  expect(failed.status).toBe(503); expect(failed.cache).toBe('no-store');
  expect(failed.text).not.toContain('SYNTHETIC-PRIVATE'); expect(writes).toEqual([]);
});

test('actual worker does not intercept account, admin, query or bearer requests', async ({ page, context, baseURL }) => {
  const requests = [
    { path: '/api/v1/cache-privacy-probe', bearer: false },
    { path: '/security/cache-privacy-probe', bearer: false },
    { path: '/assets/cacheprobe-12345678.js?token=synthetic', bearer: false },
    { path: '/assets/authprobe-12345678.js', bearer: true },
  ];
  const writes: string[] = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (requests.some(item => item.path === url.pathname + url.search)) return route.fulfill({
      status: 200, contentType: 'application/javascript', body: 'SYNTHETIC-ACCOUNT',
      headers: { 'Cache-Control': 'no-store' },
    });
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await controlled(page);
  for (const item of requests) {
    const observed = page.waitForResponse(value => value.url() === baseURL + item.path);
    expect(await page.evaluate(async item => (await fetch(item.path, {
      headers: item.bearer ? { Authorization: 'Bearer synthetic-test-only' } : {},
    })).text(), item)).toBe('SYNTHETIC-ACCOUNT');
    expect((await observed).fromServiceWorker()).toBe(false);
  }
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name =>
    (await (await caches.open(name)).keys()).map(request => request.url)))).flat());
  expect(cached.filter(url => /cache-privacy-probe|cacheprobe|authprobe|token=/.test(url))).toEqual([]);
  expect(writes).toEqual([]);
});

test('actual worker migration removes retired LUQI caches but preserves other local data', async ({ page, context, baseURL }) => {
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin || request.method() !== 'GET' || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  // JSON has no application script, so seed caches before first registration.
  await page.goto('/manifest.json');
  await page.evaluate(async () => {
    for (const name of ['luqi-ai-v1', 'luqi-ai-2026-09-06-fix1', 'unrelated-application']) {
      await (await caches.open(name)).put('/fixture', new Response('SYNTHETIC-OLD'));
    }
    localStorage.setItem('synthetic-other-preference', 'preserve');
    await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(name =>
    ['luqi-ai-v1', 'luqi-ai-2026-09-06-fix1'].includes(name)))).toEqual([]);
  expect(await page.evaluate(async () => (await (await caches.open('unrelated-application')).match('/fixture'))?.text())).toBe('SYNTHETIC-OLD');
  expect(await page.evaluate(() => localStorage.getItem('synthetic-other-preference'))).toBe('preserve');
});
