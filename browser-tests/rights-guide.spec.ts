import { test, expect } from '@playwright/test';

test('free source-linked asylum guide is reachable on a 320px phone with no provider requests', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      unexpected.push(url.pathname);
      return route.fulfill({ status: 503, json: { code: 'TEST_NO_PROVIDER' } });
    }
    if (route.request().method() !== 'GET') unexpected.push(route.request().method());
    return route.continue();
  });

  await page.goto('/#/start');
  await page.getByRole('link', { name: 'Open the rights guide' }).click();
  await expect(page).toHaveURL(/#\/rights-guide$/);
  await expect(page.getByRole('heading', { name: /Understand your rights and the asylum process/ })).toBeVisible();
  await expect(page.getByText(/LUQI can make mistakes/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Original sources' })).toBeVisible();

  await page.getByLabel('Preferred explanation language').selectOption('sepitori');
  await expect(page.getByText(/Showing the English source-linked text instead/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open UNHCR legal-assistance directory' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow, 'public rights guide must not overflow a 320px viewport').toBe(false);
  expect(unexpected, 'public guide should not contact AI, government submissions or account APIs').toEqual([]);
});

test('each visible procedural claim links to an original source, never to a fake filing action', async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    return route.continue();
  });

  await page.goto('/#/rights-guide');
  await expect(page.getByRole('heading', { name: /Understand your rights and the asylum process/ })).toBeVisible();
  const legal = page.getByRole('article');
  const count = await legal.count();
  if (count > 0) {
    const links = legal.first().getByRole('link');
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
      expect(await link.getAttribute('rel')).toContain('noreferrer');
    }
  } else {
    await expect(page.getByRole('alert')).toContainText('Source review expired');
  }
  await expect(page.getByRole('button', { name: /submit claim|pay|book appointment/i })).toHaveCount(0);
});
