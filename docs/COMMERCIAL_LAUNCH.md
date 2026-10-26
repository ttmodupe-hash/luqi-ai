# LUQI commercial launch preparation

**26 October update:** the owner explicitly instructed turning on customer
payments and updating the website. Activation authorization is recorded.
The prepared hosted-checkout connection and the missing merchant/link/terms
dependency are documented in
[HOSTED_CHECKOUT_ACTIVATION_2026_10_26.md](HOSTED_CHECKOUT_ACTIVATION_2026_10_26.md).
No approved live merchant page is configured yet; authorization alone cannot
provide that connection. The historical preparation record follows.

Status on 2026-10-23: the owner explicitly requested activation and income
from LUQI. This is commercial intent and authorization to prepare the rollout;
it does not supply missing merchant identity, prices or delivery capacity.
The bounded authenticated text trial has been reopened within the existing
$100/month allocation. No customer purchase or recurring charge is enabled.

## A concrete first offer to review

**Proposed, not on sale: LUQI Assisted Creator Pack.** An operator helps a
customer turn their explanation, learning idea or business message into a
six-scene, 90-second silent animated video using the working LUQI content
studio. Deliver a chosen landscape, portrait or square video plus its script
and subtitle file. This is assisted creation with the current local studio;
it is not a fully generative AI video, voiceover or automatic social post.
The customer reviews the result and uploads it to their own channel.

The studio's self-service tools remain usable in the pilot. A paid assisted
service would charge for the agreed human preparation/review/delivery, with
that distinction stated clearly. The owner must confirm capacity, turnaround,
revision allowance, file handover and refund handling before taking orders.
No automatic fulfillment or right to use a customer's assets is assumed.

Draft positioning for the reviewed offer:

> Turn your idea into a visual story with LUQI. Plan six clear scenes, explain
> the important point and take away a 90-second silent animation, script and
> captions. Human preparation and review are included only when stated in the
> purchased service's delivery terms.

There is deliberately no invented price, currency, sales-volume forecast,
customer endorsement, professional credential or guaranteed income. The
public plans page points to tools people can actually try and continues to
state that checkout is unavailable.

## Merchant information still needed

No confirmed processor, merchant account, registered seller country, settlement
currency, priced catalogue, verified private support contact or delivery/refund
terms were found in the project configuration or prior project decisions.
South African curriculum/legal references do not establish the merchant's
registered country. A Stripe connection is available to request if the owner
already has an eligible Stripe account; it was suggested, not connected or
selected. Paystack/Flutterwave remain candidates, not activated accounts.

Before publishing a paid offer, record:

- Seller/business identity and country; the processor's approved live account
  and settlement currency, with the owner completing onboarding/agreements.
- Exact one-time price, taxes/fees presentation, scope, turnaround, revision
  allowance, cancellation/refund terms and a verified private support contact.
- A merchant-owned hosted checkout whose displayed seller/product/amount
  match the LUQI offer. Test mode is not evidence of live payment acceptance.
- Payment confirmation, a receipt and agreed fulfillment evidence. Do not
  treat a redirect or screenshot as proof of cleared payment.

Use a supported merchant-hosted payment page for the initial manual service
where appropriate. Stripe documents hosted Payment Links and post-payment
handling; processor eligibility and actual merchant setup still need review.
If LUQI later grants app credits/subscriptions automatically, build a separate
persistent order/entitlement ledger with verified replay-resistant webhooks,
owner binding, amount/currency/product checks, idempotent transactional state,
refund/dispute handling and isolated integration tests first. The closed legacy
wallet endpoints are not that integration and must remain closed.

## What may be advertised today

- The local 90-second animation studio, storyboard/script/caption exports and
  the formats actually supported. Current video exports are silent.
- The working browser physics experiment and account-owned notes/exports.
- The limited signed-in AI text trial, subject to its shared allowance,
  per-account attempt limit, provider-processing acknowledgement and availability.

Do not advertise unlimited AI, included professional filing authority, verified
African-language answer quality, live voice/AI video, direct social publishing,
autonomous Omega workers, or an automatic private-memory tutor as active paid
features. Those integrations and evaluation/authority gates remain open.

## Activation evidence and remaining gates

See AI_PILOT_100_USD.md and issue #144 for actual deployment/readiness evidence.
Metadata access is not generation proof; a designated signed-in paid roundtrip
and provider usage reconciliation are still required. Historical credential
review and a production-derived restore remain open under
RAILWAY_SECURITY_RESPONSE_2026_10_23.md. Do not describe limited text reopening
as completed incident response or full commercial launch clearance.

## Primary integration references

- https://docs.stripe.com/payment-links/create
- https://docs.stripe.com/payment-links/post-payment
- https://docs.stripe.com/checkout/fulfillment
- https://paystack.com/docs/api/

These describe processor capabilities, not a verified LUQI merchant account,
country eligibility, legal terms or payment-processing result.
