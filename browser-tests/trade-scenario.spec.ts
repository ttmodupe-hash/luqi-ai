import { test, expect } from '@playwright/test';

test('phone visitors run a real local USD scenario without any sensing or provider request', async ({ page }) => {
  const requests: string[] = [];
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/**', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/#/african-radar');
  await expect(page.getByRole('heading', { name: 'African Opportunity Radar' })).toBeVisible();
  await expect(page.getByText(/not currently connected to a verified live grant feed/)).toBeVisible();
  await page.getByLabel('Declared cargo value (USD)').fill('65000.00');
  await page.getByLabel('Assumed standard duty (%)').fill('15');
  await page.getByLabel('Assumed comparison duty (%)').fill('2.5');
  await page.getByRole('button', { name: 'Calculate illustrative duties' }).click();
  const result = page.getByRole('status', { name: 'Illustrative duty comparison' });
  await expect(result).toContainText('USD 9,750.00');
  await expect(result).toContainText('USD 1,625.00');
  await expect(result).toContainText('USD 8,125.00');
  await expect(result).toContainText('not verified customs duties');
  await page.getByLabel('Assumed comparison duty (%)').fill('4');
  await expect(result).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
