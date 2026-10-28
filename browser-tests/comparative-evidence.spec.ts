import { test, expect } from '@playwright/test';
test('comparative evidence works at 320px with no provider traffic', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const writes: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET') writes.push(req.url()); });
  await page.goto('/#/start');
  await page.getByRole('link', { name: 'Open comparative evidence guide' }).click();
  await expect(page).toHaveURL(/#\/comparative-evidence$/);
  await expect(page.getByRole('heading', { name: 'Faith, history and scientific evidence' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Scientific or material evidence' })).toBeVisible();
  await page.getByRole('button', { name: 'The Birmingham Qur’an manuscript' }).click();
  await expect(page.getByText(/dates the parchment, not directly the day the ink was written/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
});
test('Ask Luqi offers curated comparison and consumer dispute routes locally', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET') writes.push(req.url()); });
  await page.goto('/#/ask');
  await page.getByLabel('What would you like help with?').fill('Did the Council of Nicaea choose the Bible?');
  await page.getByRole('button', { name: 'Find my next step' }).click();
  await expect(page.getByRole('heading', { name: 'Compare faith, history and scientific evidence' })).toBeVisible();
  await page.getByRole('link', { name: 'Open comparative evidence guide' }).click();
  await expect(page).toHaveURL(/#\/comparative-evidence$/);
  await page.goto('/#/ask');
  await page.getByLabel('What would you like help with?').fill('My online order delivery is delayed again');
  await page.getByRole('button', { name: 'Find my next step' }).click();
  await expect(page.getByRole('heading', { name: 'Understand your consumer options' })).toBeVisible();
  await page.getByRole('link', { name: 'Open the consumer guide' }).click();
  await expect(page).toHaveURL(/#\/consumer-rights$/);
  expect(writes).toEqual([]);
});

test('signed-in Luqi shows local consumer and evidence advice without charging a provider', async ({ page }) => {
  const paid: string[] = [];
  await page.route('**/api/v1/auth/login', route => route.fulfill({
    json: { token: 'comparative-consumer-fixture-session', user: { email: 'knowledge.fixture@example.invalid' } },
  }));
  await page.route('**/v1/readiness', route => route.fulfill({
    json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } },
  }));
  await page.route('**/api/v1/companion/conversations?*', route => route.fulfill({json:{conversations:[]}}));
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/luqi-core/.test(request.url())) paid.push(request.url());
  });
  await page.goto('/#/companion');
  await page.getByLabel('Email', { exact: true }).fill('knowledge.fixture@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh saved history' })).toBeVisible();
  await page.getByRole('link', { name: 'Ask Luqi', exact: true }).click();
  await page.getByLabel('Your question').fill('My online order delivery is delayed again');
  await expect(page.getByRole('heading', { name: 'Luqi consumer help — three first steps' })).toBeVisible();
  await page.getByRole('button', { name: 'Open free consumer rights guide' }).click();
  await expect(page).toHaveURL(/#\/consumer-rights$/);
  await page.goto('/#/chat');
  await page.getByLabel('Your question').fill('Did the Council of Nicaea choose the Bible?');
  await expect(page.getByRole('heading', { name: 'Explore a scholarly comparison with Luqi' })).toBeVisible();
  await page.getByRole('button', { name: 'Open free comparative evidence guide' }).click();
  await expect(page).toHaveURL(/#\/comparative-evidence$/);
  expect(paid).toEqual([]);
});
