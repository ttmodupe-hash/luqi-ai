import { test, expect } from '@playwright/test';
// Page routing cannot observe requests consumed by a service worker. Keep these
// transport-fault fixtures cold; mobile-loading-worker.spec.ts covers the real SW.
// https://playwright.dev/docs/api/class-page#page-route
 test.use({ serviceWorkers: 'block' });
const physicsChunk = /\/assets\/PendulumLabPage-[A-Za-z0-9_-]+\.js$/;
const physicsHeading = 'Experiential STEM Physics Laboratory';

test('getting started does not fetch optional tool code; physics loads only on demand', async ({ page, baseURL }) => {
  const scripts: string[] = []; const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (url.pathname.endsWith('.js')) scripts.push(url.pathname);
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/start');
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(scripts.some(path => /\/(PendulumLabPage|VideoStudioPage|CertMasterPage|ExecutiveLabSuite)-/.test(path))).toBe(false);
  await page.evaluate(() => { window.location.hash = '/pendulum-lab'; });
  await expect(page.getByRole('heading', { name: physicsHeading, exact: true })).toBeVisible();
  expect(scripts.some(path => physicsChunk.test(path))).toBe(true);
  expect(writes).toEqual([]);
});

test('a delayed tool announces loading without removing workspace navigation', async ({ page, baseURL }) => {
  let release!: () => void;
  const writes: string[] = [];
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (physicsChunk.test(url.pathname)) await gate;
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  try {
    await page.goto('/#/pendulum-lab', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Loading this tool…' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'LUQI workspace home' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { release(); }
  await expect(page.getByRole('heading', { name: physicsHeading, exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('missing tool code shows a safe error and permits navigation without retries or payments', async ({ page, baseURL }) => {
  let failures = 0; const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (physicsChunk.test(url.pathname)) { failures++; return route.abort('failed'); }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/pendulum-lab');
  await expect(page.getByRole('heading', { name: 'This page could not load' })).toBeVisible();
  await expect(page.getByText(/Reloading clears unsaved text/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
  expect(failures).toBe(1); expect(writes).toEqual([]);
  await page.getByRole('link', { name: 'Back to getting started' }).click();
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This page could not load' })).toHaveCount(0);
  expect(failures).toBe(1); expect(writes).toEqual([]);
});

test('a manual reload can recover a failed download without resubmitting anything', async ({ page, baseURL }) => {
  let broken = true, attempts = 0;
  const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (physicsChunk.test(url.pathname)) { attempts++; return broken ? route.abort('failed') : route.continue(); }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/pendulum-lab');
  await expect(page.getByRole('heading', { name: 'This page could not load' })).toBeVisible();
  expect(attempts).toBe(1); broken = false;
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(page.getByRole('heading', { name: physicsHeading, exact: true })).toBeVisible();
  expect(attempts).toBe(2); expect(writes).toEqual([]);
});
