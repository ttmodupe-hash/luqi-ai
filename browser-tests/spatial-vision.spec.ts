import { test, expect } from '@playwright/test';

test('Spatial Vision lab is a local-first, responsive route with honest capability labels', async ({ page }) => {
  const providerPosts: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/v1\/(?:visual-tutor|luqi-core)/.test(request.url()))
      providerPosts.push(request.url());
  });
  await page.goto('/#/spatial-vision');
  await expect(page.getByRole('heading', { name: /Spatial Vision & 3D Lab/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exam & STEM' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Contract review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hardware serial' })).toBeVisible();
  await expect(page.getByText(/No automatic semantic segmentation/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Show 2.5D point cloud/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Contract review' }).click();
  await expect(page.getByRole('heading', { name: 'Deterministic loan illustration' })).toBeVisible();
  await expect(page.getByText(/does not determine legal compliance/)).toBeVisible();
  expect(providerPosts).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /Spatial Vision & 3D Lab/ })).toBeVisible();
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 2);
  expect(providerPosts).toEqual([]);
});
