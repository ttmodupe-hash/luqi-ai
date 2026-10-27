import { test, expect, type Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
async function isolate(page: Page, baseURL: string) {
  const writes: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (request.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    if (url.pathname === '/v1/readiness') return route.fulfill({ status: 200,
      contentType: 'application/json', body: JSON.stringify({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } }) });
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  return writes;
}
async function trialPage(page: Page, writes: string[]) {
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByRole('heading', { name: 'Luqi Chat' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep the conversation going' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to Luqi' })).toBeVisible();
  await expect(page.locator('#ai-question')).toHaveCount(0);
  expect(writes).toEqual([]);
}
test('getting started gives a direct trial path without signing in or spending automatically', async ({ page, baseURL }) => {
  const writes = await isolate(page, baseURL!);
  await page.goto('/#/start');
  await page.getByRole('link', { name: 'Try the AI text trial', exact: true }).click();
  await trialPage(page, writes);
});
test('workspace search can find the trial and retains truthful availability labels', async ({ page, baseURL }) => {
  const writes = await isolate(page, baseURL!);
  await page.goto('/#/start');
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search tools', exact: true }).fill('AI text');
  await expect(page.getByText(/signed-in trial with availability checks/)).toBeVisible();
  await page.getByRole('link', { name: 'AI text trial', exact: true }).click();
  await trialPage(page, writes);
});
test('home tool search exposes the trial under its provider name without a checkout', async ({ page, baseURL }) => {
  const writes = await isolate(page, baseURL!);
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Ready to use', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Filter workspace tools', exact: true }).fill('Gemini');
  const trialCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'AI text trial', exact: true }) });
  await expect(trialCard).toHaveCount(1);
  await expect(trialCard.getByRole('heading', { name: 'AI text trial', exact: true })).toBeVisible();
  await expect(trialCard.getByText('Limited trial · sign-in required', { exact: true })).toBeVisible();
  await trialCard.getByRole('link', { name: 'Open ai text trial', exact: true }).click();
  await trialPage(page, writes);
});
