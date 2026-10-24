# Production learning-lab framing repair — 24 October 2026

## Source-established defect

The main frontend embeds biology, chemistry, algebra and geometry HTML documents
from `/labs/` in iframes. `api/boot.ts` unconditionally applies `X-Frame-Options:
DENY` to their production responses. DENY blocks even same-origin embedding;
the existing Vite-preview browser suites do not reproduce the Node server's
headers. A file existing and a green preview test therefore do not prove that
its embedded production route is usable. Direct live inspection was unavailable
from the working container; no claim of a measured live-browser failure is made.

## Narrow repair

The outer HTTP response policy now applies exact-path, successful-HTML framing
rules AFTER the existing inner security-header middleware. Only GET/HEAD 200
HTML responses at the four currently embedded lab paths use SAMEORIGIN plus
CSP `frame-ancestors 'self'`. No directory wildcard or caller-selected origin is
accepted. All other responses, including the main account shell, private APIs,
unknown/error documents and the unreviewed static physics file, use DENY plus
`frame-ancestors 'none'`. Existing CSP directives are appended to, never erased.
Existing private no-store rules, authentication and provider budgets are intact.

This does not enable AI tutors or certify the teaching content, scientific
accuracy, all accessibility requirements or physical-device support. The
standalone app/src entrypoint's distinct route catalogue is not expanded.

## Required executed evidence

Unit tests cover the allowlist, method/media/status failures, hostile lookalike
paths, downstream middleware ordering, CSP preservation and private caching.
A dedicated browser suite starts the BUILT production server and a loopback-only
foreign-origin parent, without database or provider credentials. It exercises
the four real embedded routes, algebra slope/reset interaction, foreign-origin
lab/account refusal and same-origin account-shell refusal under desktop/mobile
Chromium and desktop/iPhone-sized WebKit. These are synthetic automated tests.
A push-only release check additionally verifies the exact live revision before
and after five unauthenticated document/header checks. Record actual CI,
revision, deployment and public results in #202 before claiming release success.

No data migration, account reset, recovery-mailbox verification, DNS/mail change,
merchant activation, paid AI or monitoring-schedule change is involved. Existing
operational and commercial launch holds remain separate.

Primary design references consulted:
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
