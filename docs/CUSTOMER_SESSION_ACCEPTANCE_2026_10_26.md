# Customer-session and production evidence — 26 October 2026

## Production journey on the custom hostname

The owner's continuation request authorized independent signup/login and AI
availability verification within the existing USD 100/month allocation. A single
successful synthetic HTTP journey ran against `https://app.luqi-ai.com` at
`2026-10-26T11:01:12.698Z`–`11:04:18.013Z` (13:01–13:04 SAST).

The exact production commit was `f07f8602be4bba38c8415de43085fd6b7b9c167c`,
verified before the journey, immediately before inference, and after cleanup.
All **22 recorded production checks passed**. The redacted report is
[production-customer-probe-2026-10-26.json](evidence/production-customer-probe-2026-10-26.json).

The existing `runAcceptance` implementation in
`scripts/verify-production-pilot.mjs` was called once successfully with explicit
write and paid-request flags and an injected fetch that mapped its fixed Railway
origin to the custom hostname. No production verifier, retry loop or recurring
paid healthcheck was added. An earlier attempt timed out during its initial
read-only release check; it never created an account or submitted an AI request.
Only that pre-write attempt was retried.

The successful run created synthetic account ID 4 using ordinary signup, then
verified normal login, account identity, saved-note persistence and export,
known-password change, rejection of the earlier session and a fresh login.
Forgotten-password recovery correctly returned assisted-only availability;
this did not exercise an operator or send an email.

One gateway POST returned a real **Gemini `gemini-3.8-flash`** reply matching a
fresh random challenge. Only its digest, provider and model were retained.
No private note/history, customer email or other customer data was attached to
the provider request. There was no client inference retry. The gateway's
existing separately reserved fallback behavior was unchanged; this successful
Gemini request does not independently exercise OpenAI generation.

The test notes were removed and their absence verified. The synthetic password
was changed to an unretained random value and its issued session rejected.
The synthetic account and throttle/budget records remain. No customer data,
database schema, runtime credential, merchant setting or spending cap changed.

## Provider evidence has separate levels

- Both provider startup metadata checks on deployment
  `37f2b28c-f58f-4827-8e6e-06c920922f8d` reported `metadata_accessible` at
  `2026-10-26T10:49:31.958Z`: Gemini `gemini-3.8-flash` and OpenAI `gpt-6-luna`.
- The later authenticated HTTP journey proves one Gemini generation on this
  release. OpenAI generation and fallback failure handling still need their own
  production evidence; do not force a provider failure or change routing to
  manufacture it.
- Provider invoices, actual token charges and durable-ledger reconciliation
  remain unverified. A reserved attempt is not an invoice amount. Keep
  USD 100/month total: USD 60 Gemini and USD 40 OpenAI.

## Confirmed client fixes

Regression tests reproduced the old client retaining an expired identity and
failing to recheck it when a suspended tab resumed. The shared customer provider
now ends the in-memory session at the token's expiry hint, capped at 24 hours.
Malformed JWT expiry hints fail closed; opaque tokens also receive the maximum
24-hour bound. This client hint is only for clearing UI state. Signature,
account activity and credential-version authorization remain on the server.

A timer plus focus, visibility and page-resume checks clear the shared identity.
An earlier account's timer cannot clear a newer session. The interface explains
that the session ended and offers the normal login route. It does not refresh
the token, persist it in browser storage or send an AI question automatically.

Chat, optional Notes and Omega clear the former account's data before the next
account is painted. Pending former-account replies cannot repopulate the view.
Chat clears consent, question, answer and reviewed history; a new account must
give fresh consent. Shared sign-in across tools in the same tab is preserved.

## Operational holds

The live public browser rendered Chat as the primary interface and the canonical
signup form with email, password and confirmation. The contact page is reachable
but publishes **no verified private support address**. Technical reports go to a
public GitHub issue; account recovery is limited to a pre-existing verified pilot
conversation. No support-delivery or real-person recovery acceptance is claimed.

Automated browser fixtures test desktop and iPhone-sized WebKit, signup into
Chat, a second account after logout, clearing prior content/consent, expiry and
reload behavior. These are local/CI fixtures, not physical iPhone/Android or
real-customer browser acceptance. The local browser runtime lacked OS libraries;
use the existing digest-pinned CI image for browser acceptance, and record the
exact commit's result before promoting the change.

Broad paid launch remains held on physical-device acceptance, verified private
support/recovery, actual provider-cost reconciliation, historical credential
review, a production-derived isolated restore, independent security review and
merchant/checkout/entitlement/refund acceptance. “Wait for CI” was still disabled
on Railway at the initial read; do not imply a platform setting was changed by
this code patch. Follow issue #202 for later deployment evidence.

Chat remains real AI text; Notes remain optional. No customer payments,
checkout, subscription grants, autonomous workers or new provider spending
allocation were activated.
