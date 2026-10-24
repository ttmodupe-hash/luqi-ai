import { test, expect } from '@playwright/test';

const labs = ['biology', 'chemistry', 'algebra', 'geometry'] as const;
for (const lab of labs) {
  test(`${lab} document renders inside the real application with same-origin framing only`, async ({ page, request }) => {
    const unexpected: string[] = [];
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:4386' || url.pathname.startsWith('/api/')) {
        unexpected.push(url.origin + url.pathname); await route.abort();
      } else await route.continue();
    });
    const response = await request.get(`/labs/${lab}_lab.html`);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers()['content-security-policy']).toBe("frame-ancestors 'self'");
    await page.goto(`/#/${lab}-lab`);
    const frame = page.frameLocator(`iframe[src="/labs/${lab}_lab.html"]`);
    await expect(frame.locator('h1')).toBeVisible();
    await expect(frame.locator('canvas').first()).toBeVisible();
    expect(unexpected).toEqual([]);
  });
}

test('embedded algebra remains interactive after production headers are applied', async ({ page }) => {
  await page.goto('/#/algebra-lab');
  const frame = page.frameLocator('iframe[src="/labs/algebra_lab.html"]');
  await expect(frame.locator('#dispSlope')).toHaveText('0.00');
  await frame.locator('#sliderX0').fill('2');
  await expect(frame.locator('#dispSlope')).toHaveText('9.00');
  await frame.locator('#btnReset').click();
  await expect(frame.locator('#dispSlope')).toHaveText('0.00');
});

for (const target of ['lab', 'account']) {
  test(`foreign origins cannot embed the ${target}`, async ({ page }) => {
    const refusals: string[] = [];
    page.on('console', message => {
      if (/frame-ancestors|X-Frame-Options|refused to (?:frame|display|load)/i.test(message.text())) refusals.push(message.text());
    });
    await page.goto(`http://127.0.0.1:4387/${target}`);
    await expect(page.getByRole('heading', { name: 'Foreign embedding test' })).toBeVisible();
    await expect.poll(() => refusals.length).toBeGreaterThan(0);
    await expect(page.frameLocator('#target').locator('canvas')).toHaveCount(0);
    await expect(page.frameLocator('#target').locator('input[type="password"]')).toHaveCount(0);
  });
}

test('account shell stays non-frameable even from the same origin', async ({ page, request }) => {
  const response = await request.get('/');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['content-security-policy']).toBe("frame-ancestors 'none'");
  const refusals: string[] = [];
  page.on('console', message => {
    if (/frame-ancestors|X-Frame-Options|refused to (?:frame|display|load)/i.test(message.text())) refusals.push(message.text());
  });
  await page.goto('/#/algebra-lab');
  await expect(page.frameLocator('iframe').locator('h1')).toBeVisible();
  await page.evaluate(() => {
    const frame = document.createElement('iframe'); frame.id = 'account-frame'; frame.src = '/#/login'; document.body.append(frame);
  });
  await expect.poll(() => refusals.length).toBeGreaterThan(0);
  await expect(page.frameLocator('#account-frame').locator('input[type="password"]')).toHaveCount(0);
});
