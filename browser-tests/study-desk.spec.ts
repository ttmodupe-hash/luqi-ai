import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Study Desk creates, practises and reopens a flashcard deck at 320px without accounts or providers', async ({ page, baseURL }) => {
  const forbidden: string[] = [];
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(?:api|v1)\//.test(url.pathname)) {
      forbidden.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/start');
  const start = page.getByRole('link', { name: 'Open the study desk' });
  await expect(start).toBeVisible();
  await start.click();
  await expect(page.getByRole('heading', { name: 'Study desk', exact: true })).toBeVisible();
  await page.getByLabel('Deck title').fill('CCNA revision');
  await page.getByLabel('Question', { exact: true }).fill('What does DHCP stand for?');
  await page.getByLabel('Answer', { exact: true }).fill('Dynamic Host Configuration Protocol');
  await page.getByRole('button', { name: 'Add study card' }).click();
  await expect(page.getByText(/1 of 30 cards/)).toBeVisible();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByText('Dynamic Host Configuration Protocol', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'I remembered' }).click();
  await expect(page.getByText(/No cards due for review today/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download deck and progress (JSON)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('luqi-study-deck.json');
  const buffer = await readFile(await download.path());
  expect(buffer.toString('utf8')).toContain('"format": "luqi.study-deck.v1"');
  expect(buffer.toString('utf8')).toContain('Dynamic Host Configuration Protocol');

  await page.reload();
  await expect(page.getByText(/0 of 30 cards/)).toBeVisible();
  await page.getByLabel('Import an existing LUQI deck').setInputFiles({
    name: 'luqi-study-deck.json', mimeType: 'application/json', buffer,
  });
  await expect(page.getByText(/1 of 30 cards/)).toBeVisible();
  await expect(page.getByLabel('Deck title')).toHaveValue('CCNA revision');
  await expect(page.getByText(/1 reviewed at least once/)).toBeVisible();
  await expect(page.getByText(/No cards due for review today/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(forbidden).toEqual([]);
});

test('Study Desk plan uses entered topics, rejects contradictory input and never charges', async ({ page }) => {
  const calls: string[] = [];
  await page.route('**/api/**', route => { calls.push(route.request().url()); return route.abort(); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/study-desk');
  await page.getByLabel('Number of topics').fill('16');
  const target = await page.evaluate(() => {
    const date = new Date(), exam = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 8);
    return [exam.getFullYear(), String(exam.getMonth()+1).padStart(2,'0'), String(exam.getDate()).padStart(2,'0')].join('-');
  });
  await page.getByLabel('Exam date').fill(target);
  await page.getByRole('button', { name: 'Make a topic plan' }).click();
  const result = page.getByRole('status', { name: 'Study topic plan' });
  await expect(result).toContainText('2 topic(s) per day');
  await page.getByLabel('Number of topics').fill('20');
  await expect(result).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Subscribe|Checkout|Pay now/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(calls).toEqual([]);
});
