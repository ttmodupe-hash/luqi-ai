/** Synthetic public terms. No real product, merchant or payment destination. */
export const hostedOfferFixture = {
  id: 'fixture-assisted-service', provider: 'paystack' as const,
  kind: 'one_time_assisted_service' as const,
  title: 'Fixture assisted service', description: 'Synthetic offer for offline checkout tests only.',
  amountMinor: 12500, currency: 'ZAR' as const,
  sellerName: 'Fixture seller', sellerCountry: 'ZA' as const,
  supportEmail: 'orders@example.invalid', deliverables: ['One reviewed fixture file'],
  delivery: 'Fixture delivery terms', revisions: 'Fixture revision terms',
  refunds: 'Fixture cancellation and refund terms', taxesAndFees: 'Fixture tax and fee disclosure',
  checkoutUrl: 'https://paystack.com/pay/luqi-fixture-only',
};
export const hostedOfferRevisionFixture = 'f'.repeat(64);
