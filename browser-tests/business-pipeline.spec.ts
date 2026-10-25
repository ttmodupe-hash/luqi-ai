import { test, expect } from '@playwright/test';

test('mobile Business Desk preserves real quote details into a locally downloadable follow-up board', async ({ page, baseURL }) => {
  const forbidden: string[] = [];
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(?:api|v1)\//.test(url.pathname)) {
      forbidden.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await page.getByLabel('Business name').fill('Mzansi Design');
  await page.getByLabel('Customer name').fill('Bakery client');
  await page.getByLabel('Quote reference').fill('Q-01');
  await page.getByLabel('Item 1 description').fill('Brand design');
  await page.getByLabel('Item 1 quantity').fill('3');
  await page.getByLabel('Item 1 unit price (ZAR)').fill('100.25');
  await page.getByRole('button', { name: 'Prepare quotation' }).click();
  await page.getByRole('button', { name: 'Use current quotation details' }).click();
  await expect(page.getByLabel('Client nickname')).toHaveValue('Bakery client');
  await expect(page.getByLabel('Quote amount (ZAR)')).toHaveValue('300.75');
  await page.getByLabel('Next follow-up date (optional)').fill('2026-01-01');
  await page.getByRole('button', { name: 'Add to local board' }).click();
  const board = page.getByRole('list', { name: 'Local prospect records' });
  await expect(board.getByText('Bakery client')).toBeVisible();
  await expect(page.getByLabel('Due follow-ups')).toContainText('Bakery client');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download board JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('luqi-sales-board.json');
  await expect(page.locator('.luqi-sales-board').getByRole('status')).toContainText('Download requested');
  await page.getByLabel('Stage for Bakery client').selectOption('won');
  await expect(page.getByLabel('Follow-up date for Bakery client')).toBeDisabled();
  await page.getByRole('button', { name: 'Remove local record' }).click();
  await page.getByRole('button', { name: 'Confirm local removal' }).click();
  await expect(board.getByText('Bakery client')).toHaveCount(0);
  // The original JSON is only restored after explicit user confirmation.
  const contents = await import('node:fs/promises').then(fs => download.path().then(path => fs.readFile(path)));
  await page.getByLabel('Open a previous LUQI board (JSON, max 32 KiB)').setInputFiles({
    name: 'luqi-sales-board.json', mimeType: 'application/json', buffer: contents,
  });
  await expect(page.getByRole('group', { name: 'Confirm board replacement' })).toBeVisible();
  await expect(board.getByText('Bakery client')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm replace board' }).click();
  await expect(board.getByText('Bakery client')).toBeVisible();
  expect(forbidden).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('invalid imported client data cannot replace a local board', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await page.getByLabel('Client nickname').fill('Existing quote');
  await page.getByLabel('Quote amount (ZAR)').fill('12.00');
  await page.getByRole('button', { name: 'Add to local board' }).click();
  await page.getByLabel('Open a previous LUQI board (JSON, max 32 KiB)').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from('{"format":"luqi.sales-board.v1","records":[{"ownerId":"stranger"}]}'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid LUQI sales-board');
  await expect(page.getByRole('list', { name: 'Local prospect records' }).getByText('Existing quote')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm replace board' })).toHaveCount(0);
});
