import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('expired programme guidance stays visible while useful work, downloads and source navigation remain available', async ({ page, baseURL }, info) => {
  const origin = new URL(baseURL!).origin;
  const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
    if (url.origin !== origin || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  page.on('dialog', dialog => dialog.accept());
  await page.clock.setFixedTime(new Date('2026-11-10T10:00:00+02:00'));
  await page.goto('/#/township-economy');
  await page.getByRole('button', { name: 'Start my business workbench' }).click();
  const review = page.getByRole('status', { name: 'Township programme review status' });
  await expect(review).toBeVisible();
  await expect(review).toContainText('needs a new review');
  expect(await review.evaluate(node => !!node.closest('#township-workbench'))).toBe(true);
  await page.getByLabel('Workbench business name', { exact: true }).fill('Ubuntu Salon');
  await page.getByLabel('Workbench selling price (ZAR)').fill('150');
  await page.getByLabel('Workbench direct cost per sale (ZAR)').fill('100');
  await page.getByLabel('Workbench fixed costs for the period (ZAR)').fill('1000');
  await page.getByRole('button', { name: 'Calculate my sales target' }).click();
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toContainText('20');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save editable business project' }).click(),
  ]);
  expect(JSON.parse(readFileSync((await download.path())!, 'utf8')).businessName).toBe('Ubuntu Salon');
  const sourceButton = page.getByRole('button', { name: 'View original programme sources' });
  await sourceButton.focus();
  await page.keyboard.press('Enter');
  const sources = page.getByRole('region', { name: 'Township official programmes' });
  await expect(sources).toBeFocused();
  await expect(sources.getByRole('link', { name: 'Open original official source' })).toHaveCount(8);
  await expect(page.getByLabel('Workbench business name', { exact: true })).toHaveValue('Ubuntu Salon');
  await expect(page.getByRole('status', { name: 'Workbench pricing result' })).toContainText('20');
  expect(page.url()).toContain('#/township-economy');
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Start my business workbench' }).click();
  await page.screenshot({ path: info.outputPath('township-source-context.png') });
});
