import { test, expect, type Page } from '@playwright/test';

// A prior 17-link one-line header stretched the document beyond the viewport,
// clipping the Luqi logo and pushing the homepage into an apparently blank area.
async function checkViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 820 });
  await expect(page.getByRole('link', { name: 'Luqi workspace home' })).toBeVisible();
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

test('wide desktop keeps Chat visible and all other services in accessible More menu', async ({ page }) => {
  await page.setViewportSize({ width: 1828, height: 900 });
  await page.goto('/#/');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav.getByRole('link', { name: 'Chat', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Workspace', exact: true })).toBeVisible();
  const more = nav.locator('.luqi-more-services');
  await more.locator('summary').click();
  await expect(more.getByRole('link', { name: 'Municipal services', exact: true })).toBeVisible();
  await expect(more.getByRole('link', { name: 'Civic evidence', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(more).not.toHaveAttribute('open', '');
  await more.locator('summary').click();
  await more.getByRole('link', { name: 'Municipal services', exact: true }).click();
  await expect(page).toHaveURL(/#\/municipalities$/);
  await expect(more).not.toHaveAttribute('open', '');
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
    await nav.getByRole('link', { name: 'Local Pulse', exact: true }).click();
    await expect(page).toHaveURL(/#\/local-pulse$/);
    await expect(nav).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.goto('/#/');
  }
});
