# Direct public-key checkout — 26 October 2026

## Alternative to the failed dashboard handoff

The owner can sign into Paystack in their own browser. The shared-browser
handoff could not establish a merchant dashboard session. Do not ask them to
reset a working password or repeat completed email verification.

Paystack InlineJS supports one-time checkout using a **public key**, amount
and buyer email. This needs neither an agent merchant session nor a Payment
Page URL. It introduces no payment API secret into LUQI or Railway.

Primary sources checked on 26 October:

- https://paystack.com/docs/developer-tools/inlinejs/
- https://paystack.com/docs/api/authentication/
- https://paystack.com/docs/payments/accept-payments/

The provider's recommended server-verified flow remains appropriate for future
automated orders. This limited route requires **operator-verified receipts
for one-time human-assisted services**, with no automatic entitlement.

## Implementation

The existing public offer, review page and accepted-offer digest support either
the original Payment Page or a public-key offer. Both stay unavailable without
real commercial terms, their exact digest and the enable flag. Mixed methods,
test/secret keys, missing terms and unexpected fields fail closed. The original
Payment Page configuration, field order and digest remain supported.

After offer review, the server rechecks availability and redirects to
**/paystack-checkout.html** in a new no-opener tab. A separate application entry
loads without the customer session, Chat, Notes, main router or analytics. A
URL/callback cannot confirm a payment.

An independent Vite build adds the document and checkout-assets directory
after the canonical main build. The main single-entry startup, provider and
emitted-byte parity guards remain unchanged.

The buyer enters a receipt email and reviews seller, exact ZAR price, service,
delivery, revisions, refunds, taxes/fees and support. Only an explicit action
loads the fixed official SDK. Availability is rechecked before and after SDK
loading. The SDK receives only the entered email, current public key,
amount/currency and a public offer reference/revision. No LUQI token, saved
account email, private context or app entitlement is passed.

No-store/no-referrer headers, denied framing and restricted script/connect/frame
sources apply. Vendor overlay styles are allowed; inline scripts are not. This
is a **separate document on the same origin**, not an origin sandbox. The
official SDK is trusted third-party code. The LUQI token remains memory-only
in the original tab.

Callbacks display an explicitly **unverified** return/cancel/error state.
They create no receipt, confirmation request, subscription, wallet credit or
AI allowance. One deliberate attempt is permitted per page; there is no
automatic retry. Buyers check receipts before retrying after an ambiguous
outcome. Withdrawal cannot recall a transaction already open at the provider.

## Missing owner input and acceptance

In the owner's **working** Paystack browser, copy the **Live Public Key** from
Developers/API keys. It starts with **pk_live_** and is designed for frontend
use. No further agent dashboard login is needed. Do not request or publish
**sk_** secrets, passwords, OTPs, private dashboard links, bank records or IDs.

A public key does **not** prove merchant activation, seller identity,
settlement, support, offer acceptance or fulfilment capacity. Before collection,
verify actual merchant Live status and seller/price inside provider checkout;
finalize real service, delivery, revision, cancellation/refund, tax and support
terms. Verify order support and receipt/refund/fulfilment operation.
R49/R99 memberships and the earlier R499 Creator Pack remain hypotheses.

Before every assisted-service fulfilment, the responsible operator checks the
**actual successful transaction in the Paystack dashboard**, including amount,
ZAR currency and offer/reference. A callback, customer screenshot or forwarded
receipt is insufficient. Automated orders/subscriptions/credits require the
separate audited durable order/webhook/entitlement work in #150.

## Configuration after acceptance

Use **LUQI_HOSTED_CHECKOUT_OFFER** with all existing required commercial fields.
Replace checkoutUrl with:

    "checkoutMode": "paystack_public_key"
    "paystackPublicKey": "<the merchant's actual pk_live_ public key>"

Do not include checkoutUrl alongside these fields. Run the existing offline
**scripts/prepare-hosted-checkout.ts** helper to normalize the public manifest
and compute **LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256**. Neither a key nor a digest
is merchant verification. Set **LUQI_HOSTED_CHECKOUT_ENABLED=true** only after
the actual acceptance above. Re-read deployment, public offer, handoff/document
headers and provider seller/amount. The owner already authorized activation;
do not ask for the same permission again. Collection stays off while the real
merchant/commercial facts are missing.

## Verification limits

Unit and desktop/mobile browser fixtures block external provider traffic and
stub the SDK with synthetic terms. They cover explicit email/review, no-opener
opening, CSP, malformed/withdrawn/stale offers before and during SDK loading,
one attempt and forged callbacks/returns without access grants. These tests
cannot prove merchant approval, live SDK/3DS behavior, physical-device
acceptance, actual payment, support delivery, refunds or settlement.

Chat stays primary, Notes optional and legacy payments/wallet/webhooks closed.
No migration, payment secret, new paid service or AI budget change is included.
USD100/month remains Gemini USD60/OpenAI USD40. This is not full launch
readiness.
