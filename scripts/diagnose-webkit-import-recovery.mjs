import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, preview } from 'vite';
import { webkit } from '@playwright/test';

// Temporary controlled A/B diagnosis against local builds only. No production
// URL, account, writable API, provider credentials or paid request is accepted.
const root = await mkdtemp(path.join(tmpdir(), 'luqi-webkit-probe-'));
const browser = await webkit.launch();
try {
  for (const preload of [true, false]) {
    const outDir = path.join(root, preload ? 'preload' : 'native');
    await build({ logLevel: 'error', build: { outDir, emptyOutDir: true, modulePreload: preload } });
    const server = await preview({ logLevel: 'error', build: { outDir },
      preview: { host: '127.0.0.1', port: preload ? 4181 : 4182, strictPort: true } });
    const origin = `http://127.0.0.1:${preload ? 4181 : 4182}`;
    try {
      for (const action of ['reload', 'replace-query', 'fetch-reload']) {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const page = await context.newPage(); page.setDefaultTimeout(8000);
        let broken = true, attempts = 0, asset = null;
        const writes = [];
        await page.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin !== origin) return route.abort();
          if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
          if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
          if (/\/assets\/PendulumLabPage-[A-Za-z0-9_-]+\.js$/.test(url.pathname)) {
            attempts++; asset = url.href;
            if (broken) return route.abort('failed');
          }
          return route.continue();
        });
        try {
          await page.goto(origin + '/#/pendulum-lab');
          await page.getByRole('heading', { name: 'This page could not load', exact: true }).waitFor();
          assert.equal(attempts, 1); assert.ok(asset); broken = false;
          if (action === 'fetch-reload') {
            await page.evaluate(value => fetch(value, { cache: 'reload' }).then(response => response.text()), asset);
          }
          if (action === 'replace-query') await page.goto(origin + '/?recovery=diagnostic#/pendulum-lab');
          else await page.getByRole('button', { name: 'Reload page', exact: true }).click();
          const recovered = await page.getByRole('heading', { name: 'Experiential STEM Physics Laboratory', exact: true })
            .waitFor({ timeout: 5000 }).then(() => true, () => false);
          assert.deepEqual(writes, []);
          console.log('APP_RECOVERY_DIAGNOSTIC', JSON.stringify({ preload, action, recovered, attempts }));
        } finally { await context.close(); }
      }
    } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
  }
} finally { await browser.close(); await rm(root, { recursive: true, force: true }); }
