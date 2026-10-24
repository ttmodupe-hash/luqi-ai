# Database-backed WebKit account acceptance — 24 October 2026

## Scope

This is independent of the WebKit UI/recorder work in PR #213. It does not
replace that branch, change its configuration, or imply its failing journeys
have passed. The starting main revision includes #214's output-integrity fixes.

The new job runs the existing `mysql-browser-tests/first-user.pw.ts` assertions
against the real compiled Node application and disposable MySQL 8.4. No API
response mocks are used. Both desktop and iPhone-sized WebKit projects exercise:
registration, stored notes across reload/sign-in, selected and full notes JSON
exports, confirmed owned-conversation deletion, duplicate signup, known-password
change, old-password rejection and preserved notes. Outbound browser requests
are denied by the existing fixtures. No production account or provider is used.

## Safeguards

The new config imports `playwright.mysql.config.ts`, preserving its exact
loopback database URL, fixture flag and GitHub-Actions guards, the compiled
server, table-restricted runtime identity, one-worker execution and zero retries.
It additionally refuses the browser-base-URL override. Chromium launch settings
are explicitly cleared before selecting WebKit. Locale is en-ZA and timezone
Africa/Johannesburg. Five collection tests prove the intended refusal messages
and both layout collections; collection starts no server/browser/database work.

The contents-read-only workflow uses pinned Actions and locked dependencies,
disables install lifecycle scripts, persists no git credentials, has bounded
job/browser-install/test times and retains synthetic evidence for seven days.
AI generation, credential probing and Omega intake are disabled in the fixture.
There is no scheduled or recurring paid production acceptance call.

## Evidence and limits

Final checks and exact revisions belong in the PR and #202. Configuration is not
a pass; the original assertions must run and pass before accepting this work.
The existing Chromium suites remain unchanged. Linux WebKit is not branded
Safari on a physical phone, VoiceOver, installed-PWA/offline-cache acceptance,
native codec testing or a human support/recovery review. Workers are blocked
because Playwright's worker inspection/routing support is Chromium-only.

Disposable MySQL tests do not verify Railway's actual backups, restore a
production-derived backup, rotate old credentials or reconcile provider invoices.
No production database/schema/account/credential, provider allowance, DNS,
merchant checkout or autonomous worker is changed by this patch. The approved
$100/month allocation ($60 Gemini/$40 OpenAI) remains unchanged.

References:
- https://playwright.dev/docs/browsers#webkit
- https://playwright.dev/docs/service-workers
