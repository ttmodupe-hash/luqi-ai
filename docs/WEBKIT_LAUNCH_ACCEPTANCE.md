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

## Evidence and limits

The final pull request and #202 record actual run IDs, failures repaired and the
final tested commit. A configured workflow alone is not a passing result. A red
job must not be relabelled as accepted; retain its evidence and fix or explicitly
track the cause before merging.

These are Linux-hosted WebKit automation results, not the Safari application on a
physical iPhone, a VoiceOver audit, App Store acceptance or a human usability
review. Native video codec/export and installed-PWA behaviour still require real
Apple-device testing. They do not close backup/restore, historical credential
review, private support, domain, provider-billing or merchant-launch requirements.

Run after npm ci and npm run build:

```sh
npx --no-install playwright install --with-deps webkit
npx --no-install playwright test --config=playwright.webkit.config.ts
```

Primary documentation:
- https://playwright.dev/docs/browsers
- https://playwright.dev/docs/service-workers
- https://playwright.dev/docs/test-configuration
