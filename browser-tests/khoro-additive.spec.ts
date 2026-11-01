import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // These local tools must work with the provider unavailable and no account.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } }));
  await page.route('**/v1/**', route => route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } }));
});

test('finance inputs can be cleared and corrected without silent clamping at 320px', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/consumer-rights');
  const tool = page.getByRole('region', { name: 'Understand a balloon-payment scenario' });
  await expect(tool).toBeVisible();
  const amount = tool.getByLabel('Amount financed (rand)');
  await amount.fill('');
  await expect(amount).toHaveValue('');
  await expect(tool.getByText('With balloon', { exact: true })).toHaveCount(0);
  await amount.fill('120000');
  await tool.getByLabel('Annual interest (%)').fill('0');
  await tool.getByLabel('Repayment term (months)').fill('12');
  await tool.getByLabel('Balloon at term end (%)').fill('30');
  await expect(tool.getByText(/\/ month/).first()).toHaveText(/R\s*7[\s,.]*000[,.]00\s*\/ month/);
  await tool.getByLabel('Repayment term (months)').fill('12.5');
  await expect(tool.getByText('With balloon', { exact: true })).toHaveCount(0);
  await tool.getByLabel('Repayment term (months)').fill('12');
  await expect(tool.getByText('With balloon', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(posts).toEqual([]);
});

test('concept switching preserves unsaved drafts and never claims translation or grading', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/study-desk');
  const tool = page.getByRole('region', { name: 'Understand a concept in your own words' });
  await tool.getByLabel('Your explanation (English)', { exact: true }).fill('Speed and direction stay the same.');
  await tool.getByRole('button', { name: 'Friction', exact: true }).click();
  await tool.getByLabel('Your explanation (English)', { exact: true }).fill('Friction opposes sliding.');
  await tool.getByRole('button', { name: 'Constant velocity', exact: true }).click();
  await expect(tool.getByLabel('Your explanation (English)', { exact: true })).toHaveValue('Speed and direction stay the same.');
  await tool.getByLabel('Your explanation language', { exact: true }).selectOption('Setswana');
  await expect(tool.getByLabel('Your explanation (Setswana)', { exact: true })).toHaveValue('Speed and direction stay the same.');
  await expect(tool.getByText(/does not automatically translate or grade/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(posts).toEqual([]);
});
