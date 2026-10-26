// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { beginPublicKeyCheckout, checkoutSelection, loadPaystackPopup, OfferChangedError, type PaystackOptions } from '../src/lib/paystack-popup';
import { paymentDocumentHeaders } from '../api/lib/paymentDocument';
import { publicKeyOfferFixture as offer, hostedOfferRevisionFixture as revision } from './fixtures/hosted-offer';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.head.querySelectorAll('script').forEach(script => script.remove()); delete window.PaystackPop; });
const callbacks = () => ({ onSuccess: vi.fn(), onCancel: vi.fn(), onError: vi.fn() });
const current = () => Response.json({ status: 'available', offer, revision });

it('takes only an exact public offer selection; never accepts return/identity data', () => {
  expect(checkoutSelection('?id=' + offer.id + '&revision=' + revision)).toEqual({ id: offer.id, revision });
  for (const query of ['', '?id=x', '?id=' + offer.id + '&revision=' + revision + '&email=private@example.invalid',
    '?id=' + offer.id + '&revision=' + revision + '&id=again', '?id=x&revision=forged']) expect(checkoutSelection(query)).toBeNull();
  expect(checkoutSelection('?id=' + offer.id + '&revision=' + revision, '#status=success')).toBeNull();
});
it('does not load a provider or start payment when the offer is withdrawn or changed', async () => {
  for (const payload of [{ status: 'unavailable' }, { status: 'available', offer, revision: 'a'.repeat(64) }]) {
    const request = vi.fn(async () => Response.json(payload)), loadPopup = vi.fn();
    await expect(beginPublicKeyCheckout({ offer, revision }, 'buyer@example.invalid', new AbortController().signal,
      callbacks(), { request, loadPopup })).rejects.toBeInstanceOf(OfferChangedError);
    expect(loadPopup).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
  }
});
it('rechecks after loading the SDK so a withdrawal during loading cannot start a transaction', async () => {
  const transaction = vi.fn(); class Popup { newTransaction = transaction; }
  const request = vi.fn().mockResolvedValueOnce(current()).mockResolvedValueOnce(Response.json({ status: 'unavailable' }));
  await expect(beginPublicKeyCheckout({ offer, revision }, 'buyer@example.invalid', new AbortController().signal,
    callbacks(), { request, loadPopup: async () => Popup })).rejects.toBeInstanceOf(OfferChangedError);
  expect(transaction).not.toHaveBeenCalled();
});
it('passes only the reviewed public terms and entered receipt email once; callbacks make no receipt or entitlement request', async () => {
  const transaction = vi.fn(); class Popup { newTransaction = transaction; }
  const request = vi.fn(async () => current()), handlers = callbacks();
  await beginPublicKeyCheckout({ offer, revision }, ' buyer@example.invalid ', new AbortController().signal,
    handlers, { request, loadPopup: async () => Popup });
  expect(transaction).toHaveBeenCalledTimes(1);
  const options = transaction.mock.calls[0][0] as PaystackOptions;
  expect(options).toMatchObject({ key: offer.paystackPublicKey, email: 'buyer@example.invalid',
    amount: offer.amountMinor, currency: 'ZAR', metadata: { luqi_offer_id: offer.id, luqi_offer_revision: revision } });
  expect(Object.keys(options).sort()).toEqual(['amount', 'currency', 'email', 'key', 'metadata', 'onCancel', 'onError', 'onSuccess', 'reference'].sort());
  expect(options.reference).toMatch(/^luqi-[A-Za-z0-9.-]+$/);
  options.onSuccess(); options.onCancel(); options.onError();
  expect(handlers.onSuccess).toHaveBeenCalledTimes(1); expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(2);
  for (const [path, init] of request.mock.calls as unknown as [string, RequestInit][]) {
    expect(path).toBe('/api/v1/commerce/offer'); expect(init.credentials).toBe('omit'); expect(init.body).toBeUndefined();
  }
});
it('never initiates a late payment after the page is closed', async () => {
  const controller = new AbortController(), transaction = vi.fn(); class Popup { newTransaction = transaction; }
  await expect(beginPublicKeyCheckout({ offer, revision }, 'buyer@example.invalid', controller.signal, callbacks(),
    { request: async () => current(), loadPopup: async () => { controller.abort(); return Popup; } })).rejects.toThrow();
  expect(transaction).not.toHaveBeenCalled();
});
it('loads only the fixed official SDK after an explicit call and bounds an unresponsive download', async () => {
  vi.useFakeTimers();
  const outcome = loadPaystackPopup(new AbortController().signal).catch(error => error);
  const script = document.head.querySelector('script')!;
  expect(script.src).toBe('https://js.paystack.co/v2/inline.js');
  expect(script.referrerPolicy).toBe('no-referrer');
  await vi.advanceTimersByTimeAsync(10_001);
  expect(await outcome).toBeInstanceOf(Error); expect(document.head.querySelector('script')).toBeNull();
});
it('serves the isolated document without referrers, framing, inline scripts or an open provider allowlist', async () => {
  const app = new Hono(); app.use('*', paymentDocumentHeaders); app.get('*', c => c.html('<main>Checkout</main>'));
  const response = await app.request('/paystack-checkout.html');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('x-frame-options')).toBe('DENY');
  const csp = response.headers.get('content-security-policy')!;
  expect(csp).toContain("script-src 'self' https://js.paystack.co");
  expect(csp).toContain("frame-src https://checkout.paystack.com");
  expect(csp).toContain("form-action 'none'"); expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/); expect(csp).not.toContain('*');
});
