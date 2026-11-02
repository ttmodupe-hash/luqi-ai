import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
const readiness = { status: 'configured_not_verified', checks: {
  runtime: 'up', persistence: 'connected', ai_pilot: 'configured_not_verified',
} };
for (const path of ['/telemetry', '/super-core']) {
  test(path + ': actual readiness only, no polling or autonomous execution at 320px', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 820 });
    await page.clock.install();
    const unexpected: string[] = [], errors: string[] = [];
    let reads = 0, broken = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== new URL(baseURL!).origin || request.method() !== 'GET') {
        unexpected.push(request.method() + ' ' + url.pathname); return route.abort();
      }
      if (url.pathname === '/v1/readiness') {
        reads++;
        expect(request.headers().authorization).toBeUndefined();
        return broken ? route.fulfill({ status: 503, json: { secret: 'PRIVATE-DIAGNOSTIC' } })
          : route.fulfill({ json: readiness });
      }
      if (/^\/(api|v1)\//.test(url.pathname)) {
        unexpected.push(url.pathname); return route.abort();
      }
      return route.continue();
    });
    await page.goto('/#' + path);
    await expect(page.getByRole('heading', { name: 'Telemetry and diagnostics', exact: true })).toBeVisible();
    const status = page.getByRole('region', { name: 'Service readiness' });
    await expect(status.getByText('connected', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Autonomous execution is unavailable' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run Autonomous|Execute|Refinement/ })).toHaveCount(0);
    await expect(page.getByText('100%', { exact: true })).toHaveCount(0);
    await expect(page.getByText('42', { exact: true })).toHaveCount(0);
    for (const [label, target] of [['Open AI text trial', '#/ai-trial'], ['Open private notes', '#/companion'], ['Get started', '#/start']]) {
      await expect(page.getByRole('navigation', { name: 'Available pilot tools' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('href', target);
    }
    await page.clock.fastForward(30_000); expect(reads).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('telemetry-truth.png'), fullPage: true });
    broken = true;
    await page.getByRole('button', { name: 'Refresh status', exact: true }).click();
    await expect(status.getByRole('alert')).toContainText('Status unavailable');
    await expect(status.getByText('connected', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/PRIVATE-DIAGNOSTIC/)).toHaveCount(0);
    await page.clock.fastForward(30_000); expect(reads).toBe(2);
    expect(unexpected).toEqual([]); expect(errors).toEqual([]);
  });
}
