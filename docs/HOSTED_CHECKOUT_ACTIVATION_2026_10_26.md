# Hosted checkout connection — 26 October 2026

**Alternative to the shared-browser sign-in problem:** the direct
[public-key checkout](PAYSTACK_PUBLIC_KEY_CHECKOUT_2026_10_26.md) accepts the
merchant's public pk_live_ key instead of a Payment Page URL. It needs no
payment API secret or agent merchant login. The same real merchant/offer and
manual-receipt acceptance gates apply. The original route below stays supported.

The owner has explicitly instructed activation of customer payments and a
website update. That authorization is recorded; it does not supply a merchant
account, a payment-page URL, a final product price or service terms. The current
Railway web service has no payment-provider credential or hosted-offer config.
No verified live payment page was found in project history. R49/R99 memberships
and the earlier R499 Creator Pack discussion are not published sale prices.

## Implemented connection

`/#/payments`, linked from Plans and the footer, reads the public offer from
`GET /api/v1/commerce/offer`. When none is configured, the customer sees payment
unavailability and can return to Chat. No payment link, invented price, customer
data collection or processor request is made in that state.

An accepted configuration supports **one one-time human-assisted service** on a
Paystack Payment Page. It is not an AI subscription or app-wallet integration.
The customer reviews seller, exact ZAR price, scope, delivery, revisions,
cancellation/refund terms, taxes/fees and order support before revealing the
provider-hosted link. The handoff rechecks the current offer and rollout flag;
changed or withdrawn terms return the visitor to review current availability.
LUQI credentials, account email and private notes are not
forwarded. A redirect/query string never confirms payment or grants access.

The old `/api/v25/payments/*` routes remain disabled. This connection does not
credit a wallet, grant an entitlement, create an order ledger or consume AI
budget. Automated subscriptions still require the separate audited durable
order/webhook/entitlement work in issue #150.

## The missing merchant step

Use the merchant's approved live Paystack account to create a **fixed-amount,
one-time** Payment Page for the actual service. Read and compare the public
page's seller, price/currency and product with the LUQI offer. Verify private
order support, receipt handling, fulfilment, cancellations/refunds and provider
acceptance before exposing a paid offer. Test-mode success, a URL, or a config
hash alone is not proof of merchant approval, cleared funds or settlement.

The owner completes provider onboarding and any agreements. Never request or
paste secret keys, bank details or identity documents in chat or GitHub. This
hosted-link connection does not need a Paystack API secret. Once the owner
supplies the **public approved payment-page link**, its visible commercial
details can be reviewed without asking for payment credentials.

Paystack's primary instructions distinguish fixed-amount Payment Pages from
subscription pages and describe business activation and Live Mode:

- https://support.paystack.com/en/articles/2132546
- https://support.paystack.com/en/articles/2125506
- https://support.paystack.com/en/articles/2129922

## Exact configuration after acceptance

Set these on `kind-spontaneity` / `production` / `web`, using public commercial
details only:

- `LUQI_HOSTED_CHECKOUT_OFFER`: compact JSON matching the contract below.
- `LUQI_HOSTED_CHECKOUT_ACCEPTED_SHA256`: the digest of the reviewed canonical
  offer, produced by the offline helper. The digest only binds exact terms; it
  does not attest to a merchant or payment test.
- `LUQI_HOSTED_CHECKOUT_ENABLED=true`: enable only after actual merchant and
  checkout acceptance. Set to `false` to withdraw the offer immediately on the
  next deployment. Do not increase the AI allocation or add provider keys.

Every value below is a **blank placeholder**, not a product on sale:

```json
{
  "id": "assisted-service",
  "provider": "paystack",
  "kind": "one_time_assisted_service",
  "title": "",
  "description": "",
  "amountMinor": 0,
  "currency": "ZAR",
  "sellerName": "",
  "sellerCountry": "ZA",
  "supportEmail": "",
  "deliverables": [],
  "delivery": "",
  "revisions": "",
  "refunds": "",
  "taxesAndFees": "",
  "checkoutUrl": ""
}
```

`amountMinor` is an integer number of South African cents, from 1 through
99,999,999. The URL must be an HTTPS `paystack.com/pay/<page>` link with no
credentials, non-default port, query or fragment. Only the supported one-time
service type and ZAR/ZA terms are accepted. Missing terms, unexpected fields,
malformed config or a changed price/link without a matching digest close the
checkout. The offer is never taken from a visitor's URL or request body.

Run the offline helper from the repository after reviewing the actual public
offer JSON:

```sh
npx --no-install esbuild scripts/prepare-hosted-checkout.ts --platform=node --bundle --format=esm --outfile=/tmp/luqi-prepare-hosted-checkout.mjs
node /tmp/luqi-prepare-hosted-checkout.mjs /path/to/reviewed-public-offer.json
```

It outputs normalized public terms and their digest, makes no network request,
changes no configuration and explicitly does not verify a merchant. Never
treat running it as checkout acceptance. If the merchant edits its Payment
Page later, withdraw or re-review the LUQI offer; a static hosted link cannot
independently reconcile changed provider-side terms.

## Acceptance and verification

Unit and mobile-browser fixtures cover absent/changed config, unsafe URLs,
exact amounts, missing terms, bounded fetch/cancellation, public disclosure,
review-before-link, forged returns and no provider traffic in CI. They do not
perform a real payment. On production, confirm the offer endpoint, visible
terms and correct hosted page. A responsible operator confirms actual receipt,
refund/support and fulfilment handling; no success is inferred from a browser
return or a screenshot. No test card or real charge is submitted by CI.

Chat remains primary, Notes optional, and USD100/month remains split USD60
Gemini/USD40 OpenAI. The owner activation instruction remains valid once the
missing commercial setup and checkout acceptance are supplied.
