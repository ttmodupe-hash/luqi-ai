import { test, expect } from '@playwright/test';

// Exercise the built frontend. These checks never submit account credentials.
const aliases = [
  ['/login', '/companion', 'Sign in to your LUQI account'],
  ['/signin', '/companion', 'Sign in to your LUQI account'],
  ['/sign-in', '/companion', 'Sign in to your LUQI account'],
  ['/register', '/join', 'Create your LUQI account'],
  ['/signup', '/join', 'Create your LUQI account'],
  ['/sign-up', '/join', 'Create your LUQI account'],
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
  await expect(page).toHaveURL(/#\/companion$/);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  expect(external).toEqual([]);
});

test('switching to signup through an alias clears the previous password', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('non-secret-fixture-password');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your LUQI account', exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue('');
});
