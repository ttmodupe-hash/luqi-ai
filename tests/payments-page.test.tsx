// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import PaymentsPage from '../src/pages/PaymentsPage';
import { hostedOfferFixture as offer, hostedOfferRevisionFixture as revision } from './fixtures/hosted-offer';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount(entry = '/payments') {
  render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/payments" element={<PaymentsPage />} /></Routes></MemoryRouter>);
}
it('shows honest unavailability without a charge button or invented price', async () => {
  const request = vi.fn(async () => Response.json({ status: 'unavailable' })); vi.stubGlobal('fetch', request);
  mount(); await screen.findByRole('heading', { name: 'Payments are not available yet' });
  expect(screen.queryByRole('link', { name: 'Continue to Paystack' })).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});
it('shows actual public terms first and exposes the fixed provider link only after review', async () => {
  const request = vi.fn(async () => Response.json({ status: 'available', offer, revision })); vi.stubGlobal('fetch', request);
  mount(); await screen.findByRole('heading', { name: offer.title });
  expect(screen.getByText(/125[,.]00 once/)).toBeTruthy();
  expect(screen.getByText(offer.refunds)).toBeTruthy(); expect(screen.getByText(offer.delivery)).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Continue to Paystack' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox'));
  const link = screen.getByRole('link', { name: 'Continue to Paystack' });
  expect(link.getAttribute('href')).toBe(`/api/v1/commerce/checkout?id=${offer.id}&revision=${revision}`);
  expect(link.getAttribute('rel')).toContain('noreferrer');
  expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.queryByRole('link', { name: 'Continue to Paystack' })).toBeNull();
});
it('does not treat a forged payment-return query as success, receipt or entitlement', async () => {
  const request = vi.fn(async () => Response.json({ status: 'unavailable' })); vi.stubGlobal('fetch', request);
  mount('/payments?status=success&reference=forged&email=private@example.invalid');
  await screen.findByRole('heading', { name: 'Payments are not available yet' });
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/payment successful|subscription activated/i)).toBeNull();
  expect(document.body.textContent).not.toContain('private@example.invalid');
});
it('fails closed on a bad response without displaying diagnostics or a checkout link', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 'available', offer: { ...offer, checkoutUrl: 'https://evil.example/' }, private: 'secret-diagnostic' })));
  mount(); await screen.findByText(/Payment availability could not be confirmed/);
  expect(screen.queryByText('secret-diagnostic')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Continue to Paystack' })).toBeNull();
});
