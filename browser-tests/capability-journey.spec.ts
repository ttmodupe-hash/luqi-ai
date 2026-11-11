import { test, expect } from '@playwright/test';

// Only synthetic device-local goals. The network guard prevents paid API calls.
test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/possibility');
  await page.getByRole('button', { name: 'I want to become a network engineer' }).click();
  await page.getByRole('button', { name: /Save as my journey/i }).click();
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeVisible();
});

test('320px keyboard stage completion persists without provider requests', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Mark complete:/i }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Stage marked complete on this device.');
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(posts).toEqual([]);
});

test('an older tab cannot overwrite or erase a later tab’s saved stage', async ({ page, context }) => {
  const otherTab = await context.newPage();
  await otherTab.goto('/#/journey');
  await expect(otherTab.getByRole('heading', { name: 'I want to become a network engineer' })).toBeVisible();
  await otherTab.getByRole('button', { name: /Mark complete:/i }).nth(2).click();
  await expect(otherTab.getByText('25%', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Mark complete:/i }).first().click();
  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Clear saved journey/i }).click();
  await expect(page.getByRole('status')).toContainText('changed in another tab');

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('luqi:capability-journey:v1');
    return raw ? JSON.parse(raw) as { completed: number[] } : null;
  });
  expect(persisted?.completed).toEqual([2]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await otherTab.close();
});

test('denied storage write does not claim that a stage was completed', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'luqi:capability-journey:v1') {
        throw new DOMException('Synthetic storage failure', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: /Mark complete:/i }).first().click();
  await expect(page.getByRole('status')).toContainText('could not be confirmed as saved');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  const completed = await page.evaluate(() => {
    const raw = localStorage.getItem('luqi:capability-journey:v1');
    return raw ? (JSON.parse(raw) as { completed: number[] }).completed : null;
  });
  expect(completed).toEqual([]);
});
