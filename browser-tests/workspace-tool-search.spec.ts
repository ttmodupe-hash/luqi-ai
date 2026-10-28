import { test, expect, type Page } from '@playwright/test';

// Search acceptance is local-only and never signs into a real account.
async function prepare(page: Page, baseURL: string | undefined) {
  if (!baseURL || !/^http:\/\/(127\.0\.0\.1|localhost):4173\/?$/.test(baseURL)) {
    throw new Error('Tool-search acceptance requires the local preview server.');
  }
  const forbidden: string[] = [];
  const origin = new URL(baseURL).origin;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      forbidden.push(url.origin + url.pathname);
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/#/');
  return forbidden;
}

async function expectLocalOnly(page: Page, forbidden: string[]) {
  expect(forbidden).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })))
    .toEqual({ local: 0, session: 0 });
}

test('mobile search announces visible available-tool counts without network access', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const forbidden = await prepare(page, baseURL);
  const status = page.locator('.luqi-tool-count');
  const search = page.getByLabel('Filter workspace tools', { exact: true });
  await expect(status).toContainText('10 matching tools');
  await expect(search).toHaveAttribute('type', 'search');
  await expect(search).toHaveAttribute('enterkeyhint', 'search');
  await search.fill('STUDIO content');
  await expect(status).toContainText('1 matching tool');
  await expect(status).toContainText('1 available to open');
  await search.fill('languages african');
  await expect(status).toContainText('1 matching tool');
  await expect(status).toContainText('0 available to open');
  await page.getByRole('button', { name: 'Ready to use', exact: true }).click();
  await expect(status).toContainText('No matching tools');
  await page.getByRole('button', { name: 'Show all tools', exact: true }).click();
  await expect(status).toContainText('10 matching tools');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expectLocalOnly(page, forbidden);
});

test('homepage finds reversed words and words across fields without API requests', async ({ page, baseURL }) => {
  const forbidden = await prepare(page, baseURL);
  const search = page.getByLabel('Filter workspace tools', { exact: true });
  for (const query of ['STUDIO content', '  subtitles   content  ', 'studio studio content']) {
    await search.fill(query);
    await expect(page.locator('.luqi-tool-card')).toHaveCount(1);
    await expect(page.locator('.luqi-tool-card').getByRole('heading', { name: 'Content studio', exact: true })).toBeVisible();
    await expect(page.locator('.luqi-tool-card').getByRole('link')).toHaveAttribute('href', '#/content-studio');
  }
  await expectLocalOnly(page, forbidden);
});

test('availability filters never turn an in-development match into an available tool', async ({ page, baseURL }) => {
  const forbidden = await prepare(page, baseURL);
  await page.getByLabel('Filter workspace tools', { exact: true }).fill('languages african');
  await page.getByRole('button', { name: 'Ready to use', exact: true }).click();
  await expect(page.locator('.luqi-tool-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No tools match your search.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'In development', exact: true }).click();
  const card = page.locator('.luqi-tool-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { name: 'African languages', exact: true })).toBeVisible();
  await expect(card.getByText('Not available yet', { exact: true })).toBeVisible();
  await expect(card.getByRole('link')).toHaveCount(0);
  await expectLocalOnly(page, forbidden);
});

test('workspace dialog matches multiple words and retains trial and preview warnings', async ({ page, baseURL }) => {
  const forbidden = await prepare(page, baseURL);
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const search = dialog.getByLabel('Search tools', { exact: true });
  await search.fill('consent GEMINI');
  await expect(dialog.locator('.luqi-search-result')).toHaveCount(1);
  await expect(dialog.getByRole('link', { name: 'AI text trial', exact: true })).toBeVisible();
  await expect(dialog.getByText('Limited trial · sign-in required', { exact: true })).toBeVisible();
  await search.fill('languages AFRICAN');
  await expect(dialog.locator('.luqi-search-result')).toHaveCount(1);
  await expect(dialog.getByRole('heading', { name: 'African languages', exact: true })).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await search.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Search workspace', exact: true })).toBeFocused();
  await expectLocalOnly(page, forbidden);
});

test('320px search handles literal input and recovers with the keyboard without overflow', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const forbidden = await prepare(page, baseURL);
  const search = page.getByLabel('Filter workspace tools', { exact: true });
  await search.fill('<script>.*</script>');
  await expect(page.locator('.luqi-tool-card')).toHaveCount(0);
  const reset = page.getByRole('button', { name: 'Show all tools', exact: true });
  await reset.focus(); await page.keyboard.press('Enter');
  await expect(search).toHaveValue('');
  await expect(page.locator('.luqi-tool-card')).toHaveCount(10);
  await search.fill('  STUDIO   content  ');
  await expect(page.locator('.luqi-tool-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expectLocalOnly(page, forbidden);
});

test('Omega local calculators are discoverable at 320px without account or network calls', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const forbidden = await prepare(page, baseURL);
  await page.getByRole('button', { name: 'Ready to use', exact: true }).click();
  await page.getByLabel('Filter workspace tools', { exact: true }).fill('Luqi travel budget');
  const card = page.locator('.luqi-tool-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Local · no account', { exact: true })).toBeVisible();
  await card.getByRole('link', { name: 'Open Luqi practical tools' }).click();
  await expect(page.getByRole('heading', { name: 'Tasks, with a clear record.' })).toBeVisible();
  await page.getByLabel('Local amounts (one per line)').fill('100.25\\n40\\n0.10'.replaceAll('\\n', '\n'));
  await page.getByRole('button', { name: 'Calculate in browser' }).click();
  await expect(page.getByRole('status', { name: 'Local calculation result' })).toContainText('ZAR 140.35');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expectLocalOnly(page, forbidden);
});
