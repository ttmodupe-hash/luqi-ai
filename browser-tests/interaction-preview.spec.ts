import { test, expect } from '@playwright/test';

test('local course examples never send an arbitrary question or disguise it as a generated answer', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } }));
  await page.route('**/v1/**', route => route.fulfill({ status: 503, json: { code: 'SYNTHETIC_UNAVAILABLE' } }));
  await page.goto('/#/cert-academy');
  await page.getByRole('button', { name: 'AI Exam Coach', exact: true }).click();
  await page.getByText('Explore animated lesson examples', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Browser narration: off', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Explain BGP Path Selection Mnemonic/ }).click();
  const headline = page.getByRole('heading', { name: /BGP Path Selection:/ });
  await expect(headline).toBeVisible();
  await page.getByLabel('Local walkthrough topic', { exact: true }).fill('Explain an unrelated poetry question');
  await page.getByRole('button', { name: 'Open local example', exact: true }).click();
  await expect(page.getByText(/No matching local example/)).toBeVisible();
  await expect(page.getByLabel('Local walkthrough topic', { exact: true })).toHaveValue('Explain an unrelated poetry question');
  await expect(headline).toBeVisible();
  expect(writes).toEqual([]);
});
