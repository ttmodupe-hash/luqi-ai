import { afterEach, expect, it, vi } from 'vitest';
import { configuredHostedOffer, hostedCheckout, hostedOfferDigest } from '../api/hosted-checkout';
import { loadHostedOffer } from '../src/lib/hosted-checkout';
import { hostedOfferFixture as offer, hostedOfferRevisionFixture as revision } from './fixtures/hosted-offer';
import { publicKeyOfferFixture } from './fixtures/hosted-offer';

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
const approved = () => ({ LUQI_HOSTED_CHECKOUT_ENABLED: 'true',
  LUQI_HOSTED_CHECKOUT_OFFER: JSON.stringify(offer), LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256: hostedOfferDigest(offer) });

it('publishes no offer until exact public terms are configured and explicitly enabled', () => {
  expect(configuredHostedOffer({})).toEqual({ status: 'unavailable' });
  expect(configuredHostedOffer({ ...approved(), LUQI_HOSTED_CHECKOUT_ENABLED: 'false' })).toEqual({ status: 'unavailable' });
  expect(configuredHostedOffer({ ...approved(), LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256: '' })).toEqual({ status: 'unavailable' });
  expect(configuredHostedOffer(approved())).toEqual({ status: 'available', offer, revision: hostedOfferDigest(offer) });
});
it('closes checkout if the accepted amount, seller, URL or delivery/refund terms change', () => {
  for (const change of [{ amountMinor: 12600 }, { sellerName: 'Another seller' },
    { checkoutUrl: 'https://paystack.com/pay/another-page' }, { refunds: 'Changed terms' }, { delivery: 'Changed delivery' }]) {
    expect(configuredHostedOffer({ ...approved(), LUQI_HOSTED_CHECKOUT_OFFER: JSON.stringify({ ...offer, ...change }) })).toEqual({ status: 'unavailable' });
  }
});
it('rejects missing commercial terms, injected private data, invalid amounts and unsafe links', () => {
  const urls = ['http://paystack.com/pay/fixture', 'https://paystack.com.evil.example/pay/fixture',
    'https://evil.example/pay/fixture', 'https://paystack.com@evil.example/pay/fixture',
    'https://user:pass@paystack.com/pay/fixture', 'https://paystack.com:444/pay/fixture',
    'https://paystack.com/pay/fixture?email=private@example.invalid', 'https://paystack.com/pay/fixture#token',
    'https://paystack.com/transaction/verify/fixture', 'https://paystack.com/pay/%2fother',
    'javascript:alert(1)', '//paystack.com/pay/fixture'];
  for (const checkoutUrl of urls) expect(() => hostedOfferDigest({ ...offer, checkoutUrl })).toThrow();
  for (const change of [{ refunds: '' }, { supportEmail: 'a%0abcc@example.invalid' }, { amountMinor: 1.5 },
    { amountMinor: -1 }, { amountMinor: Number.MAX_SAFE_INTEGER }, { kind: 'subscription' },
    { currency: 'USD' }, { buyerEmail: 'private@example.invalid' }]) {
    expect(() => hostedOfferDigest({ ...offer, ...change })).toThrow();
  }
  expect(configuredHostedOffer({ ...approved(), LUQI_HOSTED_CHECKOUT_OFFER: '{private-invalid' })).toEqual({ status: 'unavailable' });
});
it('serves only a noncached public GET and never accepts callbacks or payer identity', async () => {
  const env = approved();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const response = await hostedCheckout.request('/offer');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'available', offer, revision: hostedOfferDigest(offer) });
  expect((await hostedCheckout.request('/offer?email=someone@example.invalid')).status).toBe(400);
  expect((await hostedCheckout.request('/offer', { method: 'POST', body: 'untrusted callback' })).status).toBe(405);
});
it('client uses one fixed same-origin GET without credentials, payment data or provider traffic', async () => {
  const request = vi.fn(async () => Response.json({ status: 'available', offer, revision }));
  expect(await loadHostedOffer(new AbortController().signal, request)).toEqual({ status: 'available', offer, revision });
  expect(request).toHaveBeenCalledTimes(1);
  const [path, options] = request.mock.calls[0] as unknown as [string, RequestInit];
  expect(path).toBe('/api/v1/commerce/offer');
  expect(options).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store' });
  expect(options.body).toBeUndefined();
  expect(options.headers).toEqual({ Accept: 'application/json' });
});
it('rechecks the exact offer at handoff, refuses stale or duplicate parameters and forwards no buyer data', async () => {
  for (const [key, value] of Object.entries(approved())) vi.stubEnv(key, value);
  const query = `id=${offer.id}&revision=${hostedOfferDigest(offer)}`;
  const response = await hostedCheckout.request('/checkout?' + query);
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(offer.checkoutUrl);
  expect(response.headers.get('cache-control')).toBe('no-store');
  for (const suffix of ['&email=private@example.invalid', '&id=another', '&revision=forged']) {
    expect((await hostedCheckout.request('/checkout?' + query + suffix)).headers.get('location')).toBe('/#/payments');
  }
  vi.stubEnv('LUQI_HOSTED_CHECKOUT_ENABLED', 'false');
  expect((await hostedCheckout.request('/checkout?' + query)).headers.get('location')).toBe('/#/payments');
});
it('refuses malformed, oversized and unsafe offers without following any link', async () => {
  for (const response of [Response.json({ status: 'available', offer: { ...offer, checkoutUrl: 'https://evil.example/' }, revision }),
    new Response('x'.repeat(32769), { headers: { 'Content-Type': 'application/json' } }),
    new Response('<html>Unavailable</html>', { headers: { 'Content-Type': 'text/html' } }),
    Response.json({ status: 'available' }), Response.json({ status: 'unavailable', token: 'private' })]) {
    const request = vi.fn(async () => response);
    await expect(loadHostedOffer(new AbortController().signal, request)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  }
});
it('bounds a transport that ignores cancellation and never retries', async () => {
  vi.useFakeTimers();
  const request = vi.fn(() => new Promise<Response>(() => {}));
  const pending = loadHostedOffer(new AbortController().signal, request);
  const outcome = pending.catch(error => error);
  await vi.advanceTimersByTimeAsync(10_001);
  expect(await outcome).toBeInstanceOf(Error);
  expect(request).toHaveBeenCalledTimes(1);
});
it('accepts a reviewed live public key in place of a payment page and routes to a separate document', async () => {
  const accepted = hostedOfferDigest(publicKeyOfferFixture);
  vi.stubEnv('LUQI_HOSTED_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('LUQI_HOSTED_CHECKOUT_OFFER', JSON.stringify(publicKeyOfferFixture));
  vi.stubEnv('LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256', accepted);
  expect(configuredHostedOffer()).toEqual({ status: 'available', offer: publicKeyOfferFixture, revision: accepted });
  const response = await hostedCheckout.request('/checkout?id=' + offer.id + '&revision=' + accepted);
  expect(response.headers.get('location')).toBe('/paystack-checkout.html?id=' + offer.id + '&revision=' + accepted);
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  vi.stubEnv('LUQI_HOSTED_CHECKOUT_OFFER', JSON.stringify({ ...publicKeyOfferFixture, paystackPublicKey: 'pk_live_ANOTHERFIXTUREONLYPUBLICKEY' }));
  expect(configuredHostedOffer()).toEqual({ status: 'unavailable' });
});
it('rejects secret/test keys, mixed checkout modes and unreviewed public-key offers', () => {
  for (const change of [{ paystackPublicKey: 'sk_live_FIXTUREONLYNOTAREALKEY' },
    { paystackPublicKey: 'pk_test_FIXTUREONLYNOTAREALKEY' },
    { paystackPublicKey: 'https://evil.example/' }, { paystackPublicKey: 'pk_live_ space' },
    { checkoutMode: 'subscription' }, { checkoutUrl: offer.checkoutUrl }, { amountMinor: 0 }]) {
    expect(() => hostedOfferDigest({ ...publicKeyOfferFixture, ...change })).toThrow();
  }
  expect(configuredHostedOffer({ LUQI_HOSTED_CHECKOUT_OFFER: JSON.stringify(publicKeyOfferFixture) })).toEqual({ status: 'unavailable' });
});
