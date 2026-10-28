import { test, expect } from '@playwright/test';
import { VISUAL_JPEG } from '../tests/fixtures/visual-image';
import { photoDimensions } from '../src/lib/visual-tutor';

test('Spatial Vision keeps photos local until crop, consent and explicit provider send', async ({ page, baseURL }) => {
  let providerCalls = 0;
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({
      json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } },
    });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({
      json: { token: 'spatial-fixture-token', user: { email: 'spatial@example.invalid', name: 'Naledi' } },
    });
    if (url.pathname === '/api/v1/spatial-vision') {
      providerCalls++;
      const body = route.request().postDataJSON();
      expect(body.consent).toBe(true);
      expect(body.mode).toBe('EXAM_3D');
      expect(body.provider).toBe('gemini');
      expect(body.image.mimeType).toBe('image/jpeg');
      expect(body.image.data).not.toMatch(/^data:/);
      expect(route.request().headers().authorization).toBe('Bearer spatial-fixture-token');
      const dimensions = photoDimensions(Buffer.from(body.image.data, 'base64'));
      expect(dimensions.width).toBeLessThan(64);
      expect(dimensions.height).toBeLessThan(48);
      return route.fulfill({ json: {
        status: 'success', provider: 'gemini', provider_model: 'fixture-model',
        analysis: { summary: 'A printed equation is visible.',
          guidance: 'Check each step with the original question.',
          limitations: 'This is an approximate visual estimate.',
          entities: [{ label: 'Equation', category: 'EXAM_CONCEPT',
            box_2d: [100, 150, 600, 750], insight: 'Model-estimated region.' }] },
      } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/spatial-vision');
  await expect(page.getByRole('heading', { name: 'Spatial Vision & 2.5D Lab' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('spatial@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(/Choose a JPEG or PNG/).setInputFiles({
    name: 'local-fixture.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(VISUAL_JPEG, 'base64'),
  });
  await expect(page.getByAltText('Local image for crop selection')).toBeVisible();
  expect(providerCalls).toBe(0);
  const width = page.getByRole('slider', { name: /^Width/ });
  await width.focus(); await width.press('Home'); await width.press('PageUp');
  await page.getByRole('button', { name: 'Prepare selected crop' }).click();
  await expect(page.getByAltText('Selected local JPEG preview for optional provider analysis')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyse selected crop' })).toBeDisabled();
  await page.getByRole('button', { name: 'Explore 2.5D brightness relief' }).click();
  await expect(page.getByRole('img', { name: /Illustrative brightness-based rotatable point cloud/ })).toBeVisible();
  expect(providerCalls).toBe(0);
  await page.getByRole('checkbox', { name: /I agree to send this selected crop/ }).check();
  await page.getByRole('button', { name: 'Analyse selected crop' }).click();
  await expect(page.getByText('A printed equation is visible.')).toBeVisible();
  expect(providerCalls).toBe(1);
  await expect(page.getByRole('checkbox', { name: /I agree to send this selected crop/ })).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('A printed equation is visible.')).toHaveCount(0);
  await expect(page.getByAltText('Local image for crop selection')).toHaveCount(0);
});
