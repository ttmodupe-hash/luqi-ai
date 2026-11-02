# Optional tool loading — 24 October 2026

## Scope and safety

PR #210 defers optional tool code in the web and standalone routers. Core
workspace, account/AI trial, notes, Omega history, getting-started and help pages
remain eager. Existing route aliases and iframe destinations are retained;
loading a tool does not enable its unavailable backend or bypass authorization.

Mirrored Suspense/error boundaries show a loading announcement or a fixed error,
with navigation retained in the normal workspace. No automatic reload, paid
request or replay occurs. Manual reload explains that unsaved text and in-memory
sign-in are cleared. The boundary resets on pathname changes so a failed tool
does not trap navigation or retain a previous route's private view. Its UI does
not echo errors; this is not a claim that React/browser diagnostic consoles never
log underlying errors. Admin's existing special layout remains unchanged.

## Measured candidate evidence

Initial Mobile Loading run 40065890039, job 120788939149, measured:

| Initial JavaScript | Eager router | Deferred router | Reduction |
|---|---:|---:|---:|
| Minified raw bytes | 1,079,881 | 521,828 | 51.68% |
| Deterministic gzip estimate | 293,526 | 153,836 | 47.59% |

The build comparison uses the same current source and locked dependencies,
swapping only the baseline root router from revision
`8be7570a59d1325c18d3b9d5b34c4dc6c8b58d6a`. The manifest traversal includes every
initial static JS dependency, not just the smallest chunk. It verifies physics,
studio and academy entry modules are deferred and that the existing public
release observer's core-code markers remain in the initial entry.

This is not measured connection latency, total app size, Safari/device testing,
or a claim that CSS, images and later selected-tool downloads disappear. The
entry still exceeds Vite's 500 kB advisory; the warning was not suppressed.
Future intentional router changes require reviewing the pinned inventory and
comparator rather than weakening them to produce an artificial improvement.

## Regression coverage

The contents-read-only CI runs 13 graph/parity checks and five offline component
loading/recovery cases, strict boundary compilation, preserved route inventories
and the bundle comparison. Existing web, container, MySQL and dependency checks
remain independent. Real-browser fixtures run in both desktop and mobile
Chromium layouts, not a physical phone or native Safari.

An initial browser fixture incorrectly looked for a heading containing
"pendulum" instead of the actual "Experiential STEM Physics Laboratory". After
correcting that selector, request-count checks exposed service-worker traffic
that page-level interception cannot see. The cold transport-failure fixtures
therefore explicitly block service workers; a separate test explicitly enables
the real worker, confirms control and an empty physics cache, goes offline,
verifies an uncached tool failure and navigation escape, and returns online for
user-initiated recovery. Assertions were retained rather than accepting missing
request observations as proof of deferred loading.

Playwright's documented distinction:
https://playwright.dev/docs/service-workers
https://playwright.dev/docs/api/class-page#page-route

Final-head CI and exact-revision production checks must pass before this candidate
is called live. Record actual final run/deployment IDs and limitations in #202.
No database/schema/credential changes, live inference, provider-budget change,
customer checkout, worker activation, DNS change or new hosting resource is part
of this change. The owner requested dashboard-only work be parked while on mobile;
those operational launch gates remain open, not silently completed.
