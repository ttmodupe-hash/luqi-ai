import { expect, test, type BrowserContext } from '@playwright/test';
import { Hono } from 'hono';
import { paymentDocumentHeaders } from '../api/lib/paymentDocument';
import { publicKeyOfferFixture as offer, hostedOfferRevisionFixture as revision } from '../tests/fixtures/hosted-offer';

// Local fixtures only. Never contact Paystack or permit a real payment in CI.
async function fixtures(context: BrowserContext, baseURL?: string) {
  const local = new URL(baseURL ?? 'http://127.0.0.1:4173');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(local.hostname)) throw new Error('Payment fixtures are local-only');
  const state = { available: true, withdrawOnSdk: false, sdkLoads: 0, posts: [] as string[], external: [] as string[] };
  context.on('request', request => { if (request.method() === 'POST') state.posts.push(request.url()); });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === local.origin) return route.continue();
    if (url.href === 'https://js.paystack.co/v2/inline.js') {
      state.sdkLoads++; if (state.withdrawOnSdk) state.available = false;
      return route.fulfill({ contentType: 'text/javascript', body:
        'window.PaystackPop = class { newTransaction(options) { window.fixtureOptions = options; window.fixtureAttempts = (window.fixtureAttempts || 0) + 1; } };' });
    }
    state.external.push(url.href); return route.abort();
  });
  await context.route('**/api/v1/commerce/offer', route => route.fulfill({
    json: state.available ? { status: 'available', offer, revision } : { status: 'unavailable' },
  }));
  await context.route('**/api/v1/commerce/checkout?**', route => route.fulfill({
    // WebKit routing cannot fulfill a synthetic 302. The API unit suite checks
    // the actual guarded 302; native refresh takes this fixture to the real
    // checkout document while retaining every no-opener/privacy assertion.
    contentType: 'text/html',
    body: '<!doctype html><meta http-equiv="refresh" content="0;url=/paystack-checkout.html?id=' + offer.id + '&amp;revision=' + revision + '">',
  }));
  const app = new Hono(); app.use('*', paymentDocumentHeaders); app.get('*', c => c.html(''));
  const policy = Object.fromEntries((await app.request('/paystack-checkout.html')).headers);
  await context.route('**/paystack-checkout.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...policy } });
  });
  return state;
}
const checkoutPath = '/paystack-checkout.html?id=' + offer.id + '&revision=' + revision;

test('public-key offer opens an isolated mobile checkout; only deliberate buyer input reaches the fake provider', async ({ page, context, baseURL }) => {
  const state = await fixtures(context, baseURL);
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/#/payments');
  await page.getByRole('checkbox').check();
  const next = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Continue to Paystack' }).click();
  const checkout = await next; await checkout.setViewportSize({ width: 320, height: 780 });
  await expect(checkout.getByRole('heading', { name: offer.title })).toBeVisible();
  expect(await checkout.evaluate(() => window.opener === null)).toBe(true);
  await expect(checkout.getByRole('textbox', { name: 'Receipt email' })).toHaveValue('');
  await expect(checkout.getByRole('button', { name: 'Open Paystack checkout' })).toBeDisabled();
  expect(state.sdkLoads).toBe(0);
  await checkout.getByRole('textbox').fill('buyer@example.invalid');
  await checkout.getByRole('checkbox').check();
  await checkout.getByRole('button').click();
  await expect.poll(() => checkout.evaluate(() => (window as unknown as { fixtureAttempts?: number }).fixtureAttempts)).toBe(1);
  expect(state.sdkLoads).toBe(1);
  expect(await checkout.evaluate(() => {
    const value = (window as unknown as { fixtureOptions: Record<string, unknown> }).fixtureOptions;
    return { amount: value.amount, currency: value.currency, email: value.email, key: value.key, metadata: value.metadata };
  })).toEqual({ amount: offer.amountMinor, currency: 'ZAR', email: 'buyer@example.invalid',
    key: offer.paystackPublicKey, metadata: { luqi_offer_id: offer.id, luqi_offer_revision: revision } });
  await checkout.evaluate(() => (window as unknown as { fixtureOptions: { onSuccess(): void } }).fixtureOptions.onSuccess());
  await expect(checkout.getByRole('heading', { name: 'Checkout returned' })).toBeVisible();
  await expect(checkout.getByText(/LUQI has not independently verified payment here/)).toBeVisible();
  await expect(checkout.getByRole('button')).toHaveCount(0);
  expect(state.posts).toEqual([]); expect(state.external).toEqual([]);
  expect(await checkout.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(await checkout.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
for (const duringScriptLoad of [false, true]) test('withdrawn offer cannot start checkout ' + (duringScriptLoad ? 'during SDK loading' : 'before SDK loading'), async ({ page, context, baseURL }) => {
  const state = await fixtures(context, baseURL);
  await page.goto(checkoutPath);
  await expect(page.getByRole('heading', { name: offer.title })).toBeVisible();
  if (duringScriptLoad) state.withdrawOnSdk = true; else state.available = false;
  await page.getByRole('textbox').fill('buyer@example.invalid'); await page.getByRole('checkbox').check();
  await page.getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Checkout is unavailable' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { fixtureAttempts?: number }).fixtureAttempts || 0)).toBe(0);
  expect(state.sdkLoads).toBe(duringScriptLoad ? 1 : 0);
  expect(state.posts).toEqual([]); expect(state.external).toEqual([]);
});
test('forged callback/query data cannot open a checkout or display payment success', async ({ page, context, baseURL }) => {
  const state = await fixtures(context, baseURL);
  await page.goto('/paystack-checkout.html?status=success&reference=forged&email=private@example.invalid');
  await expect(page.getByRole('heading', { name: 'Checkout is unavailable' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText('private@example.invalid', { exact: false })).toHaveCount(0);
  expect(state.sdkLoads).toBe(0); expect(state.posts).toEqual([]); expect(state.external).toEqual([]);
});
