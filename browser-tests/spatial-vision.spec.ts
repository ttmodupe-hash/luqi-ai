import { test, expect } from '@playwright/test';
import { VISUAL_JPEG } from '../tests/fixtures/visual-image';

test('spatial lab keeps images local until consent, supports relief and rejects serial cloud uploads', async ({ page, baseURL }, info) => {
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
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ mode: 'EXAM_3D', provider: 'gemini', consent: true,
        language: 'English', image: { mimeType: 'image/jpeg' } });
      expect(Object.keys(body).sort()).toEqual(['consent', 'image', 'language', 'mode', 'provider']);
      expect(body.image.data).not.toContain('data:image');
      expect(route.request().headers().authorization).toBe('Bearer spatial-fixture-token');
      return route.fulfill({ json: { status: 'success', provider: 'gemini', provider_model: 'synthetic-model',
        analysis: { sceneType: 'Synthetic science diagram', summary: 'A line and labels.',
          regions: [{ label: 'Line', category: 'EXAM_CONCEPT', box_2d: [100, 150, 400, 550],
            insight: 'Inspect the visible line.' }],
          limitations: ['Text is small'], nextStep: 'Check the original diagram.' } } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/spatial-vision');
  await expect(page.getByRole('heading', { name: /Spatial Vision & 3D Lab/ })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('spatial@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(/Choose a local JPEG or PNG/).setInputFiles({
    name: 'synthetic-diagram.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(VISUAL_JPEG, 'base64'),
  });
  await expect(page.getByAltText('Locally re-encoded image for spatial review')).toBeVisible();
  expect(providerCalls).toBe(0);
  await page.getByRole('button', { name: /2.5D brightness relief/ }).click();
  await expect(page.getByRole('img', { name: 'Illustrative rotatable brightness relief' })).toBeVisible();
  await page.getByRole('slider', { name: /Tilt X/ }).focus();
  await page.getByRole('slider', { name: /Tilt X/ }).press('ArrowRight');
  expect(providerCalls).toBe(0);
  await page.getByRole('button', { name: '2D image' }).click();
  await expect(page.getByRole('button', { name: 'Analyse selected image' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I agree to send this reviewed image/ }).check();
  await page.getByRole('button', { name: 'Analyse selected image' }).click();
  await expect(page.getByText('Synthetic science diagram')).toBeVisible();
  await expect(page.getByLabel('AI-suggested: Line')).toBeVisible();
  expect(providerCalls).toBe(1);
  await page.getByRole('button', { name: /Serial audit/ }).click();
  await expect(page.getByText(/makes no AI provider request/)).toBeVisible();
  await page.getByLabel('Optional serial text (typed by you)').fill('123456789012345');
  await expect(page.getByRole('alert')).toContainText('resembles an IMEI');
  expect(providerCalls).toBe(1);
  await page.screenshot({ path: info.outputPath('spatial-lab.png'), fullPage: true });
  await page.getByRole('button', { name: 'Clear image' }).click();
  await expect(page.getByAltText('Locally re-encoded image for spatial review')).toHaveCount(0);
  expect(providerCalls).toBe(1);
});
