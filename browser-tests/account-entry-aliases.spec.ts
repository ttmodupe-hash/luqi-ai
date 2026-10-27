import { test, expect } from '@playwright/test';

// Exercise the built frontend. These checks never submit account credentials.
const aliases = [
  ['/login', '/login', 'Sign in to your Luqi account'],
  ['/signin', '/login', 'Sign in to your Luqi account'],
  ['/sign-in', '/login', 'Sign in to your Luqi account'],
  ['/register', '/join', 'Create your Luqi account'],
  ['/signup', '/join', 'Create your Luqi account'],
  ['/sign-up', '/join', 'Create your Luqi account'],
] as const;

for (const [alias, target, heading] of aliases) {
  test(`${alias} opens the existing account form without automatic requests`, async ({ page }) => {
    const operations: string[] = [];
    await page.route('**/api/**', async route => {
      operations.push(new URL(route.request().url()).pathname);
      await route.abort();
    });
    await page.goto('/#' + alias);
    await expect(page).toHaveURL(new RegExp('#' + target + '$'));
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password', { exact: true })).toHaveCount(target === '/join' ? 1 : 0);
    expect(operations).toEqual([]);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  });
}

test('sign-in aliases discard untrusted return URLs and do not prefill URL credentials', async ({ page }) => {
  const external: string[] = [];
  await page.route('https://example.invalid/**', async route => {
    external.push(route.request().url()); await route.abort();
  });
  await page.goto('/#/login?next=https%3A%2F%2Fexample.invalid%2F&email=not-an-account%40example.invalid&password=not-a-password');
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  expect(external).toEqual([]);
});

test('switching to signup through an alias clears the previous password', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('non-secret-fixture-password');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your Luqi account', exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue('');
});

test('successful Luqi registration enters Chat directly, never Notes or paid AI', async ({ page }) => {
  const registrations: string[] = [], paid: string[] = [], notes: string[] = [];
  await page.route('**/api/v1/auth/register', route => {
    registrations.push(route.request().url());
    return route.fulfill({ status: 201, contentType: 'application/json',
      body: JSON.stringify({ token: 'synthetic-customer-token', user: { email: 'new@example.invalid' } }) });
  });
  await page.route('**/v1/readiness', route =>
    route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } }));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) paid.push(request.url());
    if (/\/api\/v1\/companion\/conversations/.test(request.url())) notes.push(request.url());
  });
  await page.goto('/#/join');
  await page.getByLabel('Email', { exact: true }).fill('new@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-Password-2026!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic-Password-2026!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByRole('heading', { name: 'Luqi Chat', exact: true })).toBeVisible();
  await expect(page.getByLabel('Your question')).toBeVisible();
  expect(registrations).toHaveLength(1);
  expect(paid).toHaveLength(0);
  expect(notes).toHaveLength(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
