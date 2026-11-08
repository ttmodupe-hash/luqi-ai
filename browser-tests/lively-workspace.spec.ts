import { test, expect } from '@playwright/test';

// The previous test combined unrelated mobile, modal and desktop journeys
// under one 30s deadline. The unchanged 30s per-case budget now applies to
// each genuine journey; no assertions, link interactions or test retries removed.
test('320px discovery opens a native keyboard-dismissible modal and restores focus', async ({ page }) => {
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
  expect(paid).toEqual([]);
});

test('320px calm mode persists through reload with no overflow or provider calls', async ({ page }, testInfo) => {
  const paid: string[] = []; page.on('request', request => { if (request.method() === 'POST') paid.push(request.url()); });
  await page.setViewportSize({ width: 320, height: 840 });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Calm mode', exact: true }).click();
  await expect(page.locator('.luqi-shell')).toHaveAttribute('data-motion', 'calm');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Calm mode on' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('region', { name: 'Discover Luqi' }).screenshot({
    path: testInfo.outputPath('lively-workspace-320.png'), animations: 'disabled',
    style: '.luqi-header,.luqi-skip,.luqi-collaboration-dock{visibility:hidden!important}',
  });
  expect(paid).toEqual([]);
});

test('1440px discovery opens SASSA support and maintains working experience controls', async ({ page }, testInfo) => {
  const paid: string[] = []; page.on('request', request => { if (request.method() === 'POST') paid.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/#/');
  const discovery = page.getByRole('region', { name: 'Discover Luqi' });
  await discovery.screenshot({
    path: testInfo.outputPath('lively-workspace-desktop.png'), animations: 'disabled',
    style: '.luqi-header,.luqi-skip,.luqi-collaboration-dock{visibility:hidden!important}',
  });
  await discovery.getByRole('button', { name: 'Find support' }).click();
  await discovery.getByRole('link', { name: /SASSA & UIF Support/ }).click();
  await expect(page).toHaveURL(/#\/social-support$/);
  await expect(page.getByRole('button', { name: 'Explore something' })).toBeVisible();
  await page.getByRole('button', { name: 'Calm mode', exact: true }).click();
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
  // Expired government notices deliberately produce zero province beacons.
  // Source reachability must never revive an expired vacancy just to satisfy this test.
  await expect(page.getByRole('region', { name: 'Choose a South African province' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(checks).toBe(2);
});

test('expired vacancy collection has no live beacons but retains the official source', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T10:00:00+02:00') });
  await page.goto('/#/opportunities');
  const summary = page.getByRole('complementary', { name: 'Province opportunity summary' });
  await expect(summary.locator('.luqi-province-stat strong')).toHaveText('0');
  await expect(page.locator('.luqi-province-beacon-ring')).toHaveCount(0);
  await expect(summary.getByRole('link', { name: 'Explore official vacancy circulars' }))
    .toHaveAttribute('href', 'https://www.dpsa.gov.za/newsroom/psvc/');
});

test('province beacons respect reduced motion in a dated, explicitly historical snapshot', async ({ page }) => {
  // This pinned historical fixture exercises map animation without presenting
  // closed November notices as current opportunities on the real clock.
  await page.clock.install({ time: new Date('2026-11-05T10:00:00+02:00') });
  await page.goto('/#/opportunities');
  const summary = page.getByRole('complementary', { name: 'Province opportunity summary' });
  const reviewedCount = Number(await summary.locator('.luqi-province-stat strong').innerText());
  expect(reviewedCount).toBeGreaterThan(0);
  const ring = page.locator('.luqi-province-beacon-ring').first();
  await expect(ring).toBeAttached();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ring).toHaveCSS('animation-name', 'none');
});
