import { test, expect } from '@playwright/test';
import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';

test('AI trial retains over-limit input and sends an intact corrected question', async ({ page, baseURL }) => {
  let calls = 0;
  const accepted = 'q'.repeat(MAX_PILOT_QUESTION_CHARS - 11) + 'END-TEST';
  const overlong = accepted + 'EXCESS';
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: { token: 'synthetic-token', user: { email: 'input-browser@example.invalid' } } });
    if (url.pathname === '/api/v1/luqi-core') {
      calls++;
      expect(route.request().postDataJSON()).toEqual({ language: 'English', user_input: accepted });
      return route.fulfill({ json: { status: 'success', response: 'Synthetic intact-input reply', provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/ai-trial');
  await expect(page.getByRole('heading', { name: 'Keep the conversation going' })).toBeVisible();
  await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('input-browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Input-Password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const question = page.getByLabel('Your question', { exact: true });
  await question.fill(overlong);
  await page.getByRole('checkbox', { name: /I understand this question may go/ }).check();
  await expect(question).toHaveValue(overlong);
  await expect(question).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/It will not be sent or shortened automatically/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  await question.evaluate(element => (element as HTMLTextAreaElement).form!.requestSubmit());
  expect(calls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await question.fill(' '.repeat(100) + accepted + '\n'.repeat(100));
  await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Synthetic intact-input reply', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
});
