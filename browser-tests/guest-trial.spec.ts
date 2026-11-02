import { test, expect } from '@playwright/test';

test('three genuine guest Chat turns before signup, zero provider calls before consent, mobile-safe', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const unexpected: string[] = [];
  const questions: string[] = [];
  let count = 0;
  // Intercepted requests may not expose network-owned Cookie headers, even via allHeaders().
  // Seed the browser's real HttpOnly cookie jar for this synthetic trial;
  // server-side cookie issuance and signature checks have separate unit coverage.
  await page.context().addCookies([{
    name: 'luqi_guest_trial_v1', value: 'fixture-only-not-a-real-auth-cookie',
    url: origin + '/api/v1/guest-chat', httpOnly: true,
    sameSite: 'Strict', secure: origin.startsWith('https:'),
  }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { unexpected.push(url.origin); return route.abort(); }
    if (url.pathname === '/api/v1/guest-chat' && route.request().method() === 'GET') return route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: { enabled: count < 3, remaining: 3 - count, limit: 3, reason: count < 3 ? 'ready' : 'complete' },
    });
    if (url.pathname === '/api/v1/guest-chat' && route.request().method() === 'POST') {
      const cookies = await page.context().cookies(origin + '/api/v1/guest-chat');
      expect(cookies.some(cookie => cookie.name === 'luqi_guest_trial_v1' &&
        cookie.httpOnly && cookie.sameSite === 'Strict')).toBe(true);
      const data = route.request().postDataJSON();
      questions.push(data.prompt);
      count++;
      return route.fulfill({ json: { status: 'success', provider: 'gemini', provider_model: 'fixture',
        response: 'Luqi reply ' + count + ': ' + data.prompt, remaining: 3 - count } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) { unexpected.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto('/#/try');
  await expect(page.getByRole('heading', { name: 'Ask first. Decide later.' })).toBeVisible();
  await expect(page.getByText('3 of 3 replies remaining')).toBeVisible();
  expect(questions).toHaveLength(0);
  await page.getByLabel('Message Luqi').fill('Explain gravity simply.');
  await expect(page.getByRole('button', { name: 'Ask Luqi' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I agree to send this question/ }).click();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByLabel('Message Luqi').fill('Follow-up question ' + i + '?');
    await page.getByRole('button', { name: 'Ask Luqi' }).click();
    await expect(page.getByText('Luqi reply ' + (i + 1) + ': ' +
      (i === 0 ? 'Explain gravity simply.' : 'Follow-up question ' + i + '?'))).toBeVisible();
  }
  expect(questions).toHaveLength(3);
  await expect(page.getByText('Guest trial complete')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create a free account' })).toHaveAttribute('href', '#/join');
  expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('guest trial paused honestly without network inference, signup remains available', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  let paid = 0;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/api/v1/guest-chat' && route.request().method() === 'GET')
      return route.fulfill({ json: { enabled: false, remaining: 0, limit: 3, reason: 'paused' } });
    if (url.pathname === '/api/v1/guest-chat' && route.request().method() === 'POST') { paid++; return route.abort(); }
    return route.continue();
  });
  await page.goto('/#/try');
  await expect(page.getByText('Guest allowance paused')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask Luqi' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Explore free Luqi tools' })).toBeVisible();
  expect(paid).toBe(0);
});
