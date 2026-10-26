import { test, expect } from '@playwright/test';

test('consumer story stays local and options link to original regulators on a 320px display', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (route.request().method() !== 'GET' || url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/v1/')) {
      unexpected.push(route.request().method() + ' ' + url.pathname);
      return route.fulfill({ status: 503, json: { code: 'TEST_PROVIDER_DISABLED' } });
    }
    return route.continue();
  });

  await page.goto('/#/consumer-rights');
  await expect(page.getByRole('heading', { name: 'Consumer rights: understand your options' })).toBeVisible();
  await page.getByLabel('What kind of problem is it?').selectOption('UNAUTHORIZED_DEBIT_ORDER');
  await page.getByLabel('What happened? (redact personal details)')
    .fill('I noticed an unexpected debit order and asked my bank to investigate.');
  await page.getByRole('button', { name: 'Prepare my options locally' }).click();
  await expect(page.getByRole('heading', { name: 'Disputed debit order or bank transaction' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Official legislation and complaint information' })
    .getByRole('link', { name: /National Financial Ombud/ })).toBeVisible();
  const viewport = await page.evaluate(() => {
    const nodes = [...document.body.querySelectorAll('*')];
    const offenders = nodes.map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className.slice(0, 75) : '',
        x: Math.round(box.x), right: Math.round(box.right), width: Math.round(box.width),
        visible: box.width > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    }).filter(item => item.visible && item.right > window.innerWidth + 1)
      .sort((a, b) => b.right - a.right).slice(0, 14);
    return { width: window.innerWidth, scroll: document.documentElement.scrollWidth, offenders };
  });
  expect(viewport.scroll, 'No horizontal overflow. Overshooting element bounds: ' + JSON.stringify(viewport.offenders))
    .toBeLessThanOrEqual(viewport.width + 1);
  expect(unexpected, 'consumer complaint preparation must never post user stories to an API').toEqual([]);
});
