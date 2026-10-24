import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { webkit } from '@playwright/test';

// Diagnostic only: an empty loopback page and one synthetic ES module.
// Does not load LUQI, authenticate, or contact any external service.
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url.startsWith('/assets/probe-123.js')) {
    response.setHeader('Content-Type', 'text/javascript');
    response.end('export const value = 7;');
  } else {
    response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Recovery diagnostic</title>');
  }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await webkit.launch();
try {
  for (const fault of ['failed', 'internetdisconnected', 'http503']) {
    for (const action of ['reload', 'replace-query', 'fetch-reload', 'blank-navigation']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage(); page.setDefaultTimeout(10_000);
      let broken = true, attempts = 0;
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname.startsWith('/assets/')) {
          attempts++;
          if (broken) return fault === 'http503'
            ? route.fulfill({ status: 503, contentType: 'text/plain', headers: { 'Cache-Control': 'no-store' }, body: 'Synthetic outage' })
            : route.abort(fault);
        }
        return route.continue();
      });
      try {
        await page.goto(origin);
        const read = () => page.evaluate(async () => {
          try { return (await import('/assets/probe-123.js')).value === 7; } catch { return false; }
        });
        assert.equal(await read(), false); broken = false;
        if (action === 'fetch-reload') await page.evaluate(() => fetch('/assets/probe-123.js', { cache: 'reload' }).then(r => r.text()));
        if (action === 'blank-navigation') { await page.goto('about:blank'); await page.goto(origin); }
        else if (action === 'replace-query') await page.goto(origin + '/?recovery=diagnostic');
        else await Promise.all([page.waitForEvent('domcontentloaded'), page.evaluate(() => { setTimeout(() => location.reload(), 0); })]);
        console.log('MODULE_RECOVERY_DIAGNOSTIC', JSON.stringify({ fault, action, recovered: await read(), attempts }));
      } finally { await context.close(); }
    }
  }
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
