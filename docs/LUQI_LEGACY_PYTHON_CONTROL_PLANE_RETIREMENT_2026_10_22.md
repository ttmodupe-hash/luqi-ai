# P0: Retire unauthenticated Python billing, login and control-plane routes

**Status:** Draft release gate. Source-level fixes are NOT running in production until a separately verified deployment. No existing customer database has been accessed, merged, migrated, credited, debited or deleted.

## Why the existing Python APIs were unsafe

The former `backend/async_job_routes.py` exposed a combined FastAPI router under BOTH `/api/v1` and `/v1`. It accepted caller-controlled email addresses for wallet access and task charges, manual token top-ups, webhook JSON without credible provider-signature verification, admin/HITL decisions based on caller text, an unbudgeted companion Gemini API call, and other side-effecting agent tools. The legacy SQLite wallet had an unprotected promotional credit seed, process-local balance cache, non-atomic deductions and suppressed database write errors. A PayFast test bypass defaulted to enabled, while the Stripe processor granted credits based only on JSON fields. Route mounting and source code constitute a credible design risk; **we have not verified which of these routes are reachable in live production**.

Additionally, `main.py` implemented a legacy login handler that returned a bearer token even for invalid credentials; its separate unsigned Stripe handler saved fabricated payment records, its video compile route returned a made-up asset URL, and its self-optimize endpoint claimed changes without executing them. This must not be presented as authenticated identity, paid invoices, rendered videos, or successful agent upgrades.

## Safe response: irreversible-by-config retirement, migration later

- Global FastAPI dependency `require_legacy_route_disabled` unconditionally raises HTTP 503 with `LEGACY_API_RETIRED`. It covers EVERY endpoint of the old combined Python router under both prefixes, not just payment paths. There is **no environment variable, role string, token or demo mode that bypasses** the dependency.
- Direct legacy `main.py` register, login, unsigned Stripe, admin billing ledger, fake video compile, and self-optimization endpoints also use the same guard and never directly fabricate a success response.
- `token_billing_gateway.py` is a non-mutating compatibility facade. Its old method names raise `LegacyBillingDisabledError`, and `verify_payfast_signature` always refuses; no fake payment acceptance, default free wallet credit, SQLite table creation or failed-write success.
- **No historical SQLite data was erased.** The new Node/MySQL owner-scoped billing implementation is separate and must never silently reinterpret/import old balances.
- `tests/test_legacy_python_billing_quarantine.py` verifies forged webhook data, arbitrary customer IDs, fake admin credentials, fastapi dependency gate before side effects, both router mounts, direct legacy `main.py` guard declarations, and absence of fabricated login/payment/media/optimization success.
- A Python 3.10 / 3.11 / 3.12 GitHub workflow runs the tests with fake test-only credentials. No web requests to payment providers, databases, Railway or Google Cloud.

## Explicit functionality impact

This **deliberately disables ALL endpoints of the old Python `async_job_routes` router**, including legacy chat, sensing, HITL and background jobs, until each is separately migrated with verified session ownership, rate and token budgets, provider signatures, private storage, durable queue and rollback semantics. This does NOT imply the newer Node app's chat, payment and agent routes are disabled. Before any deployment, identify which frontend clients still rely on these Python URLs and provide compatibility updates or reject the release.

Even fully green offline CI does not establish that an externally exposed legacy Python app has been protected. Staging must test the exact serving application and routes (including aliases), then production traffic must be switched under an approved rollback plan.

## Acceptance gates

1. Verify the selected LUQI deployment topology, and whether `main.py` is publicly served at all. Treat the code risk as urgent if confirmed.
2. Inventory API consumers and existing historical SQLite ledgers. Back up files, verify no user balances have been changed by this draft, and do not apply cross-platform financial migration without explicit authorization.
3. Review the existing Node/MySQL payment service for signature verification, origin, idempotency and ownership across staging; confirm any public provider callbacks have matching real provider configuration and expected HTTP responses.
4. Run dedicated Python regression and integrated Node/Python/MySQL/edge/production-container test suites on an exact candidate commit. Staging smoke-test genuine login rejection, payment denial and protected redirects.
5. Secure all independent production auto-deploy paths before merging anything to `main` (issue #104 / PR #100).
6. Merge and deploy only under approved change management and with a rollback plan; the Railway connector access issue is independent.

**No live payment processor, credentials, DNS or environment has been changed by this draft.**
