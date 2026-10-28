import { test, expect } from '@playwright/test';

test('Luqi understands an opted-in short correction and displays safe Markdown at 320px', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const sent: Array<{ user_input: string; history?: Array<{ sender: string; text: string }> }> = [];
  const unexpected: string[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: {
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: {
      token: 'synthetic-context-2026', user: { email: 'tester@example.invalid' },
    } });
    if (url.pathname === '/api/v1/luqi-core') {
      const body = route.request().postDataJSON();
      sent.push(body);
      return route.fulfill({ json: {
        status: 'success', provider: 'gemini', provider_model: 'synthetic',
        response: sent.length === 1
          ? '### Equipment & Hardware\n* **Powerful Computer:** Useful for rendering.\n***'
          : '### An AI Studio\n- **Director:** Plan the model and voice tools.\n- **Renderer:** Build the video safely.',
      } });
    }
    if (/^\/(?:api|v1)\//.test(url.pathname)) { unexpected.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  await page.getByText('Prefer to sign in here?').click();
  await page.getByLabel('Email', { exact: true }).fill('tester@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Your question').fill('What is required for ani to have its own studio?');
  await page.getByRole('checkbox', { name: /I understand AI text may go/ }).check();
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('heading', { name: 'Equipment & Hardware' })).toBeVisible();
  await expect(page.getByText('Powerful Computer:')).toBeVisible();
  await expect(page.locator('hr')).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: /Keep recent conversation context/i })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /Keep recent conversation context/i }).check();
  await page.getByLabel('Your question').fill('For an AI?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('heading', { name: 'An AI Studio' })).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0].history).toBeUndefined();
  expect(sent[1].history?.[0]).toEqual({ sender: 'user', text: 'What is required for ani to have its own studio?' });
  expect(sent[1].history?.[1]?.sender).toBe('ai');
  expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
