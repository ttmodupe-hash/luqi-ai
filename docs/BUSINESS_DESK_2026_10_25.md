# LUQI Business Desk — zero-provider customer-value pilot, 25 Oct 2026

## Customer benefit delivered by this candidate

- A real, browser-only draft ZAR quotation builder for up to 12 line items,
  with exact integer-cent totals, client/seller names, reference and a
  downloadable plain-text draft. No tax invoice, receipt, merchant collection,
  trust badge or artificial proof of income is produced.
- A selling-price, gross margin and fixed-cost break-even calculator using
  caller-provided figures only. Reports negative gross contribution honestly;
  taxes, transaction fees and unentered costs are explicitly excluded.
- A discoverable route /#/business-desk, catalog entry, phone-friendly welcome
  card and a link from the truthful plans page. Root and app frontends are
  mirrored, with the new tool lazily loaded to protect the initial bundle.
- No authentication, cookies, network, account data writes, API calls,
  provider spending, private persistence, background automation, usage limit
  changes, payment link, billing ledger or subscribed entitlement is introduced.
  Inputs live only in memory while the page is open.

## Boundaries and merchant gate

This is a customer-value experiment, not a paid tier or invoice authority.
Customers own and must verify all quotation information and tax obligations
before sending their draft. No data is sent to LUQI or a third-party service.
No registration, payment, trial plan, refund entitlement or subscription can
be activated by this feature.

The proposed future ZAR subscription prices R49 and R99 are *research
hypotheses only*, not offers, published entitlements or active checkout.
A genuine paid tier would need distinct, tested features (for example,
owner-owned saved template/project history and **capped** eligible AI
requests), durable subscription records, merchant-side verified payments,
per-account budgets, refunds/disputes, clear delivery terms and private
support. Do not charge for access to these currently free pilot tools.

## Acceptance

- Exact-cent math and malformed-input tests for quotes and price screening.
- Component tests for no network or storage, stale quote invalidation and
  honest non-invoice language.
- 320px browser tests for two-item totals, text export, break-even losses,
  keyboard and responsive behavior. No provider or account calls.
- Production and nested frontend parity, normal CI and container smoke;
  an exact merged revision must reach terminal Railway SUCCESS and independent
  public / custom HTTPS checks before reporting the feature live.

See #202 for broad launch holds: historical credentials, isolated
production-derived restore, verified private support and account recovery,
actual provider spend reconciliation and a verified merchant account.
