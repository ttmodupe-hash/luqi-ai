# WebKit launch acceptance

The original desktop/mobile Playwright projects both use Chromium. A mobile
viewport alone is not Safari-engine coverage. The independent WebKit config
reuses the existing browser journey assertions with Desktop Safari and iPhone 13
device profiles, en-ZA locale and Africa/Johannesburg timezone.

The CI job builds locally from the locked dependencies and runs against a fixed
loopback preview server. It has read-only repository permissions, no provider,
merchant or production-database secrets, no remote-base-URL override, no automatic
test retries and bounded job/test timeouts. Network and account fixtures remain
synthetic. No production sign-in, payment, reset, note deletion or inference is
performed. Existing Chromium checks stay in place and must still pass.

Two existing tests inspect/reroute service-worker network traffic through APIs
that Playwright documents as Chromium-only. Those files remain in Chromium's
real-worker suite and are excluded only from this additional WebKit job. WebKit
runs with workers blocked. Do not present this as WebKit offline-cache evidence.

## Failures found and repairs

The initial run found recording availability and manual failed-import recovery
cases. Both studio copies now probe canvas capture and supported recording types
without opening a stream. Unsupported recording is disabled before a click and
explained; editable scenes and storyboard/subtitle/script downloads remain usable.
Chromium still must prove native recording support and cancellation. An additional
forced-missing-recorder case verifies actual script download contents without a
fake video. A codec report is not proof that a completed export will succeed.

At head b1afc354, run 40070918289/job 120803953249 passed 72/74 journeys.
Only desktop/iPhone manual reload after a failed lazy import remained red. The
same job ran controlled local A/B builds: module preload enabled + reload failed
with one asset request; preload disabled + reload recovered with two requests.
Changing the document query alone did not fix the preloaded build. An explicit
pre-fetch recovered but required a third request. These observations do not prove
an upstream root cause or identical behaviour on a physical iPhone.

Both Vite build configurations therefore set modulePreload:false. Native lazy
imports and separately emitted CSS remain; optional JavaScript dependency
preloading is disabled. This may add dependency-fetch round trips when opening
some tools. No universal speed improvement is claimed. There is no automatic
reload, account/provider resubmission, cache deletion or new recovery URL.

The temporary diagnostic is removed from the release tree and remains available
in Git history. A permanent guard resolves the real root build configuration and
checks its emitted module entry, separate tools and studio CSS, plus an explicit
standalone-config source guard. This guard is not a browser test: the unchanged
aborted-download recovery assertions and a new no-store HTTP 503 recovery case
must pass on both Chromium and WebKit. The full browser suite also retains
on-demand loading, CSS/layout, navigation and no-write/consent checks.

## Evidence and limits

The final pull request and #202 record actual run IDs, failures repaired and the
final tested commit. A configured workflow alone is not a passing result. A red
job must not be relabelled as accepted. Ubuntu 24.04 is pinned for the locked
Playwright version; no dependency or browser version is silently upgraded.

These are Linux-hosted WebKit automation results, not the Safari application on a
physical iPhone, a VoiceOver audit, App Store acceptance or a human usability
review. Native video codec/export and installed-PWA behaviour still require real
Apple-device testing. They do not close backup/restore, historical credential
review, private support, domain, provider-billing or merchant-launch requirements.

Run after npm ci and npm run build:

```sh
node scripts/verify-module-loading.mjs
npx --no-install playwright install --with-deps webkit
npx --no-install playwright test --config=playwright.webkit.config.ts
```

Primary documentation:
- https://playwright.dev/docs/browsers
- https://playwright.dev/docs/service-workers
- https://playwright.dev/docs/test-configuration
- https://v7.vite.dev/config/build-options
