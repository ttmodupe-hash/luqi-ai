import { test, expect } from '@playwright/test';

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');

test('satellite context is opt-in, clearable, bounded and mobile-friendly', async ({ page }, testInfo) => {
  let requests = 0;
  await page.route('https://eonet.gsfc.nasa.gov/**', async route => {
    requests += 1;
    expect(route.request().url()).not.toContain('31.123456');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ events: [] }) });
  });
  await page.route('https://gibs.earthdata.nasa.gov/**', async route => {
    requests += 1;
    const url = new URL(route.request().url());
    expect(url.searchParams.get('WIDTH')).toBe('640');
    expect(url.searchParams.get('LAYERS')).toBe('MODIS_Terra_CorrectedReflectance_TrueColor');
    await route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: pixel });
  });
  await page.goto('/#/drive?trail=heritage');
  const panel = page.getByRole('region', { name: 'Know the signal. See the region.' });
  await expect(panel).toBeVisible();
  expect(requests).toBe(0);
  await expect(panel.getByRole('img')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Load NASA satellite context' }).click();
  await expect(panel.getByText(/No recent matching records returned/)).toBeVisible();
  await expect(panel.getByRole('img')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Load NASA satellite context' })).toBeEnabled();
  expect(requests).toBe(2);
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await panel.screenshot({ path: testInfo.outputPath('drive-earth-synthetic.png') });
  await panel.getByRole('button', { name: 'Clear satellite context' }).click();
  await expect(panel.getByRole('img')).toHaveCount(0);
  await expect(panel.getByText(/Not loaded. Your trip planning/)).toBeVisible();
});

test('provider failures are unknown, not an all-clear', async ({ page }) => {
  await page.route('https://eonet.gsfc.nasa.gov/**', route => route.abort());
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.abort());
  await page.goto('/#/drive?trail=heritage');
  const panel = page.getByRole('region', { name: 'Know the signal. See the region.' });
  await panel.getByRole('button', { name: 'Load NASA satellite context' }).click();
  await expect(panel.getByText(/Event feed unavailable. Conditions are unknown/)).toBeVisible();
  await expect(panel.getByText(/Imagery unavailable. Try another date/)).toBeVisible();
  await panel.getByText('Satellite sources, precision and costs').click();
  await expect(panel.getByText(/TrigNet\/RTK is not connected/)).toBeVisible();
});
