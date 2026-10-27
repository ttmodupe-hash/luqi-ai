import { expect, test } from '@playwright/test';

const now = new Date('2026-10-26T12:00:00Z');
const token = (account: string) => `fixture.${Buffer.from(JSON.stringify({
  exp: Math.floor(now.getTime() / 1000) + 60, account,
})).toString('base64url')}.not-a-signature`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: now });
  await page.route('**/v1/readiness', route => route.fulfill({ json: {
    checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
  } }));
  for (const action of ['register', 'login']) {
    await page.route(`**/api/v1/auth/${action}`, route => {
      const email = route.request().postDataJSON().email;
      return route.fulfill({ status: action === 'register' ? 201 : 200,
        json: { token: token(email), user: { email } } });
    });
  }
  await page.route('**/api/v1/luqi-core', route => route.fulfill({ json: {
    status: 'success', response: 'Synthetic first account Chat reply',
    provider: 'gemini', provider_model: 'fixture-model',
  } }));
});

test('signup opens real Chat; logout and a different login clear the previous reply and consent', async ({ page }) => {
  const paid: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/v1/luqi-core')) paid.push(request.postData()!);
  });
  await page.goto('/#/join');
  await page.getByLabel('Email', { exact: true }).fill('first@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password-2026');
  await page.getByLabel('Confirm password', { exact: true }).fill('fixture-password-2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LUQIChat', exact: true })).toBeVisible();
  expect(paid).toHaveLength(0);
  await page.getByLabel('Your question').fill('Synthetic first account question');
  await page.getByRole('checkbox', { name: /I understand this question may go/ }).check();
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(page.getByText('Synthetic first account Chat reply')).toBeVisible();
  // Change to the preserved local guide without reloading the shared signed-in tab.
  await page.getByRole('link', { name: 'Explore Africa and plan a goal locally' }).click();
  await page.getByLabel('What would you like help with?').fill('Help me plan my visit to Cape Town');
  await page.getByRole('button', { name: 'Find my next step', exact: true }).click();
  await page.getByRole('button', { name: 'Use my question in AI Chat' }).click();
  await expect(page.getByLabel('Your question')).toHaveValue('Help me plan my visit to Cape Town');
  const headerLogout = page.getByRole('button', { name: 'Log out of LUQI', exact: true });
  if (await headerLogout.isVisible()) await headerLogout.click();
  else {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name: 'Log out of LUQI', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('What would you like help with?')).toHaveValue('');
  await page.getByLabel('Email', { exact: true }).fill('second@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(/Signed in as second@example.invalid/)).toBeVisible();
  await expect(page.getByText('Synthetic first account Chat reply')).toHaveCount(0);
  await expect(page.getByLabel('Your question')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Use my question in AI Chat' })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /I understand my question goes/ })).not.toBeChecked();
  expect(paid).toHaveLength(1);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account', exact: true })).toBeVisible();
  expect(paid).toHaveLength(1);
});

test('expiry clears Chat and the shared header without another request or reload', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Email', { exact: true }).fill('expiry@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Your question')).toBeVisible();
  await page.getByLabel('Your question').fill('An unsent private draft');
  await page.getByRole('checkbox', { name: /I understand this question may go/ }).check();
  await page.clock.fastForward(61_000);
  await expect(page.getByText(/Your session ended/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in to your LUQI account', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out of LUQI', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Your question')).toHaveCount(0);
  await expect(page.getByText(/Signed in as expiry@example.invalid/)).toHaveCount(0);
});
