import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'allow' });

test('real worker caches public assets but not private-looking, API or query responses', async ({ page, context, baseURL }) => {
  const writes: string[] = [];
  const publicPath = '/assets/cache-public-123.js';
  const excluded = ['/assets/cache-private-123.js', '/api/v1/cache-proof', '/auth', '/assets/cache-query-123.js?token=synthetic'];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (url.pathname === publicPath || excluded.some(path => path === url.pathname + url.search)) {
      return route.fulfill({ status: 200, contentType: 'text/javascript',
        headers: { 'Cache-Control': url.pathname.includes('private') ? 'private, no-store' : 'public, max-age=300' },
        body: '/* synthetic public-cache fixture, not an account response */' });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/start');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  for (const path of [...excluded, publicPath]) {
    expect(await page.evaluate(async value => (await fetch(value)).status, path)).toBe(200);
  }
  const keys = () => page.evaluate(async () => {
    const cache = await caches.open('luqi-ai-public-v2');
    return (await cache.keys()).map(request => { const url = new URL(request.url); return url.pathname + url.search; });
  });
  await expect.poll(async () => (await keys()).includes(publicPath)).toBe(true);
  for (const path of excluded) expect(await keys()).not.toContain(path);
  try {
    await context.setOffline(true);
    expect(await page.evaluate(async path => (await fetch(path)).status, publicPath)).toBe(200);
    expect(await page.evaluate(async () => {
      try { await fetch('/api/v1/cache-proof'); return 'unexpected cached API'; } catch { return 'network only'; }
    })).toBe('network only');
  } finally { await context.setOffline(false); }
  expect(writes).toEqual([]);
});
