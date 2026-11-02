import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
// HTTPS, actual compiled SPA/API and MySQL. No mocked auth responses or AI calls.
test('explicit remembered sign-in survives reload and a new page; logout remains revoked', async ({ page, context, baseURL }) => {
  let restoreCalls = 0;
  const forbidden: string[] = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin || /\/ai\/|\/gemini\/|\/commerce\//.test(url.pathname)) {
      forbidden.push(url.pathname); return route.abort();
    }
    if (url.pathname === '/api/v1/auth/session') restoreCalls++;
    return route.continue();
  });
  const email = `session-browser-${randomUUID()}@example.invalid`, password = 'Synthetic-Session-Browser-Password!';
  await page.goto('/#/join');
  const remember = page.getByRole('checkbox', { name: 'Keep me signed in on this private device' });
  await expect(remember).not.toBeChecked();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await remember.check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Luqi Chat' })).toBeVisible();
  const original = (await context.cookies()).find(cookie => cookie.name === '__Host-luqi_resume')!;
  expect(original.httpOnly).toBe(true); expect(original.secure).toBe(true); expect(original.sameSite).toBe('Strict');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Luqi Chat' })).toBeVisible();
  expect(restoreCalls).toBe(1);
  const rotated = (await context.cookies()).find(cookie => cookie.name === '__Host-luqi_resume')!;
  expect(rotated.value).not.toBe(original.value);
  expect(rotated.expires).toBeLessThanOrEqual(original.expires + 1);
  expect(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)])).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain(rotated.value);
  const route = new URL(page.url()).hash;
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/' + route);
  await expect(reopened.getByRole('heading', { name: 'Luqi Chat' })).toBeVisible();
  expect(restoreCalls).toBe(2);
  // Delete the readable hint: a bound access token still requires server logout.
  await reopened.evaluate(() => { document.cookie = '__Host-luqi_resume_hint=; Max-Age=0; Path=/; Secure; SameSite=Strict'; });
  await reopened.getByRole('link', { name: 'Open saved private notes' }).click();
  const logout = reopened.waitForResponse(response => response.url().endsWith('/api/v1/auth/logout'));
  await reopened.getByRole('button', { name: 'Sign out', exact: true }).click();
  expect((await logout).status()).toBe(204);
  await reopened.reload();
  await expect(reopened.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(restoreCalls).toBe(2); expect(forbidden).toEqual([]);
});
