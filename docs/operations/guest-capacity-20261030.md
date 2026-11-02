# Public guest trial capacity and release gate — 30 October 2026

## Capacity and costs

Three replies per visitor means 3,000 attempts for 1,000 visitors using the full allowance, not three users. Attempts include failed/ambiguous calls. This does not promise 1,000 simultaneous connections or guaranteed three successful answers each.

The old shared limits are 12/day, 100/month: 33 complete trials plus one reply each month. At its deliberately padded 10 cents per attempt, merely increasing the count to 3,000 would reserve USD300 and crowd out registered users.

The new, separately gated `public-1000-v1` profile permits 3,000/day and 3,000/month, 3/visitor/calendar month, 60 globally/minute, 300/network/day. A 1,000-visitor launch spread over distinct networks needs at least 50 minutes at the burst ceiling. A school, office or carrier NAT can hit the shared network allowance after 100 complete trials; registration uses the independent account allowance. Distributed bots can still exhaust the USD30 guest allocation: these are layered damage limits, not proof of unique human identity. Add an accessible challenge/step-up and trusted proxy verification before any larger acquisition campaign; do not silently fingerprint users or collect identity documents.

Google Gemini Developer API standard text rates checked 30 October 2026:
https://ai.google.dev/gemini-api/docs/pricing
Model: `gemini-3.8-flash`. USD0.75/million input and USD3.75/million output including thinking, through 31 December 2026. Published January 2027 rates: USD1.50 / USD7.50. No grounding, tools, media, cache storage, fallback or automatic inference retry.

The expanded route reserves one cent durably **before** counting or generating. It then counts the complete system instruction plus user/history via countTokens; absent/invalid/>4,096 input tokens stops generation. Output remains capped at 512 tokens. Token counting is not generation; a failed preflight still retains its reservation. Character limits alone are never treated as tokenizer guarantees, especially for African languages.

| Scenario | Per attempt | 1,000 visitors × 3 attempts |
|---|---:|---:|
| Illustrative 1,000 input + 300 billed output tokens, current rates | USD0.001875 | USD5.625 |
| Bounded 4,096 input + 512 output tokens, current rates | USD0.004992 | USD14.976 |
| Same bounded tokens at published January rates | USD0.009984 | USD29.952 |
| Durable reservation, not invoice | USD0.01 | USD30.00 |

These exclude taxes, currency conversion, hosting and calls made outside this application. Provider usage/invoices must be reconciled; a reservation ledger is not a provider-enforced hard billing limit. If model, pricing, output/thinking semantics or tools change, stop rollout and review bounds. USD30 remains within the existing USD165 Gemini allocation; USD135 OpenAI and USD300 total are unchanged. Registered traffic may consume the shared provider headroom first. No additional budget is requested. Existing pilot attempts are conservatively carried into the new USD30 guest ledger at ten cents each, reducing transition-month capacity (e.g. 100 prior pilot attempts leave USD20, or 2,000 new attempts).

## Durable accounting and privacy

All successful reservations lock the global monthly row, daily row, visitor row, network and minute rows, guest cost row, then the provider spend row, in one InnoDB transaction. Commit must succeed before any provider call. No refunds after ambiguous calls. Database errors fail closed. Switching profiles or restarting replicas never resets current-month counters. The new cost counter is lazily initialised under the month lock; no schema migration or runtime permission expansion.

Visitor cookies are random capabilities, HttpOnly, SameSite=Strict, Secure in production. New cookies include a signed 30-day expiry checked on the server. Legacy cookies are upgraded during pilot GET; expanded POST accepts only expiring cookies. A visitor who never refreshed during migration may receive a fresh identity once. Deleting cookies/devices can also create new identities; network and global controls bound this, not identity claims.

Railway documents X-Real-IP as its remote-client header:
https://docs.railway.com/networking/public-networking/specs-and-limits
Expanded mode requires explicit proxy trust and rejects missing/malformed addresses; it never uses client-controlled X-Forwarded-For chains. Verify actual header overwrite and origin reachability before setting proxy trust; an attacker-provided header is not trusted merely because it is named X-Real-IP. Cloudflare or another upstream may cause shared-network false positives; verify the customer-domain path.

Only keyed daily network identifiers are stored (separate namespace from guests); no raw IP, browser fingerprint, email, account or transcript in the guest ledger. The short transcript stays in tab memory and is sent to Google only on explicit user Send/consent. No automatic signup transfer. Web/proxy/provider logs have their own retention; audit them and do not promise that this code deletes provider logs. The operator cleanup utility removes pseudonymous guest/network/burst counters older than 62 days, preserving positive account counters and aggregate cost rows. It uses operator privileges, never expands the runtime role. Schedule it daily before expanded rollout and verify execution; backup retention/deletion remains separately governed.

## Release and activation gates

1. Require all checks on the exact PR head, including real MySQL concurrency, 3,000 reservations and rollback tests, browser consent/three-turn flow and source parity. Synthetic tests must never call a paid provider.
2. Merge only after checks pass; observe Railway SUCCESS for the merged commit and verify `/v1/release` on both customer domains. A branch or merge alone is not deployment.
3. Keep `LUQI_GUEST_CAPACITY_PROFILE` unset/`pilot` during release verification. Do not change budget triplet or existing guest enabled flag.
4. Reconcile actual model usage/charges and provider request/token-per-minute quota, validate countTokens plus output semantics with a bounded real canary, verify trusted proxy behaviour, and establish daily cleanup. Verify mobile customer consent, complete useful response, remaining count, expiry, exhaustion, cookie restrictions and account handoff. Never advertise 1,000 simultaneous users based on accounting tests.
5. Only then set `LUQI_GUEST_TRUST_RAILWAY_PROXY=true` and `LUQI_GUEST_CAPACITY_PROFILE=public-1000-v1` in a controlled rollout. Verify terminal deployment SUCCESS, effective profile and a bounded real guest request, plus a denied request with no spend. Pause immediately on billing mismatch or elevated failures.
6. Roll back capacity via `LUQI_GUEST_CAPACITY_PROFILE=pilot`, or pause inference with `LUQI_GUEST_CHAT_ENABLED=false`; do not delete/reset counters. If historical guest spend exceeds USD10, rollback to pilot will intentionally pause further guest spending.

## Production baseline observed during implementation

Railway web service `a9b293e0-1966-43be-80ef-3dd27acc6ab7`, project `kind-spontaneity`, production environment, latest deployment `6b9af07f-6485-4267-a3e0-a8a91bc8463b` reported SUCCESS. Customer `/v1/release`: `71c03b9866c29ffd4f555c26f779f373553e8bd5`.

A fresh unauthenticated cookie visit reported enabled=true, remaining=3. An explicitly requested small-business explanation returned HTTP200, Gemini `gemini-3.8-flash`, a complete answer containing the requested verification word “sunflower”, remaining=2. This proves the existing pilot was active and answered; it does not verify the new profile, a physical customer device, provider invoices or 1,000 simultaneous customers. Connected Railway OAuth exposes variable names, not values; no secrets were read or printed.
