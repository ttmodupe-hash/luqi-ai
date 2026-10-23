import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (/^\/(api|v1)\//.test(url.pathname)) return route.fulfill({ status: 503, json: { code: 'TEST_UNAVAILABLE' } });
    return route.continue();
  });
});

test('new visitors can choose a real tool or register from the welcome page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A useful place to begin.' })).toBeVisible();
  await expect(page.getByText('Voice and paid plans are not enabled. AI text has a separate limited trial.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try the physics lab', exact: true })).toHaveAttribute('href', '#/pendulum-lab');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('getting-started.png'), fullPage: true });
  await page.getByRole('link', { name: 'Create your notes account' }).click();
  await expect(page.getByRole('heading', { name: 'Create your LUQI account' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('new-browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-New-Account-Password-2026!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic-New-Account-Password-2026!');
  let registrations = 0;
  await page.route('**/api/v1/auth/register', route => {
    registrations++;
    expect(route.request().postDataJSON()).toEqual({ email: 'new-browser@example.invalid', password: 'Synthetic-New-Account-Password-2026!' });
    return route.fulfill({ status: 201, json: { token: 'new-fixture-token', user: { email: 'new-browser@example.invalid' } } });
  });
  await page.route('**/api/v1/companion/conversations**', route => route.fulfill({ json: { conversations: [] } }));
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByLabel('Conversation title')).toBeVisible();
  expect(registrations).toBe(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
});

test('lost registration responses are not retried and public plans make no billing requests', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/auth/register', route => { attempts++; return route.abort('failed'); });
  await page.goto('/#/join');
  await page.getByLabel('Email', { exact: true }).fill('new-browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-New-Account-Password-2026!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic-New-Account-Password-2026!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Account creation could not be confirmed');
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeDisabled();
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: 'Use an existing account' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  const calls: string[] = [];
  page.on('request', request => { if (/\/api\/|\/v1\//.test(request.url())) calls.push(request.url()); });
  await page.goto('/#/pricing');
  await expect(page.getByRole('heading', { name: 'Plans and availability' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Purchase|Activate|Simulate/ })).toHaveCount(0);
  await expect(page.getByText(/Paid plans, credit purchases and checkout are not available/)).toBeVisible();
  expect(calls).toEqual([]);
});
