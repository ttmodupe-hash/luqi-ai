import { test, expect } from '@playwright/test';
import { VISUAL_JPEG } from '../tests/fixtures/visual-image';
import { photoDimensions } from '../src/lib/visual-tutor';

test('photo stays local until a reviewed crop and language are explicitly sent; sign-out clears it', async ({ page, baseURL }, info) => {
  let calls = 0;
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen', 'true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname === '/v1/readiness') return route.fulfill({ json: { checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } } });
    if (url.pathname === '/api/v1/auth/login') return route.fulfill({ json: { token: 'visual-fixture-token', user: { email: 'visual@example.invalid', name: 'Naledi' } } });
    if (url.pathname === '/api/v1/visual-tutor') {
      calls++;
      const body = route.request().postDataJSON();
      expect(body.question).toBe('Explain the selected shape'); expect(body.language).toBe('Tswana');
      expect(body.consent).toBe(true); expect(body.image.mimeType).toBe('image/jpeg');
      expect(Object.keys(body).sort()).toEqual(['consent', 'image', 'language', 'question']);
      const dimensions = photoDimensions(Buffer.from(body.image.data, 'base64'));
      expect(dimensions.width).toBeLessThan(64); expect(dimensions.height).toBe(48);
      expect(route.request().headers().authorization).toBe('Bearer visual-fixture-token');
      return route.fulfill({ json: { status: 'success', response: 'Synthetic crop explanation', provider: 'gemini', provider_model: 'fixture-model' } });
    }
    if (/^\/(api|v1)\//.test(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto('/#/visual-tutor');
  await expect(page.getByRole('heading', { name: 'Visual tutor', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('visual@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(/Choose a JPEG or PNG photo/).setInputFiles({ name: 'local-fixture.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(VISUAL_JPEG, 'base64') });
  await expect(page.getByAltText('Your local photo for region selection')).toBeVisible();
  const width = page.getByRole('slider', { name: /^Width/ });
  await width.focus(); await width.press('Home'); await width.press('PageUp');
  await page.getByRole('button', { name: 'Preview selected region', exact: true }).click();
  await expect(page.getByAltText('Selected region that will be sent to Gemini')).toBeVisible();
  await page.getByLabel('Your question', { exact: true }).fill('Explain the selected shape');
  await page.getByLabel('Reply language', { exact: true }).selectOption('Tswana');
  expect(calls).toBe(0);
  await expect(page.getByRole('button', { name: 'Explain selected image' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I agree to send this selected image/ }).check();
  await page.getByRole('button', { name: 'Explain selected image' }).click();
  await expect(page.getByText('Synthetic crop explanation', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await expect(page.getByRole('checkbox', { name: /I agree to send this selected image/ })).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('visual-tutor.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Synthetic crop explanation')).toHaveCount(0);
  await expect(page.getByAltText('Your local photo for region selection')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your Luqi account' })).toBeVisible();
  expect(calls).toBe(1);
});
