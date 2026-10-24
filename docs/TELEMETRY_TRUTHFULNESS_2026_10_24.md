# Telemetry truthfulness — 24 October 2026

## Verified code defects

The `/telemetry` and `/super-core` page previously substituted 42 executions,
1420 ms latency, 1.15 attempts, zero failed cycles and 100% success when its
restricted tRPC telemetry query returned no data. It polled that unavailable
procedure and offered an autonomous refinement form even though the production
pilot does not authorize that execution path. These were UI claims, not proof
that workers executed or that a server authorization boundary was bypassed.

Two separate historical HTTP handlers also returned unverified results:
`/api/system/diagnostics-ledger` always returned an empty successful error list;
`/api/v1/intelligence/corporate-report/:dept` returned fixed competency/pass
figures and certification wording after an administrator-key check. Neither
handler consulted measured diagnostic or assessment records.

## Repair

Both frontend copies now reuse the existing validated, read-only readiness
component. Missing measurements remain explicitly unavailable. The page makes
no autonomous RPC, periodic poll, execution, payment or private-account request.
Readiness is fetched without credentials; refresh is explicit. Existing text
trial, notes and getting-started links remain available. Readiness is not proof
of successful AI replies, absence of errors, secure operations or recovery.

The two historical HTTP reports now return the existing fixed 503/no-store
`LEGACY_OPERATION_UNAVAILABLE` response for all methods before the legacy
handlers. This is independent of configured admin/provider keys and does not
inspect or echo caller input. A future report needs reviewed authorization,
measured persistent results and explicit unavailable/error states before being
restored. The private notes and budgeted AI entrypoints are unchanged.

## Evidence and limits

Unit checks cover observed/degraded/unavailable readiness, removal of stale
observations after failed refresh, no polling, no synthetic KPI fallback,
source parity, every HTTP method on both report paths, handler ordering and
preservation of reviewed routes. Browser checks exercise both page aliases at
320 px in the existing Chromium and WebKit suites, using synthetic readiness
responses and blocking non-readiness API calls and external traffic.

Actual outcomes and release revision belong in the PR and issue #202; adding a
test is not a passing result. A successful build does not clear the independent
historical credential, production-derived restore, provider-cost, private
support, domain or merchant requirements. No real provider call, database/schema
change, secret rotation, DNS operation, paid activation or worker enablement is
part of this repair. The existing $100/month allocation remains unchanged.
