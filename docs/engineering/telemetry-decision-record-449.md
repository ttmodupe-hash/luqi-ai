# LUQI telemetry decision record (PR #449)

Status: **proposed / in review**, not production deployment. Owner approved proceeding with a bounded, privacy-conscious engineering implementation on 2 November 2026.

## Established boundaries
- **One platform:** KHORO is a capability inside Luqi, using the existing customer session and login.
- **Stack observed in repository:** Vite/React + TypeScript in `src` and `app/src`; Hono API in `api`; Railway is the deployment target. Both frontend entrypoints must remain byte-identical.
- **Server telemetry already exists:** `api/lib/httpSafety.ts` generates request IDs and measures registered request patterns and status, without URL parameters, bodies or exception strings.
- **Observability truth:** `src/pages/TelemetryDashboardPage.tsx` must not advertise server-wide latency or error counts without verified collection. Local measurements are always explicitly labelled.
- **No new third-party analytics, queues, databases, paid inference, secrets, supplier accounts or production configuration changes in this PR.**

## ADR-001: Opt-in, on-device event aggregation first
- Alternative rejected: automatic full-session behavioural tracking, raw clickstream, or recording typed input.
- Decision: no observers or event capture until browser-local consent. A strictly typed registry accepts only fixed metric names and safe outcome classes. No transport.
- Implementation: canonical `src/lib/uiTelemetry.ts`; alternate app frontend re-exports this module through `app/src/lib/uiTelemetry.ts`.
- Loading: `src/main.tsx` and `app/src/main.tsx` conditionally and dynamically import diagnostics only for a previously opted-in browser.
- Revocation: clear in-memory aggregates and disconnect listeners and observers. Storage errors fail closed.
- Limits: bounded metrics and values; no stored user identifiers or free-text attributes.
- Browser compatibility: unsupported Web Vitals are **unavailable**, not zero.

## ADR-002: Evidence before autonomous optimisation
- Existing request telemetry remains the source of backend per-request status logging.
- UI measures specifically declared Tender Desk actions and source-check latency, and readiness checks.
- CLS uses the largest session-window score (dimensionless); LCP is best-effort and must not reconstruct pre-consent activity. INP is not yet measured.
- A later real aggregation endpoint requires separate security, POPIA/lawful-basis, retention, sampling, access and rate-limit reviews, with no silent opt-in or production deployment.
- Self-optimisation may suggest or test **reversible** caching and layout changes. No automatic schema changes, behavioural profiling, production rewrites, or tender publication.

## Release gates
1. Frontend entrypoint parity, all TS builds and tests pass; Web Build and Startup Payload measured, not bypassed.
2. Privacy/consent, no-telemetry/offline, old browser, keyboard and slow/mobile scenarios validated.
3. Human-reviewed branch and merge; confirm deployed Railway commit SHA, release identity and production smoke tests separately.
4. Monitor failures and performance against a release baseline. Roll back app to last known-good commit if any regression; do not roll back incompatible DB schema since none is introduced.
5. Until verified, dashboard and owner report clearly state *draft / merged / deployed* independently.

## Engineering continuation
See launch #202, frontend telemetry PR #449 and existing security/reliability work. Do not create duplicate telemetry collectors or competing persistent user profiles.
