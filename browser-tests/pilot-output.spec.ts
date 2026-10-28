import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
for (const [code, status, message] of [
  ['AI_REPLY_INCOMPLETE', 502, 'stopped before completing'],
  ['AI_RESPONSE_BLOCKED', 422, 'declined the request'],
  ['AI_RESPONSE_INVALID', 502, 'reply could not be verified'],
] as const) {
  test('trial explains ' + code + ' without partial text or automatic resubmission', async ({ page, baseURL }) => {
    let calls = 0; const unexpected: string[] = [];
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== new URL(baseURL!).origin) { unexpected.push('external'); return route.abort(); }
      if (url.pathname === '/v1/health' && request.method() === 'GET') return route.fulfill({status:200,json:{status:'ok'}});
      if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
      if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: { token: 'synthetic-token', user: { email: 'output@example.invalid' } } });
      if (url.pathname === '/api/v1/luqi-core') {
        calls++; expect(request.postDataJSON()).toEqual({ language: 'English', user_input: 'Synthetic question' });
        return route.fulfill({ status, json: { status: 'unavailable', code, message: 'PRIVATE-DIAGNOSTIC', response: 'PRIVATE-PARTIAL' } });
      }
      if (request.method() !== 'GET' || /^\/(api|v1)\//.test(url.pathname)) { unexpected.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    await page.setViewportSize({ width: 320, height: 820 });
    await page.goto('/#/ai-trial');
    await page.locator('details.luqi-chat-signin-inline > summary').click();
  await page.getByLabel('Email', { exact: true }).fill('output@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('Fixture-Password-2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Your question', { exact: true }).fill('Synthetic question');
    await page.getByRole('checkbox', { name: /I understand AI text may go/ }).click();
    await page.getByRole('button', { name: 'Send question' }).click();
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('alert')).toContainText('attempt may still count');
    await expect(page.getByRole('heading', { name: 'AI reply', exact: true })).toHaveCount(0);
    await expect(page.getByText(/PRIVATE-/)).toHaveCount(0);
    await expect(page.getByLabel('Your question', { exact: true })).toHaveValue('Synthetic question');
    await page.getByLabel('Your question', { exact: true }).fill('A shorter draft');
    expect(calls).toBe(1); expect(unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Open chat sidebar' }).click();
    await page.getByRole('complementary', { name: 'Luqi Chat sidebar' }).getByRole('button', { name: 'Sign out', exact: true }).click();
    expect(calls).toBe(1);
  });
}
