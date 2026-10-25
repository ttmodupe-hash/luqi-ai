# LUQI — merchant-independent member ledger candidate (25 October 2026)

**STATUS: ENGINEERING CANDIDATE ONLY. NO CUSTOMER ENTITLEMENTS OR SUBSCRIPTIONS.**

This PR adds two *manual opt-in* MySQL schema definitions, a *read-only,
disconnected* internal eligibility query, and tests run on an exclusively
synthetic local MySQL instance. Nothing is imported by LUQI's runtime router,
existing budgeted text gateway, vault API, or business/purchase pages. It
adds no checkout, merchant integration, order writer, payment processor,
public endpoint, scheduled worker, migration runner, live database read,
production flag or paid service. The production web role has **no grants**
on these tables.

## Structural safeguards

- Evidence rows bind one opaque hashed order to exactly one owner. The
  provider-scoped event hash and global order hash are unique. Duplicate
  merchant notices cannot become a second independent entitlement **in
  this proposed schema**. Hashes are not webhook signatures.
- Future entitlement rows must link to a receipt with the same owner.
  Active accounts, settled/not reversed evidence, separately approved
  review status and nonexpired bounded monthly UTC periods are all required.
- Two overlapping eligible records produce an ambiguous denial, not extra
  allowance or a higher plan.
- A missing flag, missing table/grant, inactive account, expired membership,
  refunded/disputed/revoked receipt, unknown plan, malformed record or
  database failure never produces an entitlement.
- The read-side gate `LUQI_MEMBER_ENTITLEMENTS_ENABLED` defaults off. It
  is not configured on production and is insufficient to activate anything:
  the reading function is not wired to any customer path.
- The return type fixes **paidAccessAllowed=false** in *every* branch.\n  A matching synthetic ledger record yields recordMatched=true but cannot\n  authorise a subscription, quota or any paid feature.\n- Return values contain only a candidate tier/expiry, not email, payment
  reference, receipts, provider credentials, or account content.
- Proposed `starter` and `creator` values are internal *labels*, not
  approved prices or products. The R49/R99 research prices remain INACTIVE.

## Critical missing work (blocking actual subscription launch)

1. **Select/verify the real merchant and seller.** Confirm legal identity,
   transaction currency, tax, refunds, payout account, real fulfillment and
   private customer support. No processor has been authorized by this code.
2. Build and independently review an authenticated processor webhook with
   raw-body signature verification, event schema, amount/currency/product
   matching, immutable account/order ownership, verified settlement and
   durable idempotent transitions for replay, cancellation, refunds and disputes.
   The proposed database columns named `settled` and `approved` can be
   inserted in synthetic tests; the names are NOT payment evidence.
3. Accept a production-derived isolated restore, incident credential review,
   trusted private support/recovery, device acceptance, privacy/erasure and
   retention rules with named operators before any production migration/grants.
4. Design **durable server-enforced quotas** and separately measured usage
   capacity. The present candidate does not grant an AI allowance, increase
   the provider budget, create an order, or activate cross-device vault storage.
   Leave current total USD100/month (Gemini USD60 / OpenAI USD40) unchanged;
   reservations are not actual provider charges.
5. Owner independently approves a limited, tested merchant receipt-to-
   entitlement and refund/cancellation demonstration before any paid launch.

The existing free Business Desk, local encrypted file backups, Study Desk,
creator studio and limited AI trial remain untouched. Refer to
[issue #202](https://github.com/ttmodupe-hash/luqi-ai/issues/202) and
[commercial-launch controls](./COMMERCIAL_LAUNCH.md).

## CI safety

The integration test executes only with `GITHUB_ACTIONS=true`,
`LUQI_MEMBER_LEDGER_CI_FIXTURE=true`, production AI flags set to false,
and an **exact, fixed, disposable loopback MySQL URL**. It refuses external
databases. It creates synthetic accounts and receipts. It is not a production
restore, a real-merchant reconciliation or payment acceptance.
