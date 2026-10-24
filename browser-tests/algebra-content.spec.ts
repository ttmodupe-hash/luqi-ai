import { test, expect, type Page } from '@playwright/test';

async function coefficient(page: Page, id: string, value: number) {
  await page.locator('#' + id).evaluate((input, next) => {
    (input as HTMLInputElement).value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ context, page }) => {
  // Static lab only: no account, inference, payment, third-party or API traffic.
  const forbidden: string[] = [];
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  (page as Page & { forbiddenLabRequests: string[]; labRuntimeErrors: string[] }).forbiddenLabRequests = forbidden;
  (page as Page & { labRuntimeErrors: string[] }).labRuntimeErrors = runtimeErrors;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173' || route.request().method() !== 'GET' ||
        /\/(?:api|v1)\//.test(url.pathname)) {
      forbidden.push(url.origin + url.pathname);
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/labs/algebra_lab.html');
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ -1.732, 0, 1.732');
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { forbiddenLabRequests: string[] }).forbiddenLabRequests).toEqual([]);
  expect((page as Page & { labRuntimeErrors: string[] }).labRuntimeErrors).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('roots follow quadratic, repeated-root, linear and constant controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Quadratic', exact: true }).click();
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ -0.414, 2.414');
  await expect(page.locator('#dispArea')).toHaveText('1.33');
  await coefficient(page, 'sliderC', 1);
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ 1');
  await coefficient(page, 'sliderB', 0);
  await expect(page.locator('#dispRoots')).toHaveText('No real roots');
  await coefficient(page, 'sliderA', 0);
  await coefficient(page, 'sliderB', 2);
  await coefficient(page, 'sliderC', -6);
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ 3');
  await coefficient(page, 'sliderB', 0);
  await coefficient(page, 'sliderC', -2);
  await expect(page.locator('#dispRoots')).toHaveText('No real roots');
  await expect(page.locator('#dispArea')).toHaveText('-8.00');
  await coefficient(page, 'sliderC', 0);
  await expect(page.locator('#dispRoots')).toHaveText('All real x');
  await expect(page.locator('#dispStationary')).toContainText('Constant function');
});

test('stationary inflection is not called a turning point and reset restores all results', async ({ page }) => {
  await coefficient(page, 'sliderC', 0);
  await coefficient(page, 'sliderX0', 0);
  await expect(page.locator('#dispStationary')).toHaveText('Stationary inflection; not a turning point');
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ 0');
  await coefficient(page, 'sliderA', 0.1);
  await coefficient(page, 'sliderX0', 0.05);
  await expect(page.locator('#dispSlope')).toHaveText('0.00');
  await expect(page.locator('#dispStationary')).toHaveText('Non-stationary at the pivot');
  await page.getByRole('button', { name: /Reset Coordinates/ }).click();
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ -1.732, 0, 1.732');
  await expect(page.locator('#dispX0')).toHaveText('1.00');
  await expect(page.locator('#dispStationary')).toHaveText('Local minimum at the pivot');
});

test('sine roots use explicit fixed bounds and handle phase and zero frequency', async ({ page }) => {
  await page.getByRole('button', { name: 'Sinusoidal', exact: true }).click();
  await expect(page.locator('#rootsLabel')).toHaveText('Real zeros in [-4, 4]');
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ -3.142, 0, 3.142');
  await coefficient(page, 'sliderC', 1);
  await expect(page.locator('#dispRoots')).toHaveText('x ≈ -1, 2.142');
  await coefficient(page, 'sliderB', 0);
  await expect(page.locator('#dispRoots')).toHaveText('No real zeros in [-4, 4]');
  await expect(page.locator('#dispArea')).toHaveText('6.73');
  await coefficient(page, 'sliderA', 0);
  await expect(page.locator('#dispRoots')).toHaveText('All real x');
  await expect(page.locator('#dispArea')).toHaveText('0.00');
});

test('labels, keyboard operation and long results fit a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const pivot = page.getByRole('slider', { name: 'Tangent Pivot Point (x₀)', exact: true });
  await pivot.focus();
  await pivot.press('ArrowRight');
  await expect(page.locator('#dispX0')).toHaveText('1.05');
  await page.getByRole('button', { name: 'Sinusoidal', exact: true }).click();
  await expect(page.locator('#btnSine')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#btnCubic')).toHaveAttribute('aria-pressed', 'false');
  await coefficient(page, 'sliderB', 4);
  await coefficient(page, 'sliderC', 6);
  await expect(page.locator('#dispRoots')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expect(page.getByText('Signed integral [-2, 2]', { exact: true })).toBeVisible();
});
