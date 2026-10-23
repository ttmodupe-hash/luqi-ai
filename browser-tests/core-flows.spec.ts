import { test, expect } from '@playwright/test';

// Synthetic account fixtures: no real account, database, provider or paid call.
test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      return route.fulfill({ status: 503, json: { code: 'TEST_UNAVAILABLE' } });
    }
    return route.continue();
  });
});

test('Companion controls remain styled, visible and usable after a failed save', async ({ page }) => {
  let saving = false;
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: {
    token: 'browser-fixture-token', user: { email: 'browser@example.invalid' },
  } }));
  await page.route('**/api/v1/companion/conversations**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      saving = true;
      return route.fulfill({ status: 503, json: { code: 'TEST_SAVE_UNAVAILABLE' } });
    }
    return route.fulfill({ json: path.endsWith('/messages') ? {
      messages: [{ id: 2, role: 'user', content: 'Previously saved fixture', createdAt: '2026-10-22T12:00:00Z' }],
    } : { conversations: [{ id: 4, title: 'Browser notes', personalityId: 1 }] } });
  });
  await page.goto('/#/companion');
  await expect(page.getByRole('heading', { name: 'Companion conversations' })).toBeVisible();
  const email = page.getByLabel('Email', { exact: true });
  await expect(email).toHaveCSS('padding-top', '12px');
  await expect(email).toHaveCSS('border-top-width', '1px');
  await email.fill('browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Browser notes', exact: true }).click();
  await expect(page.getByText('Previously saved fixture', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your message', exact: true }).fill('Retained browser draft');
  await page.getByRole('button', { name: 'Save message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Save could not be confirmed');
  expect(saving).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Your message', exact: true })).toHaveValue('Retained browser draft');
  await expect(page.getByRole('button', { name: 'Save message', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('companion.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Previously saved fixture', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
});

test('public pages render without horizontal overflow or JavaScript exceptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [path, heading] of [['/', 'Ask Anything. Learn Anything. Protect Your Rights.'], ['/admin', 'LUQI administration'], ['/pricing', 'Luqi Credit Plans'], ['/companion', 'Companion conversations']]) {
    await page.goto("/#" + path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    await page.screenshot({ path: test.info().outputPath(path.replaceAll('/', '') || 'home') + '.png', fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('conversation deletion requires confirmation and clears only confirmed history', async ({ page }) => {
  let deletions = 0;
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: {
    token: 'browser-fixture-token', user: { email: 'browser@example.invalid' },
  } }));
  await page.route('**/api/v1/companion/conversations**', route => {
    const request = route.request();
    if (request.method() === 'DELETE') {
      expect(request.headers().authorization).toBe('Bearer browser-fixture-token');
      expect(request.postDataJSON()).toEqual({ confirm: true });
      deletions++;
      return route.fulfill({ json: { id: 4, deleted: true } });
    }
    return route.fulfill({ json: new URL(request.url()).pathname.endsWith('/messages') ? {
      messages: [{ id: 2, role: 'user', content: 'Private deletion fixture', createdAt: null }],
    } : { conversations: [{ id: 4, title: 'Delete fixture', personalityId: 1 }] } });
  });
  await page.goto('/#/companion');
  await expect(page.getByRole('button', { name: 'Open Floating AI Chat' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Live Voice Copilot/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Critique Platform/ })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill('browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Delete fixture', exact: true }).click();
  await expect(page.getByText('Private deletion fixture', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete selected conversation' }).click();
  await expect(page.getByRole('button', { name: 'Cancel deletion' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel deletion' }).click();
  expect(deletions).toBe(0);
  await page.getByRole('button', { name: 'Delete selected conversation' }).click();
  await page.screenshot({ path: test.info().outputPath('delete-confirmation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('status')).toContainText('deleted from active storage');
  expect(deletions).toBe(1);
  await expect(page.getByRole('button', { name: 'Delete fixture', exact: true })).toHaveCount(0);
  await expect(page.getByText('Private deletion fixture', { exact: true })).toHaveCount(0);
});
