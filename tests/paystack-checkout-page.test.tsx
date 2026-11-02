// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PaystackCheckoutPage from '../src/pages/PaystackCheckoutPage';
import * as popup from '../src/lib/paystack-popup';
import { publicKeyOfferFixture as offer, hostedOfferRevisionFixture as revision } from './fixtures/hosted-offer';

vi.mock('../src/lib/paystack-popup', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/paystack-popup')>(),
  beginPublicKeyCheckout: vi.fn(async () => {}),
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); window.history.replaceState({}, '', '/'); localStorage.clear(); });
function mount(search = '?id=' + offer.id + '&revision=' + revision) {
  window.history.replaceState({}, '', '/paystack-checkout.html' + search);
  render(<PaystackCheckoutPage />);
}
it('fails closed on a forged return without fetching a provider, taking payment data or displaying success', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  mount('?reference=forged&status=success&email=private@example.invalid');
  await screen.findByRole('heading', { name: 'Checkout is unavailable' });
  expect(request).not.toHaveBeenCalled(); expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.body.textContent).not.toContain('private@example.invalid');
});
it('requires fresh availability and never preloads a provider or prefills the LUQI account email', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'unavailable' })));
  mount(); await screen.findByRole('heading', { name: 'Checkout is unavailable' });
  expect(popup.beginPublicKeyCheckout).not.toHaveBeenCalled();
  expect(document.querySelector('script[src*="paystack"]')).toBeNull();
});
it('requires entered email and reviewed terms, and permits a single deliberate attempt', async () => {
  localStorage.setItem('fixture-account', 'do-not-forward@example.invalid');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'available', offer, revision })));
  mount(); await screen.findByRole('heading', { name: offer.title });
  expect(screen.getByText(offer.refunds)).toBeTruthy(); expect(screen.getByText(/125[,.]00 once/)).toBeTruthy();
  const input = screen.getByRole('textbox', { name: 'Receipt email' }) as HTMLInputElement;
  expect(input.value).toBe('');
  const button = screen.getByRole('button', { name: 'Open Paystack checkout' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.change(input, { target: { value: 'buyer@example.invalid' } }); expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox')); expect(button.disabled).toBe(false);
  fireEvent.click(button); fireEvent.click(button);
  expect(popup.beginPublicKeyCheckout).toHaveBeenCalledTimes(1);
  expect(vi.mocked(popup.beginPublicKeyCheckout).mock.calls[0][1]).toBe('buyer@example.invalid');
  expect(document.body.textContent).not.toContain('do-not-forward@example.invalid');
});
it('never treats a provider callback as a verified receipt, subscription or app credit', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'available', offer, revision })));
  vi.mocked(popup.beginPublicKeyCheckout).mockImplementationOnce(async (_offer, _email, _signal, handlers) => { handlers.onSuccess(); });
  mount(); await screen.findByRole('heading', { name: offer.title });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'buyer@example.invalid' } });
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button'));
  await screen.findByRole('heading', { name: 'Checkout returned' });
  expect(screen.getByText(/LUQI has not independently verified payment here/)).toBeTruthy();
  expect(screen.queryByText(/payment successful|subscription activated|credits added/i)).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
