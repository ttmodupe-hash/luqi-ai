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
  expect(writes).toEqual([]);

  await page.getByRole('button', { name: 'Try Luqi AI as a guest' }).click();
  await expect(page).toHaveURL(/\/\#\/try/);
  expect(writes).toEqual([]); // Navigation and preview must never make a provider request.
});
