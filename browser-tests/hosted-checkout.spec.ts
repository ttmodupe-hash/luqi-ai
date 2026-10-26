import { expect, test } from '@playwright/test';
import { hostedOfferFixture as offer, hostedOfferRevisionFixture as revision } from '../tests/fixtures/hosted-offer';

test('visitor sees truthful payment availability from Plans without any payment initiation', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.route('**/api/v1/commerce/offer', route => route.fulfill({ json: { status: 'unavailable' } }));
  await page.goto('/#/pricing');
  await page.getByRole('link', { name: 'View payment availability', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payments are not available yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue to Paystack' })).toHaveCount(0);
  expect(posts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('a configured synthetic offer shows complete terms before its hosted link; never navigates to a provider in CI', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  const external: string[] = [], posts: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('https://paystack.com/')) external.push(request.url());
    if (request.method() === 'POST') posts.push(request.url());
  });
  await page.route('**/api/v1/commerce/offer', route => route.fulfill({ json: { status: 'available', offer, revision } }));
  await page.goto('/#/payments?reference=forged&status=success');
  await expect(page).toHaveURL(/#\/payments$/);
  await expect(page.getByRole('heading', { name: offer.title })).toBeVisible();
  await expect(page.getByText(offer.refunds, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue to Paystack' })).toHaveCount(0);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('link', { name: 'Continue to Paystack' })).toHaveAttribute('href', `/api/v1/commerce/checkout?id=${offer.id}&revision=${revision}`);
  expect(external).toEqual([]); expect(posts).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
