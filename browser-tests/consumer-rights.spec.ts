import { test, expect } from '@playwright/test';

test('consumer story stays local and options link to original regulators on a 320px display', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (route.request().method() !== 'GET' || url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/v1/')) {
      unexpected.push(route.request().method() + ' ' + url.pathname);
      return route.fulfill({ status: 503, json: { code: 'TEST_PROVIDER_DISABLED' } });
    }
    return route.continue();
  });

  await page.goto('/#/consumer-rights');
  await expect(page.getByRole('heading', { name: 'Consumer rights: understand your options' })).toBeVisible();
  await page.getByLabel('What kind of problem is it?').selectOption('UNAUTHORIZED_DEBIT_ORDER');
  await page.getByLabel('What happened? (redact personal details)')
    .fill('I noticed an unexpected debit order and asked my bank to investigate.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Disputed debit order or bank transaction' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Official legislation and complaint information' })
    .getByRole('link', { name: /National Financial Ombud/ })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows, '320px consumer guide must not overflow').toBe(false);
  expect(unexpected, 'consumer complaint preparation must never post user stories to an API').toEqual([]);
});
