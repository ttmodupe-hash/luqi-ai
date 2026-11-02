import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('encrypted quote backup exports ciphertext and requires correct local passphrase to reopen at 320px', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const forbidden: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(?:api|v1)\//.test(url.pathname)) {
      forbidden.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const secret = 'Unique independent offline backup passphrase 2026';
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await expect(page.getByRole('heading', { name: 'Business desk' })).toBeVisible();
  await page.getByLabel('Business name').fill('Limpopo Designs');
  await page.getByLabel('Customer name').fill('Customer Nickname');
  await page.getByLabel('Quote reference').fill('Q-PRIVATE');
  await page.getByLabel('Item 1 description').fill('Poster design');
  await page.getByLabel('Item 1 unit price (ZAR)').fill('255.25');
  await page.getByRole('button', { name: 'Prepare quotation' }).click();
  await page.getByLabel('New backup passphrase').fill(secret);
  await page.getByLabel('Repeat backup passphrase').fill(secret);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download encrypted backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('luqi-quote-encrypted.json');
  const bytes = readFileSync((await download.path())!, 'utf8');
  const encrypted = JSON.parse(bytes);
  expect(encrypted.format).toBe('luqi.business.encrypted-backup.v1');
  expect(encrypted.kind).toBe('quote');
  expect(bytes).not.toContain('Customer Nickname');
  expect(bytes).not.toContain('Limpopo Designs');
  expect(bytes).not.toContain(secret);
  await expect(page.getByLabel('New backup passphrase')).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('Business name')).toHaveValue('');
  await page.getByLabel('Select encrypted quotation file (.json)').setInputFiles({
    name: 'luqi-quote-encrypted.json', mimeType: 'application/json', buffer: Buffer.from(bytes),
  });
  await page.getByLabel('Backup unlock passphrase').fill('Definitely incorrect passphrase 2026');
  await page.getByRole('button', { name: 'Unlock selected backup' }).click();
  await expect(page.getByText(/Unable to unlock that file/)).toBeVisible();
  await expect(page.getByLabel('Business name')).toHaveValue('');
  await page.getByLabel('Backup unlock passphrase').fill(secret);
  await page.getByRole('button', { name: 'Unlock selected backup' }).click();
  await expect(page.getByRole('button', { name: 'Confirm replace quotation' })).toBeVisible();
  await expect(page.getByLabel('Business name')).toHaveValue('');
  await page.getByRole('button', { name: 'Confirm replace quotation' }).click();
  await expect(page.getByLabel('Business name')).toHaveValue('Limpopo Designs');
  await expect(page.getByLabel('Customer name')).toHaveValue('Customer Nickname');
  await expect(page.getByRole('status', { name: 'Draft quotation result' })).toContainText('R 255.25');
  await expect(page.getByLabel('Backup unlock passphrase')).toHaveValue('');
  expect(forbidden).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => [localStorage.length,sessionStorage.length])).toEqual([0,0]);
});
