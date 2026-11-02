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
test('recording is capability-gated or explicitly cancellable without a partial download', async ({ page, browserName }) => {
  await page.goto('/#/content-studio');
  const supported = await page.evaluate(() => typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' &&
    ['video/mp4;codecs=avc1.42001E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .some(type => MediaRecorder.isTypeSupported(type)));
  // Preserve actual native-recorder cancellation coverage on the existing engine.
  if (browserName === 'chromium') expect(supported).toBe(true);
  const record = page.getByRole('button', { name: 'Record 90-second animation', exact: true });
  if (!supported) {
    await expect(record).toBeDisabled();
    await expect(page.locator('#studio-recording-support')).toContainText('Video recording is unavailable in this browser');
    await expect(page.getByLabel('Scene title', { exact: true })).toBeEnabled();
    for (const name of ['Download storyboard', 'Download subtitles', 'Download script / podcast outline']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeEnabled();
    }
    await expect(page.getByRole('button', { name: 'Cancel recording', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Download 90-second video/ })).toHaveCount(0);
    return;
  }
  await expect(record).toBeEnabled(); await record.click();
  await expect(page.getByRole('button', { name: 'Cancel recording', exact: true })).toBeVisible();
  await expect(page.getByLabel('Scene title', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel recording', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Studio export status' })).toContainText('partial recording was discarded');
  await expect(page.getByRole('link', { name: /Download 90-second video/ })).toHaveCount(0);
  await expect(page.getByLabel('Scene title', { exact: true })).toBeEnabled();
});
test('missing recorder is disclosed before a click and does not prevent script download', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined }));
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.goto('/#/content-studio');
  await expect(page.getByRole('button', { name: 'Record 90-second animation', exact: true })).toBeDisabled();
  await expect(page.locator('#studio-recording-support')).toContainText('Video recording is unavailable in this browser');
  await page.getByLabel('Scene title', { exact: true }).fill('A preserved sample scene');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download script / podcast outline', exact: true }).click();
  const result = await download; expect(result.suggestedFilename()).toBe('luqi-episode-outline.txt');
  const stream = await result.createReadStream(); let text = '';
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).toContain('A preserved sample scene');
  expect(writes).toEqual([]);
  await expect(page.getByRole('link', { name: /Download 90-second video/ })).toHaveCount(0);
});
test('legacy animation aliases use the same real creation tool without credit-purchase controls at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/#/video-studio');
  await expect(page.getByRole('heading', { name: 'Create. Explain. Make it clear.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Buy|Purchase|Top.up|Activate|Publish now/ })).toHaveCount(0);
  await expect(page.getByText('Your storyboard', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('legacy multimodal aliases distinguish working tools from pending research without provider requests', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (/\/(api|v1)\//.test(request.url())) calls.push(request.url()); });
  for (const path of ['/multimodal-hub', '/bioscience', '/gemini-studio']) {
    await page.goto('/#' + path);
    await expect(page.getByRole('heading', { name: 'Advanced learning & media', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the content studio', exact: true })).toHaveAttribute('href', '#/content-studio');
    await expect(page.getByText('PRO ACTIVE', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(calls).toEqual([]);
});
