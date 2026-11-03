import { test, expect } from '@playwright/test';

test('physics discovery offers eight working browser-local experiments without AI or account writes', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') writes.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/physics-lab');
  await expect(page.getByRole('heading', { name: 'Explore more than one physics experiment' })).toBeVisible();
  const catalogue = page.getByRole('navigation', { name: 'Physics experiment catalogue' });
  await expect(catalogue.getByRole('button')).toHaveCount(8);
  await expect(catalogue.getByRole('link', { name: /Pendulum, resonance and chaos/ }))
    .toHaveAttribute('href', '#/pendulum-lab');
  const original = await page.getByText('Horizontal range').locator('..').textContent();
  await page.getByRole('slider', { name: 'Launch speed' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Horizontal range').locator('..')).not.toHaveText(original!);
  await page.getByRole('button', { name: 'Record observation' }).click();
  await expect(page.getByRole('table', { name: 'Recorded physics observations' })).toBeVisible();
  await catalogue.getByRole('button', { name: /Electric circuits/ }).click();
  await expect(page.getByRole('heading', { name: 'Electric circuits', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Connection' }).selectOption('1');
  await expect(page.getByText('Calculated state · Parallel connection')).toBeVisible();
  expect(writes).toEqual([]);
});

test('small-phone physics experiments remain usable and do not stretch the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/physics-lab?experiment=thermal');
  await expect(page.getByRole('heading', { name: 'Heat and temperature', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Material' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Material' }).selectOption('1');
  await expect(page.getByText('Calculated state · Aluminium')).toBeVisible();
  await page.getByRole('button', { name: 'Record observation' }).click();
  await expect(page.getByRole('table', { name: 'Recorded physics observations' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
