import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('a rough question is corrected and improved locally before one explicit provider request', async ({ page, baseURL }) => {
  let calls = 0;
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
      token: 'synthetic-token', user: { email: 'test@example.invalid' },
    } });
    if (url.pathname === '/api/v1/luqi-core') {
      calls++;
      expect(request.headers().authorization).toBe('Bearer synthetic-token');
      const body = request.postDataJSON();
      expect(body.user_input).toContain('practical next steps');
      expect(body.user_input).toContain('I need please help');
      return route.fulfill({ json: { status: 'success', response: 'Synthetic safe answer',
        provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(?:api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/chat');
  await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('test@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const input = page.getByLabel('Your question', { exact: true });
  await input.fill('I need plese help with my business');
  await expect(input).toHaveAttribute('spellcheck', 'true');
  await expect(input).toHaveAttribute('autocorrect', 'on');
  await page.locator('details.luqi-chat-compose-more > summary').click();
  await expect(page.getByText(/Possible English spelling/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply suggestion' }).click();
  await expect(input).toHaveValue('I need please help with my business');
  await page.locator('details.luqi-prompt-coach > summary').click();
  await page.getByLabel('What would help most?').selectOption('plan');
  await page.getByLabel('How should Luqi answer?').selectOption('steps');
  await page.getByRole('button', { name: 'Suggest a clearer question' }).click();
  await expect(page.getByLabel('Review the suggested question')).toHaveValue(/practical next steps/);
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Use this question' }).click();
  await expect(input).toHaveValue(/practical next steps/);
  const consent = page.getByRole('checkbox', { name: /I understand AI text may go/ });
  await expect(consent).not.toBeChecked();
  await consent.click();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Synthetic safe answer')).toBeVisible();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
