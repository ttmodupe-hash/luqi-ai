import { test, expect } from '@playwright/test';

test('phone users prepare an actual quotation draft, download it and never send personal details', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const calls: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(?:api|v1)\//.test(url.pathname)) {
      calls.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await expect(page.getByRole('heading', { name: 'Business desk' })).toBeVisible();
  await page.getByLabel('Business name').fill('Maboneng Studio');
  await page.getByLabel('Customer name').fill('Pilot client');
  await page.getByLabel('Quote reference').fill('Q-2026-01');
  await page.getByLabel('Item 1 description').fill('Graphic design');
  await page.getByLabel('Item 1 quantity').fill('3');
  await page.getByLabel('Item 1 unit price (ZAR)').fill('100.25');
  await page.getByRole('button', { name: 'Add another line' }).click();
  await page.getByLabel('Item 2 description').fill('Local delivery');
  await page.getByLabel('Item 2 unit price (ZAR)').fill('0.10');
  await page.getByRole('button', { name: 'Prepare quotation' }).click();
  const result = page.getByRole('status', { name: 'Draft quotation result' });
  await expect(result).toContainText('R 300.85');
  await expect(result).toContainText('Not a tax invoice');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download text draft' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('luqi-draft-quotation.txt');
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByLabel('Item 1 unit price (ZAR)').fill('200.00');
  await expect(page.getByRole('button', { name: 'Download text draft' })).toHaveCount(0);
});

test('local break-even calculator rejects unsustainable price and has no paid checkout', async ({ page }) => {
  const apiCalls: string[] = [];
  await page.route('**/api/**', route => {
    apiCalls.push(route.request().url());
    return route.abort();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await page.getByLabel('Selling price per sale (ZAR)').fill('150');
  await page.getByLabel('Direct cost per sale (ZAR)').fill('100');
  await page.getByLabel('Fixed costs to cover (ZAR, same period)').fill('1000');
  await page.getByRole('button', { name: 'Calculate break-even sales' }).click();
  const result = page.getByRole('status', { name: 'Selling price result' });
  await expect(result).toContainText('20');
  await expect(result).toContainText('33.33%');
  await page.getByLabel('Direct cost per sale (ZAR)').fill('170');
  await expect(result).toHaveCount(0);
  await page.getByRole('button', { name: 'Calculate break-even sales' }).click();
  await expect(page.getByRole('status', { name: 'Selling price result' }))
    .toContainText('Not achievable at this price');
  await expect(page.getByRole('button', { name: /Pay|Subscribe|Checkout/i })).toHaveCount(0);
  expect(apiCalls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
