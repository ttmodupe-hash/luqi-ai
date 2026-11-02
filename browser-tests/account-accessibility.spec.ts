import { test, expect } from '@playwright/test';

// All credentials and sessions here are disposable fixtures, never real accounts.
const fixture = 'synthetic-visibility-fixture';

test('password visibility is keyboard operable, re-masks on Escape and does not submit', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', async route => { requests.push(route.request().url()); await route.abort(); });
  await page.goto('/#/login');
  const password = page.getByLabel('Password', { exact: true }); await password.fill(fixture);
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'current-password');
  const show = page.getByRole('button', { name: 'Show password', exact: true });
  await show.focus(); await page.keyboard.press('Space');
  await expect(password).toHaveAttribute('type', 'text'); await expect(password).toHaveValue(fixture);
  await page.keyboard.press('Escape'); await expect(password).toHaveAttribute('type', 'password');
  await show.click(); await page.getByLabel('Email', { exact: true }).focus();
  await expect(password).toHaveAttribute('type', 'password');
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('signup confirmation and mode changes preserve masking and password-manager hints', async ({ page }) => {
  await page.goto('/#/join');
  const password = page.getByLabel('Password', { exact: true }), confirm = page.getByLabel('Confirm password', { exact: true });
  await password.fill(fixture); await confirm.fill(fixture);
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Show confirm password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password'); await expect(confirm).toHaveAttribute('type', 'text');
  await expect(confirm).toHaveAttribute('autocomplete', 'new-password');
  await page.getByRole('button', { name: 'Use an existing account', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password'); await expect(password).toHaveValue('');
  await expect(confirm).toHaveCount(0);
});

test('recovery guidance opens by keyboard and never claims to send a reset', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', async route => { requests.push(route.request().url()); await route.abort(); });
  await page.goto('/#/login');
  const summary = page.locator('summary', { hasText: 'Forgot your password?' });
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/Automatic password-reset emails are unavailable in this pilot/)).toBeVisible();
  await expect(page.getByText(/Opening this help does not send an email or change your account/)).toBeVisible();
  await page.getByRole('link', { name: 'Read account recovery guidance' }).click();
  await expect(page).toHaveURL(/#\/contact$/);
  await expect(page.getByRole('heading', { name: 'Account recovery or private questions', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('password and recovery controls fit a 320px viewport with usable touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/#/join');
  await page.getByLabel('Password', { exact: true }).fill(fixture.repeat(2));
  for (const name of ['Show password', 'Show confirm password']) {
    const button = page.getByRole('button', { name, exact: true }); await expect(button).toBeVisible();
    const box = await button.boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Use an existing account', exact: true }).click();
  await page.locator('summary', { hasText: 'Forgot your password?' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('password change uses the same controls without making an automatic change request', async ({ page }) => {
  const changes: string[] = [];
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: { token: 'synthetic-token', user: { email: 'fixture@example.invalid' } } }));
  await page.route('**/api/v1/companion/conversations?*', route => route.fulfill({ json: { conversations: [] } }));
  await page.route('**/api/v1/account/password', async route => { changes.push(route.request().method()); await route.abort(); });
  await page.goto('/#/login');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid'); await page.getByLabel('Password', { exact: true }).fill(fixture);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // Successful account sign-in opens Chat, not Notes; navigate without a full reload
  // so the shared in-memory account remains available for password settings.
  await expect(page.getByRole('heading', { name: 'Luqi Chat' })).toBeVisible();
  await page.getByRole('link', { name: 'Open saved private notes' }).click();
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  for (const label of ['Current password', 'New password', 'Confirm new password']) {
    const field = page.getByLabel(label, { exact: true }); await field.fill(fixture);
    await page.getByRole('button', { name: `Show ${label.toLowerCase()}`, exact: true }).click();
    await expect(field).toHaveAttribute('type', 'text');
  }
  await page.getByRole('button', { name: 'Close password settings', exact: true }).click();
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  for (const label of ['Current password', 'New password', 'Confirm new password']) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(''); await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('type', 'password');
  }
  expect(changes).toEqual([]);
});
