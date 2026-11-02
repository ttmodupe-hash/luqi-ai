# Luqi prototype review and Space & Science implementation

Reviewed: 1 November 2026. Baseline: `df1365c45576ea5c525ca5a8954e74cd0b10bfc2`.

## Decision
The owner's 1,061-line React prototype is the development brief, not a production replacement. Keep Luqi as the customer-facing product, including KHORO, with the existing account, consent, provider budget and service routes. Do not install its standalone App, browser Gemini transport, fabricated fallback or global thread storage. A concurrent implementation already exists in PR #392 for Luqi Motion Studio and deterministic subnet/VLSM learning. This change complements that PR with the missing Space & Science capability; it does not take credit for or overwrite that work. The Moon tracker remains separately tracked in #389.

## Findings in the supplied file
These are source-inspection findings, not claims about the current deployed application.

| Location | Finding | Required treatment |
|---|---|---|
| 75–232, 577–1030 | Nineteen registry entries, but only hero, space hub, CCNA lab, motion tab and launcher render. Many selections produce no content; subsection choices are ignored. | Use existing tested Luqi routes and derive catalog counts. No blank buttons or blanket active badges. |
| 385–438 | Empty-key browser request, hardcoded preview model, weak response checks and unrelated CCNA prose after any error. No real secret is present in the upload. | Preserve Luqi's server-side authenticated/consented transport, real failure states, explicit retries and account isolation. Never put a real provider key in this client. |
| 388–424 | Eight recent turns are transmitted; source metadata is labelled live/verified without independent verification. | Bound and deliberately approve context. Review provider citation schema and search-display obligations separately; a grounding link is not factual certification. |
| 314–335, 572 | Reads one unscoped browser storage key without schema validation; no write-back exists. Browser Memory: Active is unsupported as persistent memory. | Retain existing account-bound workspace; separately review opt-in saved history. Do not restore arbitrary shared-browser conversations automatically. |
| 875–892 | IPv4 mask hardcodes first three octets to 255; wrong below /24. No input address for a network/broadcast calculation; /31 and /32 excluded. | Existing PR #392 addresses full prefix arithmetic, special /31 semantics and VLSM. Test exact examples and malformed inputs. |
| 913–922 | One recognized CLI command; other commands merely echo again. | Label practice simulation and unsupported commands honestly; do not suggest real router execution. |
| 304–311, 942–1004 | Timer advances every 50 ms (20 ticks/s), while button says 60FPS. Stage is text only, with no rig renderer or export. | Use the actual SVG rig/keyframe implementation in #392, and distinguish pose/project export from rendered movie/audio. |
| 135–140 | Encryption claims without encryption/key exchange/storage implementation in this file. | Do not certify E2EE from a badge or hash. Keep reviewed Luqi security boundaries. |
| 258–286 | Custom markdown escapes angle brackets before adding markup, so this is not evidence of a demonstrated XSS exploit. It is an incomplete renderer without real structured source links/code semantics. | Prefer existing tested rendering; keep untrusted content escaped and links allowlisted. |
| 697–719, 358–364 | Regional labels blend jurisdictions; language choices do not demonstrate translation quality; speech has no selected language and is truncated. | Country-specific legal sources and reviewed language behavior, no blanket legal/voice capability claim. This change does not revalidate laws or launch certified grading. |
| 800–843 | Space hub has three unsourced static cards, no feed; HartRAO and SANSA operations are conflated. | Separate original publishers and offer working, bounded educational activities. |

## Implemented here
A lazy `/space-science` page in both existing frontends, discoverable through Luqi's current workspace search. Six original-source cards cover MeerKAT, SKA-Mid, SARAO HartRAO and SANSA's operations, space science and Earth observation programmes. Search and category filters combine, with a working empty-state reset.

Two deterministic browser-local experiments calculate radio wavelength (`lambda = c/f`) and ideal signal delay (`t = d/c`; ideal round-trip `2t`). Frequency units are explicit, complete-decimal validation rejects partial/NaN/infinite/exponent inputs, and invalid inputs remove prior results and disable export. Examples are assumed paths, not live celestial positions. No antenna gain, reception forecast, orbital prediction or mission advice is implied.

Three original practice questions use actual selected answers, bounded feedback and reset. Rechecking a question does not inflate a score. A plain-text study notebook includes calculated values, assumptions, review date and original URLs. Download feedback says requested, not that the operating system saved it. Object URLs and timers are cleaned up. Internal section links prevent default hash changes and move keyboard focus without replacing Luqi's hash-router location.

No accounts, provider calls, local storage, sensors, tracking embeds, third-party pictures or new packages. The calculations are educational; source links open only by user action. Existing contact dock, guest access and private notes remain untouched. The mobile route-preservation allowlist adds only this route; every older route and performance threshold remains required.

## External verification and provenance
The uploaded prototype does not establish the facts below. The following public primary pages were reviewed separately on 1 November 2026; their own publication dates vary. Page retrieval is not live equipment verification.

- SARAO instruments: https://www.sarao.ac.za/about/telescopes-and-instruments/ — published MeerKAT description.
- SKAO: https://www.skao.int/en/explore/telescopes/ska-mid — 197 dishes is the design total, not a live commissioned count.
- SARAO HartRAO: https://www.sarao.ac.za/about/hartebeesthoek-johannesburg-observatory/ — publisher/facility identity and geodesy.
- SANSA: https://www.sansa.org.za/programmes/space-operations/ — tracking, telemetry and command programme, distinct from HartRAO.
- SANSA: https://www.sansa.org.za/programmes/space-science/ — Hermanus programme and space-weather service.
- SANSA: https://www.sansa.org.za/programmes/earth-observation/ — programme description and uses.
- NIST: https://physics.nist.gov/cuu/Constants/Value/c.html — exact SI speed of light, 299,792,458 m/s.
- Official bulletin destination: https://spaceweather.sansa.org.za/products-and-services/current-conditions/daily-conditions — linked, not fetched by the application. A direct request to the parent space-weather site timed out in the review environment; a current report is not stored or republished here.
- RFC 3021: https://www.rfc-editor.org/rfc/rfc3021.html — /31 point-to-point special case, relevant to the separate networking implementation.
- Google grounding documentation: https://ai.google.dev/gemini-api/docs/generate-content/google-search — current groundingChunks/groundingSupports and search display requirements; no provider integration is added here.

The source review window ends at 1 December 2026 00:00 SAST. This is an editorial policy, not an automatic refresh schedule. An expired window is visibly labelled; it is never silently renewed. Links remain usable for original-publisher checks, and calculations remain local mathematical tools. No current storm severity, spacecraft status, telescope feed or satellite image is invented.

## Validation and release
Actual local execution: 51 new Node checks plus 33 existing tool-search checks passed (84 total, no failures/skips). Strict TypeScript checking of the calculation/source module passed. Syntax/transpilation of the TSX page and authored tests passed; this alone is not full application compilation.

Seven DOM interaction tests and five Chromium/WebKit browser journeys are included but require the repository's installed dependencies/CI. The dedicated pinned-action read-only-permission workflow checks source/precision/privacy/mirrors, both frontend types and DOM behavior. Existing full builds, startup payload, security, mobile route and browser gates remain mandatory. Do not infer success, merge or production deployment from creating this branch. Reconcile concurrent catalog additions before release. Rollback is a reviewed revert of this isolated feature; no data migration is involved.
