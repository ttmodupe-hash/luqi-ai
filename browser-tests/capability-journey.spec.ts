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

test('clearing a saved journey by keyboard restores focus at 320px', async ({ page }) => {
  const clear = page.getByRole('button', { name: /Clear saved journey/i });
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Start with a goal worth working toward/i })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Saved journey cleared from this device.');
  expect(await page.evaluate(() => localStorage.getItem('luqi:capability-journey:v1'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('an older tab cannot overwrite or erase a later tab’s saved stage', async ({ page, context }) => {
  const otherTab = await context.newPage();
  await otherTab.goto('/#/journey');
  await expect(otherTab.getByRole('heading', { name: 'I want to become a network engineer' })).toBeVisible();
  await otherTab.getByRole('button', { name: /Mark complete:/i }).nth(2).click();
  await expect(otherTab.getByText('25%', { exact: true })).toBeVisible();

  // The real cross-tab storage event proactively locks the older view.
  // Clicking a disabled control would time out, not validate stale-edit safety.
  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mark complete:/i }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: /Clear saved journey/i })).toBeDisabled();

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('luqi:capability-journey:v1');
    return raw ? JSON.parse(raw) as { completed: number[] } : null;
  });
  expect(persisted?.completed).toEqual([2]);
  await page.getByRole('button', { name: 'Load latest saved journey' }).click();
  await expect(page.getByRole('status')).toContainText('Loaded the latest saved journey');
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Mark complete:/i }).first().click();
  await expect(page.getByText('50%', { exact: true })).toBeVisible();
  const updated = await page.evaluate(() => {
    const raw = localStorage.getItem('luqi:capability-journey:v1');
    return raw ? (JSON.parse(raw) as { completed: number[] }).completed : null;
  });
  expect(updated).toEqual([0, 2]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await otherTab.close();
});

test('newer progress automatically announces stale state and accepts keyboard recovery at 320px', async ({ page, context }) => {
  const otherTab = await context.newPage();
  await otherTab.goto('/#/journey');
  await otherTab.getByRole('button', { name: /Mark complete:/i }).nth(2).click();
  await expect(otherTab.getByText('25%', { exact: true })).toBeVisible();
  // No user action in the first tab: the browser dispatches the real storage event.
  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await otherTab.close();
});

test('an initially empty tab discovers a goal saved in another tab at 320px', async ({ page, context }) => {
  await page.evaluate(() => localStorage.removeItem('luqi:capability-journey:v1'));
  // The page is already at /#/journey from beforeEach; remount to read the cleared storage.
  await page.reload();
  await expect(page.getByRole('heading', { name: /Start with a goal worth working toward/i })).toBeVisible();

  const otherTab = await context.newPage();
  const posts: string[] = [];
  otherTab.on('request', request => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  const origin = new URL(page.url()).origin;
  await otherTab.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await otherTab.goto('/#/possibility');
  await otherTab.getByRole('button', { name: 'I want to become a network engineer' }).click();
  await otherTab.getByRole('button', { name: /Save as my journey/i }).click();
  await expect(page.getByRole('status')).toContainText('saved in another tab');
  await expect(page.getByRole('link', { name: /Build my path/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(posts).toEqual([]);
  await otherTab.close();
});

test('320px empty tab protects a newly saved goal before any storage event', async ({ page }) => {
  const key = 'luqi:capability-journey:v1';
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  expect(raw).not.toBeNull();
  await page.evaluate(key => localStorage.removeItem(key), key);
  await page.reload();
  await expect(page.getByRole('link', { name: /Build my path/i })).toBeVisible();
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: raw! });
  await page.getByRole('link', { name: /Build my path/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#\/journey$/);
  await expect(page.getByRole('status')).toContainText('saved in another tab');
  await expect(page.getByRole('link', { name: /Build my path/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('320px stale goal does not navigate to the previous mission before keyboard recovery', async ({ page, context }) => {
  const otherTab = await context.newPage();
  const origin = new URL(page.url()).origin;
  await otherTab.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await otherTab.goto('/#/possibility');
  await otherTab.getByLabel('What do you want to make possible?').fill('I want to start a township business');
  await otherTab.getByRole('button', { name: 'Build my LUQI path' }).click();
  await otherTab.getByRole('button', { name: /Save as my journey/i }).click();

  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByRole('link', { name: /Continue mission/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open capability|Review capability/i })).toHaveCount(0);
  await expect(page.getByText('Load the latest saved journey before continuing this mission.')).toBeVisible();

  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'I want to start a township business' })).toBeFocused();
  await expect(page.getByRole('link', { name: /Continue mission/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open capability|Review capability/i })).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await otherTab.close();
});

test('320px keyboard guards mission and stage navigation without a storage event', async ({ page }) => {
  const key = 'luqi:capability-journey:v1';
  // Same-document writes do not emit a storage event here.
  await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({
      ...saved, goal: 'I want to start a township business', completed: [], updatedAt: saved.updatedAt + 1,
    }));
  }, key);
  await page.getByRole('link', { name: /Continue mission/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#\/journey$/);
  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByRole('link', { name: /Continue mission/i })).toHaveCount(0);

  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'I want to start a township business' })).toBeFocused();

  await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...saved, completed: [2], updatedAt: saved.updatedAt + 1 }));
  }, key);
  await page.getByRole('link', { name: /Open capability|Review capability/i }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#\/journey$/);
  await expect(page.getByRole('status')).toContainText('changed in another tab');
  await expect(page.getByRole('link', { name: /Open capability|Review capability/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('320px transient storage denial disables edits until keyboard recovery', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'luqi:capability-journey:v1') throw new DOMException('Synthetic temporary denial', 'SecurityError');
      return original.call(this, key);
    };
    window.dispatchEvent(new StorageEvent('storage', { key: 'luqi:capability-journey:v1' }));
    Storage.prototype.getItem = original;
  });
  await expect(page.getByRole('status')).toContainText('Browser storage is unavailable');
  await expect(page.getByRole('button', { name: /Mark complete:/i }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: /Clear saved journey/i })).toBeDisabled();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('luqi:capability-journey:v1')!));
  expect(stored.completed).toEqual([]);

  await page.getByRole('button', { name: 'Load latest saved journey' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Mark complete:/i }).first()).toBeEnabled();
  await page.getByRole('button', { name: /Mark complete:/i }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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

test('silent storage no-op at 320px never claims completed or cleared progress', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = function () { /* Synthetic storage wrapper dropping writes */ };
  });
  await page.getByRole('button', { name: /Mark complete:/i }).first().click();
  await expect(page.getByRole('status')).toContainText('could not be confirmed as saved');
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.removeItem = function () { /* Synthetic storage wrapper dropping removal */ };
  });
  await page.getByRole('button', { name: /Clear saved journey/i }).click();
  await expect(page.getByRole('status')).toContainText('did not allow the saved journey to be cleared');
  await expect(page.getByRole('heading', { name: 'I want to become a network engineer' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});


test('edited goal cannot forward an outdated preview at 320px using keyboard', async ({ page }) => {
  // The beforeEach fixture already saved a separate, device-local goal.
  const originalGoal = 'I want to become a network engineer';
  const newGoal = 'I want to start a township business';
  await page.goto('/#/possibility');
  await page.getByRole('button', { name: originalGoal }).click();
  await page.getByLabel('What do you want to make possible?').fill(newGoal);
  await expect(page.getByRole('link', { name: /Open this capability/i })).toHaveCount(0);
  await expect(page.getByText('Preview needs update')).toBeVisible();
  await expect(page.getByText(/This path is for your previous goal/i)).toBeVisible();

  const continueLink = page.getByRole('link', { name: /Free local guide · no journey save or AI request/i });
  await continueLink.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/#\/possibility$/);
  await expect(page.getByRole('status')).toContainText('Build the updated path before continuing');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('luqi:capability-journey:v1') || 'null')?.goal)).toBe(originalGoal);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // Only a deliberately rebuilt path may be passed to Ask Luqi; this is
  // navigation-state verification, not a claim that an AI reply was generated.
  await page.getByRole('button', { name: 'Build my LUQI path' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Your goal has changed. Build the updated path before continuing.')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open this capability/i })).toHaveCount(4);
  await expect(page.getByText('Path ready')).toBeVisible();
  await continueLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#\/ask$/);
  const forwardedGoal = await page.evaluate(() =>
    (history.state as { usr?: { luqiHomeNeed?: string } } | null)?.usr?.luqiHomeNeed,
  );
  expect(forwardedGoal).toBe(newGoal);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('luqi:capability-journey:v1') || 'null')?.goal)).toBe(originalGoal);
});
