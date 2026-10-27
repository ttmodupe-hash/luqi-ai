import { test, expect } from '@playwright/test';

test('AI text trial requires sign-in and acknowledgement, fences sign-out and ends on reload', async ({ page, baseURL }) => {
  let calls = 0;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: { token: 'synthetic-token', user: { email: 'trial-browser@example.invalid' } } });
    if (url.pathname === '/api/v1/luqi-core') {
      calls++;
      expect(route.request().postDataJSON()).toEqual({ user_input: 'Say hello in isiZulu' });
      expect(route.request().headers().authorization).toBe('Bearer synthetic-token');
      return route.fulfill({ json: { status: 'success', response: 'Synthetic provider reply', provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/ai-trial');
  await expect(page.getByRole('heading', { name: 'LUQIChat' })).toBeVisible();
  expect(calls).toBe(0);
  await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('trial-browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Trial-Password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Your question', { exact: true }).fill('Say hello in isiZulu');
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I understand this question may go/ }).check();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Synthetic provider reply', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Open chat sidebar' }).click();
  await page.getByRole('complementary', { name: 'LUQIChat sidebar' }).getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByText('Synthetic provider reply')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(calls).toBe(1);
});
