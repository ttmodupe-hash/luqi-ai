import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Entirely synthetic transport. The suite runs only against localhost Vite preview
// built with the opt-in UI flag. No real accounts, AI or production MySQL.
const user = { email: 'test-user@example.invalid', token: 'synthetic-pilot-only' };
const phrase = 'Completely independent quoted work passphrase 2026';
const configured = {
  availability: 'configured', storage: 'connected',
  encryptedPayloadOnly: true, ownerLimit: 20, subscriptionActive: false,
} as const;

test('a 320px consenting user encrypts, saves, exports, reopens and confirms deletion without plaintext upload', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const origin = new URL(baseURL!).origin;
  const unexpected: string[] = [];
  let stored: { id: string; revision: number; sealed: unknown } | undefined;
  let observedPut = 0, observedRemove = 0;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      unexpected.push(route.request().method() + ' ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.route('**/api/v1/auth/login', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ token: user.token, user: { email: user.email } }),
  }));
  await page.route('**/api/v1/projects**', async route => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    const method = req.method();
    expect(req.headers().authorization).toBe('Bearer ' + user.token);
    const json = (body: unknown, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(body),
    });
    if (method === 'GET' && pathname === '/api/v1/projects/status') return json(configured);
    if (method === 'GET' && pathname === '/api/v1/projects') return json({
      projects: stored ? [{ id: stored.id, kind: 'quote', revision: stored.revision,
        updatedAt: '2026-10-25T12:00:00.000000Z' }] : [],
    });
    if (method === 'PUT' && pathname.startsWith('/api/v1/projects/')) {
      observedPut++;
      const id = pathname.slice('/api/v1/projects/'.length);
      const raw = req.postData() || '';
      const payload = JSON.parse(raw);
      expect(payload.kind).toBe('quote');
      expect(payload.expectedRevision).toBe(0);
      expect(payload.sealed.format).toBe('luqi.vault.sealed.v1');
      expect(payload.sealed.kdf).toBe('PBKDF2-SHA256-310000');
      for (const privateText of ['South African studio', 'Private customer', 'Web design', phrase]) {
        expect(raw).not.toContain(privateText);
      }
      stored = { id, revision: 1, sealed: payload.sealed };
      return json({ saved: true, created: true, id, revision: 1 }, 201);
    }
    if (method === 'GET' && stored && pathname === '/api/v1/projects/' + stored.id)
      return json({ project: { ...stored, kind: 'quote',
        updatedAt: '2026-10-25T12:00:00.000000Z' } });
    if (method === 'POST' && stored && pathname === '/api/v1/projects/' + stored.id + '/remove') {
      observedRemove++;
      expect(JSON.parse(req.postData() || '{}')).toEqual({ confirm: true, expectedRevision: 1 });
      const id = stored.id;
      stored = undefined;
      return json({ removed: true, id });
    }
    unexpected.push(method + ' ' + pathname);
    return route.abort();
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/business-desk');
  await expect(page.getByRole('heading', { name: 'Account-owned encrypted projects' })).toBeVisible();
  await page.getByLabel('Business name').fill('South African studio');
  await page.getByLabel('Customer name').fill('Private customer');
  await page.getByLabel('Quote reference').fill('Q-001');
  await page.getByLabel('Item 1 description').fill('Web design');
  await page.getByLabel('Item 1 unit price (ZAR)').fill('125.25');
  await page.getByRole('button', { name: 'Prepare quotation' }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Synthetic browser password only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved project metadata' })).toBeVisible();
  await page.getByLabel('Project passphrase (14–128 characters)').fill(phrase);
  await page.getByLabel('Repeat project passphrase').fill(phrase);
  await page.getByRole('button', { name: 'Save new encrypted project' }).click();
  await expect(page.getByText(/Confirmed encrypted project saved/)).toBeVisible();
  expect(observedPut).toBe(1);

  await page.getByRole('button', { name: 'Refresh saved projects' }).click();
  await expect(page.getByRole('button', { name: 'Open encrypted quotation' })).toBeVisible();
  await page.getByRole('button', { name: 'Open encrypted quotation' }).click();
  await expect(page.getByRole('button', { name: 'Unlock in this tab' })).toBeVisible();
  const [backup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download selected encrypted backup' }).click(),
  ]);
  expect(backup.suggestedFilename()).toBe('luqi-quote-encrypted.json');
  const exported = readFileSync((await backup.path())!, 'utf8');
  expect(JSON.parse(exported).format).toBe('luqi.business.encrypted-backup.v1');
  expect(exported).not.toContain('Private customer');
  expect(exported).not.toContain(phrase);

  await page.getByLabel('Business name').fill('Changed local draft');
  await page.getByLabel('Project unlock passphrase').fill('Incorrect independent passphrase');
  await page.getByRole('button', { name: 'Unlock in this tab' }).click();
  await expect(page.getByText(/Unable to decrypt the quotation/)).toBeVisible();
  await expect(page.getByLabel('Business name')).toHaveValue('Changed local draft');
  await page.getByLabel('Project unlock passphrase').fill(phrase);
  await page.getByRole('button', { name: 'Unlock in this tab' }).click();
  await expect(page.getByRole('button', { name: 'Confirm replace draft' })).toBeVisible();
  await expect(page.getByLabel('Business name')).toHaveValue('Changed local draft');
  await page.getByRole('button', { name: 'Confirm replace draft' }).click();
  await expect(page.getByLabel('Business name')).toHaveValue('South African studio');

  const remove = page.getByRole('button', { name: 'Confirm delete exact revision' });
  await expect(remove).toBeDisabled();
  await page.getByLabel(/I understand active vault deletion/).check();
  await remove.click();
  await expect(page.getByText(/Project removed from active storage/)).toBeVisible();
  expect(observedRemove).toBe(1);
  expect(stored).toBeUndefined();
  expect(unexpected).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('the server-disabled vault never lists, reads, uploads or deletes projects', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const seen: string[] = [];
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== origin || u.pathname.startsWith('/api/')) {
      seen.push(route.request().method() + ' ' + u.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.route('**/api/v1/auth/login', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ token: user.token, user: { email: user.email } }),
  }));
  await page.route('**/api/v1/projects/status', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ availability: 'disabled', syncing: false, subscriptionActive: false }),
  }));
  await page.goto('/#/business-desk');
  await expect(page.getByRole('heading', { name: 'Account-owned encrypted projects' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Synthetic browser password only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(/Account project sync is disabled/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save new encrypted project' })).toHaveCount(0);
  expect(seen).toEqual([]);
});
