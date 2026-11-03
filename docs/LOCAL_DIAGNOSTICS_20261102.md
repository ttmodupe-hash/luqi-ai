# Luqi local-first opt-in performance diagnostics

Status: review candidate only. No background telemetry uploads or new analytics database.

## Measured path
1. A tester opens /telemetry and explicitly enables the checkbox. It is off on fresh tabs and reloads.
2. The public WorkspaceLayout counts coarse route categories and interactive control activations. It never reads target text, URLs, form values, passwords, cookies, identity, GPS or raw click histories. The separate admin portal is not instrumented.
3. Existing guest and signed-in AI fetch transports retain their exact request options, timeouts, non-retry and spending guarantees. The optional wrapper counts only endpoint category, HTTP outcome, transport failure and elapsed time.
4. Browser PerformanceObserver samples LCP, CLS and long tasks in the opted-in tab. The public shell reuses its existing calm-motion mode when real performance measurements show strain. This does not reorder content or mutate service-worker caches.
5. Measurements cap at 2,500 events per tab. Disable/clear/reload resets everything. No localStorage, sessionStorage, IndexedDB, cookies, sendBeacon, WebSocket, analytics POST or database table are added.

## Safe predictive loading
After opt-in, focusing the homepage goal field may preload only the fixed local /ask code module. It does not include user text. The prefetch is suppressed when offline, data-saver is on, reported memory is low, or measured rendering is strained. No automatic AI calls occur.

## What this is not
- Counts are per tab; they are NOT unique visitors, verified pilot conversion rates, provider invoices, or platform-wide request totals. Existing Railway HTTP metrics remain the server-side source of status and latency data.
- A future server telemetry service must be separately authorised, privacy-reviewed and tested with strict allowlists, retention, aggregate suppression, abuse control, operator access and deletion.
- Backend adaptive rate limits remain controlled by existing guest quota and AI spend policies. This client diagnostics PR never increases caps or retries an ambiguous paid POST.
- Immutable business event sourcing, schema changes and background index creation are not needed for local diagnostics. Any durable ledger or migration requires measured database workloads, a restoration test and a rollback.

Release gates: unit tests local-diagnostics.test.ts and local-diagnostics-dashboard.test.tsx, existing telemetry-truth regression tests, browser-tests/local-diagnostics.spec.ts at 320px and full mirrored root/app frontend parity. Browser CI does not replace physical phone/PWA acceptance.

## Bounded in-tab latency tail
- Named endpoint timings accumulate five fixed buckets (<=250ms, <=1s, <=3s, <=10s, <=60s). The displayed p95 is the ceiling of the 95th-percentile bucket, NOT an exact percentile, account-wide measure or global SLO.
- No raw per-request data, form values, timestamps or identifiers are retained; existing 2,500-sample cap and disable/clear/reload reset continue to apply.
- Do not self-adjust backend quotas, billing, eviction policies, database schema or auto-index from per-tab opt-in telemetry. Such changes require validated aggregate server metrics, data minimisation, independent security review, rollout/rollback testing and owner authorisation.
