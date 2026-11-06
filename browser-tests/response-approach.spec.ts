import { test, expect } from '@playwright/test';

test('response approaches stay local until Send and share only reviewed context', async ({ page, baseURL }, info) => {
  const calls: Record<string, unknown>[] = [];
  const longReply = 'Start with subnetting fundamentals. ' + 'Synthetic lesson detail. '.repeat(35) + 'Final action: practise for 30 minutes daily.';
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: { token: 'response-approach-fixture-token', user: { email: 'approach@example.invalid' } } });
    if (url.pathname === '/api/v1/luqi-core') {
      expect(request.headers().authorization).toBe('Bearer response-approach-fixture-token');
      const body = request.postDataJSON(); calls.push(body);
      return route.fulfill({ json: { status: 'success', response: calls.length === 1 ? longReply : 'Synthetic review: the shared plan keeps the stated time limit.',
        provider: 'gemini', provider_model: 'fixture-model', response_approach: body.approach } });
    }
    if (/^\/(?:api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({ width: info.project.name.includes('mobile') || info.project.name.includes('iphone') ? 320 : 1280, height: 900 });
  await page.goto('/#/chat');
  await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('approach@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('details.luqi-chat-compose-more > summary').click();
  const approach = page.getByLabel('How should Luqi help?', { exact: true });
  await expect(approach).toHaveValue('auto');
  await approach.selectOption('plan');
  await page.getByLabel('Your question', { exact: true }).fill('Help me study subnetting for 30 minutes daily.');
  expect(calls).toHaveLength(0);
  await page.getByRole('checkbox', { name: /I understand AI text may go/ }).check();
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(page.getByText(/Requested approach: Make a plan/)).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ approach: 'plan', user_input: 'Help me study subnetting for 30 minutes daily.' });
  expect(calls[0]).not.toHaveProperty('history');
  expect(calls[0]).not.toHaveProperty('regionContext');
  await page.getByRole('checkbox', { name: /Keep recent conversation context/ }).check();
  await page.getByText('Review the context included with your next question', { exact: true }).click();
  const continuity = page.locator('.luqi-chat-continuity');
  await expect(continuity).toContainText('[middle omitted]');
  await expect(continuity).toContainText('Final action: practise for 30 minutes daily.');
  await approach.selectOption('review');
  await page.getByLabel('Your question', { exact: true }).fill('Does this fit my stated time limit?');
  expect(calls).toHaveLength(1);
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(page.getByText(/Requested approach: Review my work/)).toBeVisible();
  expect(calls).toHaveLength(2);
  const secondHistory = calls[1].history as { sender: string; text: string }[];
  expect(secondHistory).toHaveLength(2);
  expect(secondHistory[1].text.length).toBeLessThanOrEqual(350);
  expect(secondHistory[1].text).toContain('[middle omitted]');
  expect(secondHistory[1].text.endsWith('Final action: practise for 30 minutes daily.')).toBe(true);
  await page.screenshot({ path: info.outputPath('response-approach.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('.luqi-chat-compose-footer').getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(approach).toHaveValue('auto');
  await expect(page.getByRole('checkbox', { name: /Keep recent conversation context/ })).not.toBeChecked();
  expect(calls).toHaveLength(2);
});
