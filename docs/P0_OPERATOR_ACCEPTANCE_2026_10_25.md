# LUQI — P0 operator acceptance, 25 October 2026

This file specifies evidence required for broad launch. Preparing or running a tool does **not** itself close any gate. The existing limited pilot and the approved USD100/month provider allocation stay unchanged. This procedure does not authorize production account resets, SQL exports, new infrastructure, billing, merchant onboarding or customer charges.

## 1. Verified private support and account recovery — OPEN

- Nominate a real human operator and private reply channel. Confirm *inbound delivery and a distinct outbound reply* from accounts under operator control. Existing MX DNS records, domain TLS and the configured `LUQI_OWNER_RECOVERY_EMAIL` name are **not** proof of a working inbox. Gmail's current connection is not necessarily the HostAfrica mailbox.
- Have an authorized participant explicitly identify a disposable account **they own**, using a trusted independent channel. Knowing an email address, account ID or login token is insufficient ownership verification.
- With the operator present and separate permission for that test, follow `docs/ACCOUNT_RECOVERY.md`: confidential identity challenge, interactive CLI, password change and session invalidation, new login and preserved notes. Never paste passwords into a ticket, code, chat or screenshots.
- Keep a restricted, redacted audit of the human challenge, account ownership, timestamp, old-token denial, new-login success and response ownership; do not publish identifiers in public GitHub issues.
- The retired `/api/v25/support/*` ticket endpoint is explicitly unavailable. A real authenticated ticket backend, retention, private support operator and delivery verification require a separate implementation and acceptance. Public GitHub issues are only for non-private technical reports.

**Do not mark operational recovery complete from offline tests or the existence of a reset CLI.**

## 2. Production-derived isolated MySQL restore — OPEN

- Confirm Railway `kind-spontaneity/production` MySQL service `8094576f-f2c7-4e50-b474-69661e7c0ba8`, mounted volume, latest snapshot date, retention, cost and operator access in the private dashboard. An initial 941 MB snapshot and daily/six-day schedule were reported earlier; no current backup inventory is available through the connected read tools.
- Only with explicit source-data/export approval, an authorized operator creates an encrypted off-volume logical backup, separately records source UTC timestamp and checksum, and runs `docs/LOCAL_RECOVERY_DRILL.md` against an isolated target. **Never** click production Restore for a rehearsal, copy SQL or customer data into chat/GitHub, or run the fixture tool against the live DB.
- Independently compare source and recovered schema, account ownership, notes, quotas, attempt throttles, checksums and recovery times; approve RPO/RTO with named recovery owner. A fixture import does not establish production recoverability.

## 3. Actual provider cost and quota review — OPEN

Approved monthly ceilings: Gemini **$60**, OpenAI **$40**, total **$100**. Auto-reload stays off. Budget reservations are not provider invoices. One earlier approved authenticated Gemini reply was observed; that is not OpenAI fallback or billed-cost reconciliation.

Provide *only aggregate USD cents* from the correct verified provider project/closed UTC calendar month and the protected read-only LUQI reservation totals. Do not send invoice exports, keys, prompts, customer identifiers or billing statements into GitHub or chat. In the operator's controlled terminal:

```sh
node scripts/run-provider-cost-review.mjs < /private/operator/aggregate-only.json
```

The following is a **fictional test input**, not a record of LUQI spending:

```json
{
  "month_utc": "2026-09",
  "gemini": {
    "billing_source": "provider_dashboard", "actual_cents": 120,
    "reserved_cents": 200, "project_confirmed": true, "period_complete": true
  },
  "openai": {
    "billing_source": "provider_invoice", "actual_cents": 30,
    "reserved_cents": 80, "project_confirmed": true, "period_complete": true
  }
}
```

If invoices are unavailable use `billing_source:"unavailable"` and `actual_cents:null`; **never substitute zero**. Use `reserved_cents:null` if the database ledger cannot be read. Closed months only qualify for operator comparison; current UTC month is provisional. The script exits nonzero on incomplete evidence or possible cap breaches. Differences between reservation and actual amounts need explanation but are not automatically fraudulent or billable charges.

The output *always* leaves `independent_billing_verification`, `provider_costs_reconciled`, and `launch_approved` false. A signed-off provider-project invoice/usage review, source lineage, ledger comparison and misuse review remain necessary for clearance.

## 4. Merchant and paid-launch readiness — OPEN

The proposed first offer remains a **human-assisted 90-second silent six-scene Creator Pack**, not generative paid video or an activated subscription. Before selling: confirm the seller's legal identity/country, processor approval, settlement currency, final price/tax, asset rights, deliverables, turnaround, revisions, refunds, privacy, verified support ownership and delivery capacity. Review a merchant-owned hosted checkout, receipt and fulfillment evidence only once authorized and onboarded. Payment links and wallet credits must remain disabled without independent live merchant acceptance. A checkout URL or successful test-mode payment does not prove settled customer money.

## Status and evidence recording

For each gate, preserve date/time (Africa/Johannesburg), operator, scope, source links, proof of execution, approval and remaining limitations in an access-controlled operations record. Put **redacted conclusions only** into GitHub [#202](https://github.com/ttmodupe-hash/luqi-ai/issues/202). A scheduled health check, green CI, certificate validity, configured API key, listed backup or drafted process cannot substitute for the missing operational acceptance.
