import { test, expect } from '@playwright/test';

test('Chat recovers a transient outage, keeps a confirmed reply and starts clean without signing out', async ({ page, baseURL }, testInfo) => {
  let available = false, calls = 0, checks = 0;
  const question = 'Explain one useful study technique and give me a short example.';
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') {
      checks++;
      return route.fulfill({ status: available ? 200 : 503,
        json: { checks: { persistence: 'connected', ai_pilot: available ? 'configured_not_verified' : 'disabled' } } });
    }
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
      token: 'synthetic-token', user: { email: 'chat-browser@example.invalid' },
    } });
    if (url.pathname === '/api/v1/luqi-core') {
      calls++;
      if (calls === 2) return route.abort();
      expect(request.postDataJSON()).toEqual({ language: 'English', user_input: question });
      return route.fulfill({ json: { status: 'success', response: 'Synthetic confirmed study reply',
        provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/ai-trial');
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByRole('heading', { name: 'Luqi Chat', exact: true })).toBeVisible();
  await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('chat-browser@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Chat-Password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Your question', { exact: true }).fill(question);
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(question);
  await page.getByRole('checkbox', { name: /I understand AI text may go/ }).click();
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(calls).toBe(0);

  available = true;
  await page.getByRole('button', { name: 'Retry readiness' }).click();
  await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled();
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(question);
  expect(checks).toBe(2); expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Synthetic confirmed study reply', { exact: true })).toBeVisible();
  await page.locator('article.luqi-chat-message-ai').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('chat-ready.png') });

  await page.getByLabel('Your question', { exact: true }).fill('A synthetic follow-up');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText(/The reply could not be confirmed/)).toBeVisible();
  await expect(page.getByText('Synthetic confirmed study reply', { exact: true })).toBeVisible();
  await expect(page.getByText(/AI text gateway configured/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
  expect(calls).toBe(2);

  await page.locator('.luqi-chat-mobile-bar').getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByLabel('Your question', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue('');
  await expect(page.getByText('Synthetic confirmed study reply', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /I understand AI text may go/ })).toHaveCount(0);
  await expect(page.getByText(/AI text sharing approved for this signed-in tab/)).toBeVisible();
  expect(calls).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByLabel('Your question', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('chat-recovered.png') });
});
