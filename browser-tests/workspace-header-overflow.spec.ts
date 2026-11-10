import { test, expect, type Page } from '@playwright/test';

// A prior 17-link one-line header stretched the document beyond the viewport,
// clipping the Luqi logo and pushing the homepage into an apparently blank area.
async function checkViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 820 });
  await expect(page.getByRole('link', { name: 'Luqi workspace home' })).toBeVisible();
  // The shell loads before the deferred homepage. Measure actual page content,
  // retaining every viewport bound below rather than sampling its placeholder.
  await expect(page.locator('.luqi-home')).toBeVisible();
  const dimensions = await page.evaluate(() => {
    const shell = document.querySelector('.luqi-shell')?.getBoundingClientRect();
    const header = document.querySelector('.luqi-header')?.getBoundingClientRect();
    const main = document.querySelector('.luqi-home')?.getBoundingClientRect();
    const brand = document.querySelector('.luqi-brand')?.getBoundingClientRect();
    const actions = document.querySelector('.luqi-header-actions')?.getBoundingClientRect();
    return {
      viewport: innerWidth,
      page: document.documentElement.scrollWidth,
      shell: shell ? { left: shell.left, right: shell.right, width: shell.width } : null,
      header: header ? { left: header.left, right: header.right } : null,
      main: main ? { left: main.left, right: main.right } : null,
      brand: brand ? { left: brand.left, right: brand.right } : null,
      actions: actions ? { left: actions.left, right: actions.right } : null,
    };
  });
  expect(dimensions.page, JSON.stringify(dimensions)).toBeLessThanOrEqual(width + 1);
  for (const name of ['shell', 'header', 'main', 'brand', 'actions'] as const) {
    const rect = dimensions[name];
    expect(rect, name + JSON.stringify(dimensions)).not.toBeNull();
    expect(rect!.left, name + JSON.stringify(dimensions)).toBeGreaterThanOrEqual(-1);
    expect(rect!.right, name + JSON.stringify(dimensions)).toBeLessThanOrEqual(width + 1);
  }
  expect(dimensions.shell?.width).toBeGreaterThanOrEqual(width - 1);
}

test('Luqi shell and navigation remain inside the viewport at phone, tablet and wide-desktop sizes', async ({ page }) => {
  await page.goto('/#/');
  for (const width of [320, 390, 700, 1107, 1440, 1441, 1828, 1920]) {
    await checkViewport(page, width);
  }
});

test('wide desktop keeps all additional services visible in the second navigation row', async ({ page }) => {
  await page.setViewportSize({ width: 1828, height: 900 });
  await page.goto('/#/');
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  const services = page.getByRole('navigation', { name: 'More Luqi services' });
  await expect(primary.getByRole('link', { name: 'Chat', exact: true })).toBeVisible();
  await expect(primary.getByRole('link', { name: 'Workspace', exact: true })).toBeVisible();
  for (const label of ['Luqi-Drive GPS', 'Municipal services', 'Civic evidence', 'Install']) {
    await expect(services.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.locator('.luqi-more-services')).toHaveCount(0);
  expect(await services.evaluate(el => getComputedStyle(el).position)).not.toBe('absolute');
  await services.getByRole('link', { name: 'Municipal services', exact: true }).click();
  await expect(page).toHaveURL(/#\/municipalities$/);
  await expect(services.getByRole('link', { name: 'Municipal services', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('secondary desktop row is visible at the minimum wide-screen breakpoint without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1441, height: 820 });
  await page.goto('/#/');
  const services = page.getByRole('navigation', { name: 'More Luqi services' });
  await expect(services.getByRole('link', { name: 'Spatial Vision & 3D Lab' })).toBeVisible();
  await expect(services.getByRole('link', { name: 'Civic evidence' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('tablet and small mobile still expose all destinations through the navigation button', async ({ page }) => {
  await page.goto('/#/');
  for (const width of [1107, 320]) {
    await page.setViewportSize({ width, height: 820 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(nav.getByRole('link', { name: 'Install', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Local Pulse', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Civic evidence', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Luqi-Drive GPS', exact: true })).toBeVisible();
    await nav.getByRole('link', { name: 'Local Pulse', exact: true }).click();
    await expect(page).toHaveURL(/#\/local-pulse$/);
    await expect(nav).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.goto('/#/');
  }
});
