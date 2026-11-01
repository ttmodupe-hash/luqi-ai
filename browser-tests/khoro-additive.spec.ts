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

test('a user-approved finance download contains the current comparison without uploading amounts', async ({ page }) => {
  const posts: string[] = [];
  const downloads: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/consumer-rights');
  const tool = page.getByRole('region', { name: 'Understand a balloon-payment scenario' });
  await tool.getByLabel('Amount financed (rand)').fill('120000');
  await tool.getByLabel('Annual interest (%)').fill('0');
  await tool.getByLabel('Repayment term (months)').fill('12');
  await tool.getByLabel('Balloon at term end (%)').fill('30');
  const explanation = tool.getByRole('region', { name: 'Understand the difference' });
  await expect(explanation.getByText(/A lower instalment is not proof/)).toBeVisible();
  expect(downloads).toEqual([]);
  const downloadEvent = page.waitForEvent('download');
  await tool.getByRole('button', { name: 'Download my comparison' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('luqi-vehicle-finance-comparison.txt');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Comparison download was not readable');
  let content = '';
  for await (const chunk of stream) content += chunk.toString();
  expect(content).toContain('Amount financed: R120000.00');
  expect(content).toContain('Monthly instalment: R7000.00');
  expect(content).toContain('Separate final balloon: R36000.00');
  expect(content).toContain('Additional total repaid with balloon: R0.00');
  expect(content).toContain('Excludes initiation/monthly fees, insurance');
  expect(content).toContain('Protect or delete the downloaded file on shared devices');
  await tool.getByLabel('Amount financed (rand)').fill('');
  await expect(tool.getByRole('button', { name: 'Download my comparison' })).toBeDisabled();
  await expect(tool.getByText(/Download requested/)).toHaveCount(0);
  expect(downloads).toEqual(['luqi-vehicle-finance-comparison.txt']);
  expect(posts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('download failure preserves the finance draft and never claims a saved file', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/#/consumer-rights');
  const tool = page.getByRole('region', { name: 'Understand a balloon-payment scenario' });
  await expect(tool.getByLabel('Amount financed (rand)')).toHaveValue('280000');
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Synthetic unsupported download'); }; });
  await tool.getByRole('button', { name: 'Download my comparison' }).click();
  await expect(tool.getByText(/This browser could not start the download/)).toBeVisible();
  await expect(tool.getByText(/Download requested/)).toHaveCount(0);
  await expect(tool.getByLabel('Amount financed (rand)')).toHaveValue('280000');
  await expect(tool.getByText('With balloon', { exact: true })).toBeVisible();
  expect(posts).toEqual([]);
});
