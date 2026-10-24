# Lean public startup — 24 October 2026

First performance slice for #229, coordinated with launch hub #202.

The global TRPCProvider previously loaded a query client/cache on every visit.
Build inspection showed THREE actual consumers: LabSimulatorPage,
SelfHealingPage and ExperientialEducationPage. The first candidate's blanket
removal was blocked by the new guard and was NEVER merged or deployed.

The corrected implementation wraps those three lazy routes with lazyQueryPage,
which downloads the page and its existing provider concurrently on first
render. Core REST-based screens no longer pay that startup cost. The original
provider, singleton query cache, query configuration, APIs and server security
boundaries are unchanged. Existing RouteLoadBoundary retains loading/error UI.
No custom prefetch, retries, API calls or feature activation are introduced by
the wrapper. Each frontend keeps its distinct routes and mirrored helper.

## Evidence gates

Startup Payload CI checks the canonical production Vite output: NO query
runtime in the complete static entry graph; existing query code is explicitly
reported in deferred chunks, not claimed removed. It enumerates direct query
consumers and rejects new unreviewed consumers. Real-context component tests
verify tRPC/React Query context, cache identity after remount, no eager page
load/network call and failure propagation without automatic retries. Source
checks require all three known pages to use the wrapper in both frontend trees.

Compare with pinned released revision `1e834c5fbbe42bed0444425db0e7cd0d2323fe65`
on the same runner with locked installs and the production Vite configuration.
The in-memory build measurement counts static imports once, reports raw and
per-file-gzip JavaScript sizes, entry CSS and deferred module count. It requires
at least 5% improvement in both JavaScript measures. Gzip is an equivalent build
metric, NOT measured network compression, mobile latency or Core Web Vitals.
Twelve pure tests cover missing evidence, cycles/shared imports, CSS, static
versus deferred query modules and unreviewed consumers.

Browser checks cover home/start/login/signup/plans/help at 320px without API
calls, script errors, overflow or persistent storage. Three deferred legacy
routes must render with an explicitly unavailable synthetic backend instead
of crashing from missing providers. All existing Chromium/WebKit/isolated-MySQL
acceptance remains required. This does not certify the legacy tools' product
claims or enable self-healing, AI, background execution or payments. Capability
labels are unchanged; that broader #229 work remains open.

Record actual savings, CI, reviewed merge, deployment and exact public revision
in #202/#229. No owner recovery, DNS/TLS, production-derived restore, incident
response, human accessibility acceptance or merchant readiness is claimed
resolved. No account, secret, mail, database, budget or billing edits.

References: https://vite.dev/guide/api-javascript ;
https://rollupjs.org/plugin-development/#generatebundle ;
https://trpc.io/docs/client/react/setup .
