import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('desktop LUQIChat opens sidebar and conversation with usable service shortcuts', async ({ page }, testInfo) => {
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/#/chat');
  const rail = page.getByRole('complementary', { name: 'LUQIChat sidebar' });
  const canvas = page.getByRole('heading', { name: 'LUQIChat', exact: true });
  await expect(rail).toBeVisible(); await expect(canvas).toBeVisible();
  await expect(rail.getByRole('button', { name: 'New chat' })).toBeVisible();
  const services = rail.getByRole('navigation', { name: 'Jump into LUQI services' });
  for (const [name, href] of [
    ['Business desk', '#/business-desk'], ['Study desk', '#/study-desk'],
    ['Content studio', '#/content-studio'], ['Private notes', '#/companion'],
    ['Omega tools', '#/omega-tasks'],
  ]) await expect(services.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  const left = await rail.boundingBox(), right = await canvas.boundingBox();
  expect(left).not.toBeNull(); expect(right).not.toBeNull();
  expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('luqichat-desktop.png'), fullPage: true });
});

test('320px mobile sidebar opens, closes and never creates a paid request', async ({ page }, testInfo) => {
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  await expect(page.getByRole('heading', { name: 'LUQIChat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open chat sidebar' })).toBeVisible();
  await page.getByRole('button', { name: 'Open chat sidebar' }).click();
  const sidebar = page.getByRole('complementary', { name: 'LUQIChat sidebar' });
  await expect(sidebar).toBeInViewport();
  await expect(sidebar.getByRole('navigation', { name: 'Jump into LUQI services' })
    .getByRole('link', { name: 'Africa & travel guide' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('luqichat-mobile.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open chat sidebar' })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
});

test('confirmed AI chat appears in in-tab recents and switching does not replay inference', async ({ page }) => {
  let replies = 0, logins = 0;
  await page.route('**/v1/readiness', route => route.fulfill({ json: {
    checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
  } }));
  await page.route('**/api/v1/auth/login', route => {
    logins++;
    return route.fulfill({ json: { token: 'fixture-token', user: { email: 'synthetic@example.invalid' } } });
  });
  await page.route('**/api/v1/luqi-core', route => {
    replies++;
    expect(route.request().postDataJSON()).toEqual({ user_input: 'A synthetic first question' });
    return route.fulfill({ json: { status: 'success', response: 'Synthetic LUQI confirmed answer',
      provider: 'gemini', provider_model: 'fixture-model' } });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/#/chat');
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-passphrase-only-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Your question').fill('A synthetic first question');
  await page.getByRole('checkbox', { name: /I understand this question may go/ }).check();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Synthetic LUQI confirmed answer')).toBeVisible();
  const rail = page.getByRole('complementary', { name: 'LUQIChat sidebar' });
  const recent = rail.getByRole('group', { name: 'Chats from this tab' });
  await expect(recent.getByRole('button', { name: 'A synthetic first question' })).toBeVisible();
  await rail.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('Synthetic LUQI confirmed answer')).toHaveCount(0);
  await recent.getByRole('button', { name: 'A synthetic first question' }).click();
  await expect(page.getByText('Synthetic LUQI confirmed answer')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /I understand this question may go/ })).not.toBeChecked();
  expect(replies).toBe(1);
  expect(logins).toBe(1);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account' })).toBeVisible();
  await expect(recent).toHaveCount(0);
  expect(replies).toBe(1);
});
