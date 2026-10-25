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

## Reusable local quote projects

A signed-in plan is not needed to export a portable `luqi.business.quote.v1`
JSON project or reopen it using the browser's local file picker. The app
validates a strict 16 KiB maximum, whitelisted keys, the format/version,
line count, decimal money, names and item limits. It ignores no unknown
fields and recalculates the quote; imported invoices, payments or asserted
totals are never trusted. Downloads are owned by the user and may contain
client details: users must store and share them with appropriate care.

Project files are not stored in browser storage or on LUQI servers. Users must
download the file before leaving or reloading. Invalid/oversized files never
replace the existing form. Late file reads cannot override new edits.
Private, authenticated cross-device storage would be a separate,
chargeable-value feature only after recovery/privacy, billing, entitlements
and account-erasure checks have passed. This improvement does not introduce
a paid subscription or a merchant integration.

## Delivery and repeat-customer acceptance log (25 October 2026)

- Business Desk quotation and price calculator were deployed in PR #254:
  exact main revision `46ac27ad3d5184931cc26559f0942cd57cc21cab`,
  Railway deployment `2504d3cd-998b-4ef0-94b6-4bff2f4d0bc7` SUCCESS,
  17/17 post-merge checks passing.
- PR #256 completed **19/19 exact-head** tests for reusable editable JSON
  projects, including desktop/mobile save-then-restore, malformed file and
  privacy boundaries. It was merged to main as
  `17a41c3e4b0fc9357f964df71f48809a8c565df0`.
- The first Railway build for #256, deployment
  `7edff410-c2f6-4b07-93be-5f76a26025ba`, FAILED before app compilation,
  with logs limited to builder snapshot upload/unpack. Railway's diagnosis
  exposed no application error. This does not prove a source defect, nor does
  green CI alone prove that #256's feature reached customers.
  **Until a later exact-main Railway deployment is SUCCESS and matching
  public/custom HTTPS checks pass, treat editable-project reuse as merged,
  not independently live-verified.** The previous successful web build
  remained online, as did MySQL (each one running replica). Do not restart
  the database or roll back the successful pilot because of this failed build.
- This dated release log captures the distinction between a repository merge,
  an infrastructure builder failure, and actual customer-serving revision.
  Subsequent release evidence belongs in #202, not an invented paid launch.

## Criteria for a real paid member's value

The existing local quotation, price-planning and export/import actions remain
FREE and must not be quietly paywalled. A paid membership must provide at least
one distinct, independently tested recurrent convenience: for example a
private multi-device client/project library, saved business branding,
cross-project progress or larger reviewed content-project workspace.

A monthly fee is NOT justified by fake AI availability badges or by simply
charging for currently free features. Any AI allowance must be strictly
subscriber-bound with server-side monthly attempts, account usage receipts,
funded provider capacity and separate reconciliation of actual provider bills.
Starter R49 and Creator R99 remain pricing hypotheses, not quotes on sale.
No unlimited AI, voice/video generators, live weather/visa/university/
water sources or autonomous agent delivery may be claimed.

Before collecting money, obtain a verified merchant account, real product
terms/refunds, private customer support, production-derived isolated recovery,
historic credential audit and a tested signature-checked subscriber
entitlement callback. Merchant-hosted recurring checkout is distinct from
an actual verified LUQI paid account. No checkout or customer billing is
enabled by this documentation or release-recovery commit.
