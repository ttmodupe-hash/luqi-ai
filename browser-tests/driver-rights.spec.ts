import { test, expect } from '@playwright/test';

test('free South African driver rights guide works at 320px without provider or location calls', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (/^\/(?:api|v1)\//.test(url.pathname)) {
      unexpected.push(url.pathname);
      return route.fulfill({ status: 503, json: { code: 'TEST_NO_PROVIDER' } });
    }
    if (req.method() !== 'GET') unexpected.push(req.method());
    return route.continue();
  });
  await page.goto('/#/start');
  await page.getByRole('link', { name: 'Open driver rights guide' }).click();
  await expect(page).toHaveURL(/#\/driver-rights$/);
  await expect(page.getByRole('heading', { name: 'Driver rights and safe traffic stops' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Luqi roadside safety — three immediate steps' })).toBeVisible();
  await expect(page.getByText(/Do not use your phone while driving/)).toBeVisible();
  await page.getByRole('button', { name: 'Money demanded' }).click();
  await expect(page.getByRole('heading', { name: 'Luqi roadside safety — money demanded' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Original sources' })).toBeVisible();
  await expect(page.getByText(/Luqi does not place calls or share your location/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(unexpected).toEqual([]);
});

test('Luqi local goal routing sends a bribe concern to the free guide, not AI', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/#/ask');
  await page.getByLabel('What would you like help with?').fill('Luqi, the cop wants money');
  await page.getByRole('button', { name: 'Find my next step' }).click();
  await expect(page.getByRole('heading', { name: 'South African driver safety and traffic stop rights' })).toBeVisible();
  await page.getByRole('link', { name: 'Open driver rights guide' }).click();
  await expect(page).toHaveURL(/#\/driver-rights$/);
  expect(posts).toEqual([]);
});

test('visitor can open roadside safety from Chat without signing in or calling AI', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/#/chat');
  await page.getByRole('link', { name: /Roadside help: free South African driver rights/ }).click();
  await expect(page).toHaveURL(/#\/driver-rights$/);
  expect(requests).toEqual([]);
});

test('signed-in roadside wording produces a 3-step local card, never a paid request', async ({ page }) => {
  const paid: string[] = [];
  await page.route('**/api/v1/auth/login', route =>
    route.fulfill({ json: { token: 'test-driver-rights-session', user: { email: 'driver.fixture@example.invalid' } } }));
  await page.route('**/v1/readiness', route => route.fulfill({
    json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } },
  }));
  await page.route('**/api/v1/companion/conversations?*', route =>
    route.fulfill({ json: { conversations: [] } }));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core/.test(request.url())) paid.push(request.url());
  });
  // Use the same signed-in Notes -> Chat navigation accepted by Luqi's
  // existing single-login tests, never a page reload or moving login link.
  await page.goto('/#/companion');
  await page.getByLabel('Email', { exact: true }).fill('driver.fixture@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeVisible();
  await page.getByRole('link', { name: 'Ask Luqi', exact: true }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await page.getByLabel('Your question').fill('Luqi, I am being pulled over');
  await expect(page.getByRole('heading', { name: 'Luqi roadside safety — three immediate steps' })).toBeVisible();
  await expect(page.getByText(/Do not use your phone while driving/)).toBeVisible();
  await page.getByRole('button', { name: 'Open free driver rights guide' }).click();
  await expect(page).toHaveURL(/#\/driver-rights$/);
  expect(paid).toEqual([]);
});
