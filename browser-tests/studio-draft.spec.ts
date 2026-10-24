import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Only the CI loopback preview. No production accounts, paid AI or uploaded files.
test.beforeEach(async ({ baseURL }) => {
  const target = new URL(baseURL ?? 'http://127.0.0.1:4173');
  expect(['127.0.0.1', 'localhost', '[::1]']).toContain(target.hostname);
});

test('download, reopen, confirm and resume the exact creator draft', async ({ page }) => {
  const sensitiveCalls: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' || new URL(request.url()).pathname.startsWith('/api/')) sensitiveCalls.push(request.method());
  });
  await page.goto('/#/content-studio');
  await page.getByLabel('Scene title', { exact: true }).fill('Resume this ordinary fixture');
  await page.getByLabel('Scene caption', { exact: true }).fill('Dumelang 🌍\nA complete local draft.');
  await page.getByLabel('Video format', { exact: true }).selectOption('portrait');
  await page.getByLabel('Gravity', { exact: true }).selectOption('3.71');
  await page.getByLabel('Camera angle', { exact: true }).focus();
  await page.getByLabel('Camera angle', { exact: true }).press('End');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download storyboard', exact: true }).click();
  const file = await downloaded; const path = await file.path(); expect(path).not.toBeNull();
  const bytes = await readFile(path!); const source = JSON.parse(bytes.toString('utf8'));
  expect(source.format).toBe('luqi.storyboard.v2'); expect(source.cameraYawDegrees).toBe(80);
  await page.reload();
  await expect(page.getByLabel('Scene title', { exact: true })).not.toHaveValue('Resume this ordinary fixture');
  await page.getByLabel('Open storyboard', { exact: true }).setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByRole('region', { name: 'Review storyboard replacement' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep current storyboard' })).toBeFocused();
  await expect(page.getByLabel('Scene title', { exact: true })).not.toHaveValue('Resume this ordinary fixture');
  await page.getByRole('button', { name: 'Replace current storyboard' }).click();
  await expect(page.getByLabel('Scene title', { exact: true })).toHaveValue('Resume this ordinary fixture');
  await expect(page.getByLabel('Scene caption', { exact: true })).toHaveValue('Dumelang 🌍\nA complete local draft.');
  await expect(page.getByLabel('Camera angle', { exact: true })).toHaveValue('80');
  await expect(page.getByLabel('Video format', { exact: true })).toHaveValue('portrait');
  await expect(page.getByLabel('Gravity', { exact: true })).toHaveValue('3.71');
  await expect(page.getByLabel('Open storyboard', { exact: true })).toBeFocused();
  expect(sensitiveCalls).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('storyboard-restored.png'), fullPage: true });
});

test('an invalid local file leaves the current creator draft intact', async ({ page }) => {
  await page.goto('/#/content-studio');
  await page.getByLabel('Scene title', { exact: true }).fill('Do not replace this');
  await page.getByLabel('Open storyboard', { exact: true }).setInputFiles({ name: 'unsupported.json',
    mimeType: 'application/json', buffer: Buffer.from('{"format":"other","url":"https://untrusted.invalid"}') });
  await expect(page.getByRole('status', { name: 'Storyboard import status' })).toContainText('current draft and completed clip are unchanged');
  await expect(page.getByLabel('Scene title', { exact: true })).toHaveValue('Do not replace this');
  await expect(page.getByRole('button', { name: 'Replace current storyboard' })).toHaveCount(0);
});
