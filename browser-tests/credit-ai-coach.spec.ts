import { test, expect } from '@playwright/test';

test('AI credit coaching stays local until a separate user-controlled Chat Send', async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(new Date('2026-11-03T08:00:00Z'));
  await page.setViewportSize({ width: 320, height: 740 });
  const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== 'GET') {
      writes.push(request.method() + ' ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/#/consumer-rights');

  await expect(page.getByRole('heading', { name: 'Credit health & AI rights coach' })).toBeVisible();
  await expect(page.getByText('This unvalidated educational exercise is NOT a credit score', { exact: false })).toBeVisible();
  const index = page.getByTestId('credit-habits-index');
  const baseline = await index.textContent();
  await page.getByRole('slider', { name: /On-time payment example/ }).focus();
  await page.keyboard.press('End');
  await expect(index).not.toHaveText(baseline ?? '');

  await page.getByLabel('What do you want help understanding?').selectOption('dispute-record');
  await expect(page.getByTestId('credit-ai-preview')).toContainText('section 72');
  await expect(page.getByRole('link', { name: 'TransUnion: free annual report' })).toHaveAttribute(
    'href', 'https://www.transunion.co.za/product/annual-free-credit-report',
  );
  await expect(page.getByRole('link', { name: /National Credit Regulator: 2007 NCA consumer guide/ })).toHaveAttribute(
    'href', 'https://ncr.org.za/documents/pages/Brochures/ENGLISH.pdf',
  );
  await expect(page.getByRole('link', { name: /National Credit Regulator: dispute complaints guideline 005\/2024/ })).toHaveAttribute(
    'href', 'https://www.ncr.org.za/phocadownload/GUIDELINES%20FOR%20THE%20SUBMISSION%20OF%20COMPLAINTS%20RELATING%20TO%20DISPUTED%20CONSUMER%20CREDIT%20INFORMATION.pdf',
  );
  await expect(page.getByRole('link', { name: /South African Government: National Credit Act 34 of 2005/ })).toHaveAttribute(
    'href', 'https://www.gov.za/documents/national-credit-act',
  );
  await expect(page.getByRole('link', { name: /National Credit Regulator: credible-evidence guideline 005\/2025/ })).toHaveAttribute(
    'href', 'https://ncr.org.za/documents/Guidelines/Guideline%20December%202025.pdf',
  );
  await expect(page.getByText("The NCR's December 2025 credible-evidence guideline", { exact: false })).toContainText('objective, verifiable records');
  await expect(page.getByRole('link', { name: 'National Credit Regulator: complaints and Form 29' })).toHaveAttribute(
    'href', 'https://www.ncr.org.za/index.php/departments/complaints',
  );
  await expect(page.getByText('NCR guideline 005/2024 says', { exact: false })).toContainText('five business days');
  await expect(page.getByText('If the bureau provides supporting evidence', { exact: false })).toContainText('Form 29');
  await expect(page.getByText('The NCR guide above is from 2007', { exact: false })).toBeVisible();
  expect(writes).toEqual([]);

  await page.getByRole('button', { name: 'Try Luqi AI as a guest' }).click();
  await expect(page).toHaveURL(/\/\#\/try/);
  expect(writes).toEqual([]); // Navigation and preview must never make a provider request.
});

test('signed-in customer stages only an approved general credit question; provider is never called on navigation', async ({ page }) => {
  const providerPosts: string[] = [];
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } }));
  await page.route('**/v1/**', route => route.fulfill({ json: { status: 'configured_not_verified', checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } }));
  await page.route('**/api/v1/auth/login', route => route.fulfill({
    json: { token: 'synthetic-credit-fixture', user: { email: 'credit-fixture@example.invalid', name: 'Test learner' } },
  }));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core(?:\?|$)/.test(request.url())) providerPosts.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/chat');
  await page.getByText('Prefer to sign in here?', { exact: true }).click();
  const signIn = page.getByRole('region', { name: 'Sign in to your Luqi account' });
  await signIn.getByLabel('Email', { exact: true }).fill('credit-fixture@example.invalid');
  await signIn.getByLabel('Password', { exact: true }).fill('synthetic-passphrase');
  await signIn.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Your question', { exact: true })).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/consumer-rights'; });
  await expect(page.getByRole('heading', { name: 'Credit health & AI rights coach' })).toBeVisible();
  await page.getByLabel('What do you want help understanding?').selectOption('dispute-record');
  const neutralQuestion = (await page.getByTestId('credit-ai-preview').textContent())!.trim();
  expect(neutralQuestion).toContain('section 72');
  await page.getByRole('button', { name: 'Prepare question in Luqi AI Chat' }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue(neutralQuestion);
  await expect(page.getByRole('checkbox', { name: /I understand AI text may go/ })).not.toBeChecked();
  expect(providerPosts).toEqual([]);
  const stored = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
  expect(stored).not.toContain(neutralQuestion);
});
