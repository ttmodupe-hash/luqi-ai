import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin || /^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
});
test('local studio edits, scrubs and exports a complete storyboard without a provider or social call', async ({ page }) => {
  const calls: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET' || /^https?:.*\/(api|v1)\//.test(request.url())) calls.push(request.url()); });
  await page.goto('/#/content-studio');
  await expect(page.getByRole('heading', { name: 'Create. Explain. Make it clear.' })).toBeVisible();
  await page.getByRole('button', { name: /02 See an idea/ }).click();
  await page.getByLabel('Scene title', { exact: true }).fill('An example from my community');
  await page.getByLabel('Scene caption', { exact: true }).fill('Compare a short swing and a long swing. Predict before you observe.');
  await page.getByLabel('Video format', { exact: true }).selectOption('portrait');
  await page.getByLabel('Gravity', { exact: true }).selectOption('1.62');
  await expect(page.getByLabel('Timeline position')).toHaveText('15 / 90 s');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download storyboard', exact: true }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toBe('luqi-storyboard.json');
  const stream = await artifact.createReadStream(); let text = '';
  for await (const chunk of stream!) text += chunk.toString();
  const story = JSON.parse(text);
  expect(story.scenes[1].title).toBe('An example from my community');
  expect(story.durationSeconds).toBe(90); expect(story.audio).toBe('none');
  expect(story.simulation.gravityMetresPerSecondSquared).toBe(1.62);
  expect(story.publishing).toBe('not_connected'); expect(calls).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('content-studio.png'), fullPage: true });
});
test('recording is explicit, locks editing and cancels without a completed or partial download', async ({ page }) => {
  await page.goto('/#/content-studio');
  await page.getByRole('button', { name: 'Record 90-second animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel recording', exact: true })).toBeVisible();
  await expect(page.getByLabel('Scene title', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel recording', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('partial recording was discarded');
  await expect(page.getByRole('link', { name: /Download 90-second video/ })).toHaveCount(0);
  await expect(page.getByLabel('Scene title', { exact: true })).toBeEnabled();
});
test('legacy animation aliases use the same real creation tool without credit-purchase controls at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/video-studio');
  await expect(page.getByRole('heading', { name: 'Create. Explain. Make it clear.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Buy|Purchase|Top.up|Activate|Publish now/ })).toHaveCount(0);
  await expect(page.getByText('Your storyboard', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
