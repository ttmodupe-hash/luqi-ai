# Moon homepage loading correction and acceptance

The original Moon PR added the complete lunar model to the static homepage import graph. The existing Startup Payload job rejected that candidate (512,867 raw / 153,466 gzip startup JS bytes against its historical 529,636 / 155,514 baseline; the unchanged guard requires at least 5% reduction in both).

This correction preserves Home.tsx and its visible Moon placement. MoonNowPanel becomes a small lazy-loading/error boundary. The original calculation, location controls and styling move byte-for-byte to MoonNowContent, which is downloaded automatically when the homepage renders. This reduces the static startup graph, not necessarily the total data transferred after the Moon loads. No claim of measured network latency improvement is made before profiling. The old performance thresholds and baseline are unchanged.

A delayed or failed download affects only the Moon panel. No fictional phase is substituted, no automatic page reload is performed and no account/provider request is introduced. Manual reload explicitly warns about unsaved work and in-memory sign-in. Existing calculation and location tests now import the unchanged content; new tests cover the entry boundary, preserved surrounding draft, rejection privacy and explicit-only reload.

The dedicated workflow builds the real frontend and exercises Chromium/WebKit at 1366px, 390px and 320px. It also deliberately fails the actual emitted Moon chunk, checks the homepage tool search still works, removes the synthetic failure, and tests the user-requested full reload. Every API write/external request is blocked before transport; this is non-production browser acceptance, not physical-device or live-PWA certification. Screenshots and a revision-labelled report are retained. Numerical accuracy expansion remains a separate acceptance item; no original numerical tolerance or test is weakened.

This change is on the existing PR branch only. No production deployment, service flag, secret, database, budget, DNS or payment change is made. Actual checks must be inspected before asserting completion.
