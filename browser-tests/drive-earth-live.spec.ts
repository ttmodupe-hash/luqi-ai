import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('public release identity and real key-free NASA providers', async ({ page, request }, testInfo) => {
  test.skip(process.env.LUQI_DRIVE_LIVE !== '1', 'Read-only production verification is separately triggered after deployment.');
  test.setTimeout(60000);
  const expected = process.env.LUQI_EXPECTED_SHA || '';
  expect(expected).toMatch(/^[a-f0-9]{40}$/);
  async function release() {
    const response = await request.get('/v1/release', { timeout: 15000 });
    expect(response.ok()).toBe(true);
    const identity = await response.json();
    expect(identity).toEqual({ format: 'luqi.release.v1', commit: expected });
    return identity;
  }
  const before = await release();
  const providers: { host: string; status: number; contentType: string }[] = [];
  page.on('response', response => {
    const host = new URL(response.url()).host;
    if (host === 'gibs.earthdata.nasa.gov' || host === 'eonet.gsfc.nasa.gov') providers.push({ host, status: response.status(), contentType: response.headers()['content-type'] || '' });
  });
  await page.goto('/#/drive?trail=heritage');
  const panel = page.getByRole('region', { name: 'Know the signal. See the region.' });
  await expect(panel).toBeVisible();
  expect(providers).toHaveLength(0);
  await panel.getByRole('button', { name: 'Load NASA satellite context' }).click();
  await expect(panel.getByText(/Feed retrieved:/)).toBeVisible({ timeout: 20000 });
  await expect(panel.getByRole('img')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => panel.getByRole('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const after = await release();
  await panel.screenshot({ path: testInfo.outputPath('drive-earth-public.png') });
  const evidence = JSON.stringify({ checkedAt: new Date().toISOString(), browser: testInfo.project.name, before, after, providers, physicalDevice: false, captureTimePerPixelVerified: false }, null, 2);
  await writeFile(testInfo.outputPath('public-release-and-providers.json'), evidence, 'utf8');
  await testInfo.attach('public-release-and-providers', { body: evidence, contentType: 'application/json' });
});
