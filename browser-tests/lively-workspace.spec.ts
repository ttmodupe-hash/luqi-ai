import { test, expect } from '@playwright/test';

test('discovery, native modal focus and calm mode work across Luqi on a narrow phone', async ({ page }, testInfo) => {
  const paid: string[] = []; page.on('request', request => { if (request.method() === 'POST') paid.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 840 });
  await page.goto('/#/');
  const discovery = page.getByRole('region', { name: 'Discover Luqi' });
  await discovery.getByRole('button', { name: 'Learn & play' }).click();
  await expect(discovery.getByRole('link', { name: /Physics lab/ })).toHaveAttribute('href', '#/pendulum-lab');
  await page.getByRole('button', { name: 'Explore something' }).click();
  const modal = page.getByRole('dialog', { name: 'Explore Luqi', exact: true });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Mix it up' }).click();
  await expect(modal.getByRole('button', { name: 'Learn & play' })).toHaveAttribute('aria-pressed', 'true');
  await modal.getByRole('button', { name: 'Close discovery' }).press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore something' })).toBeFocused();
  await page.getByRole('button', { name: 'Calm mode', exact: true }).click();
  await expect(page.locator('.luqi-shell')).toHaveAttribute('data-motion', 'calm');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Calm mode on' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await discovery.screenshot({ path: testInfo.outputPath('lively-workspace-320.png'), animations: 'disabled', style: '.luqi-header,.luqi-skip,.luqi-collaboration-dock{visibility:hidden!important}' });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await discovery.screenshot({ path: testInfo.outputPath('lively-workspace-desktop.png'), animations: 'disabled', style: '.luqi-header,.luqi-skip,.luqi-collaboration-dock{visibility:hidden!important}' });
  await discovery.getByRole('button', { name: 'Find support' }).click();
  await discovery.getByRole('link', { name: /SASSA & UIF Support/ }).click();
  await expect(page).toHaveURL(/#\/social-support$/);
  await expect(page.getByRole('button', { name: 'Explore something' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Calm mode on' })).toBeVisible();
  expect(paid).toEqual([]);
});

test('source signals are deliberate, dated and never turn a failed check into live vacancies', async ({ page }) => {
  let checks = 0;
  await page.route('**/api/v1/opportunity-watch', route => {
    checks++;
    if (checks > 1) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    const at = new Date().toISOString();
    return route.fulfill({ json: { status: 'sources_checked', scope: 'publisher-pages-only', checkedAt: at,
      sources: ['gov-jobs','nyda','nrf'].map(id => ({ id, checkedAt: at, status: 'reachable' })) } });
  });
  await page.goto('/#/opportunities');
  const signals = page.getByRole('region', { name: 'Publisher signals' });
  expect(checks).toBe(0);
  await signals.getByRole('button', { name: 'Refresh source signals' }).click();
  await expect(signals.getByText('Page responded', { exact: true })).toHaveCount(3);
  await expect(signals.getByText(/Last publisher check/)).toContainText('SAST');
  await signals.getByRole('button', { name: 'Refresh source signals' }).click();
  await expect(signals.getByText(/could not be confirmed/)).toBeVisible();
  await expect(signals.getByText('Page responded', { exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const ring = page.locator('.luqi-province-beacon-ring').first();
  expect(await ring.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(checks).toBe(2);
});
