# Tender Watch customer handoff — 9 November 2026

## Scope and authority
The owner explicitly requested **deploy** after the two Dikgatlong advertisement findings. This release adds those two records to the existing Luqi `/tenders` route, not a separate KHORO product or login. It does not import every historic watch alert, claim a national inventory, or turn scheduled monitoring into continuous automatic publishing.

The existing production baseline was `a9141c52873c83323215b52e5d33aea4a87054fb`; Railway production web deployment `76aba20b-4ebc-4a33-a842-21642ee162b5` was observed SUCCESS. Final deployment identity must be recorded only after release succeeds.

## Evidence and current limitations
The original watch evidence is [#390, comment 6734173189](https://github.com/ttmodupe-hash/luqi-ai/issues/390#issuecomment-6734173189), dated 9 November 2026. It records individual original advertisements and visual inspection of their pages. The release-session attempts to reopen both exact publisher downloads failed. This is disclosed in the UI: **advertisement information from the dated handoff, original access currently unconfirmed, complete tender books pending; not a verified open or bidder-ready opportunity**. An access failure is not proof of cancellation. Source dates are not advanced by release checks.

- Issuer: Dikgatlong Local Municipality, Northern Cape, Frances Baard district.
- Register: https://dikgatlong.gov.za/tenders-quotations/tenders
- T10/2026/27, Delportshoop Bulk Supply Scheme Phase 1: https://dikgatlong.gov.za/tenders-quotations/tenders?download=382:t10-2026-27-delportshoop-bulk-supply-scheme-phase-1-closing-date-closing-date-18-december-2026
- T01/2026/27, Barkly West Wastewater Treatment Works upgrade: https://dikgatlong.gov.za/tenders-quotations/tenders?download=381:t01-2026-27-upgrade-of-barkly-west-wwtw-closing-date-11-december-2026

Both are **formal construction tenders requiring CIDB 8CE or higher**, not low-value RFQs. Estimated contract values are **not stated**. T10 publication: 6 November; T01 publication: not stated. Both full books are advertised for 13 November. T10 is advertised as free online; T01's R550 is a **document fee**, not a contract value. No fee was paid and no full book was obtained through a supplier account.

Advertised exact SAST cutoffs:

| Reference | Compulsory briefing (late admission excluded) | Closing |
| --- | --- | --- |
| T10/2026/27 | 23 November 2026 10:00 | 18 December 2026 10:00 |
| T01/2026/27 | 20 November 2026 10:00 | 11 December 2026 12:00 |

Briefings: Rolbal Hall, Diggers Street, Barkly West. Sealed original bids: municipal tender box, 33 Campbell Street, Barkly West. Enquiry contacts are not electronic bid channels. Full returnables, qualifications and addenda remain to be checked against complete original books before any eligible/bid-ready claim.

## Engineering boundaries
The new component has local search by reference/area/service, province selection, source links, progressive details and history. It takes the existing page's clock, including existing focus/visibility refresh, rather than adding another timer or background fetch. Exact SAST briefing and closing times suppress default results at the cutoff. Expired records remain available only through explicit history. Date-only advertisement review becomes due after a conservative 48 hours. The advertised book-release date never upgrades verification automatically.

New pending advertisements are deliberately separate from the old fixed eight-notice source-monitor contract and worksheet approval path. They have **no preparation/export/submit controls**. Existing registry review dates (29 October / recheck 2 November), source monitor, original-form hash, seven applicant approvals, private-draft isolation, single login and guest access remain unchanged. Both frontend trees use identical new blobs. No dependencies, credentials, applicant data, inference, payment, automation schedule, DNS, variables or database changes.

## Acceptance and release protocol
Added dependency-free state/filter/expiry/mirror tests and desktop/320px browser journeys: source limitations, exact links, keyboard details, no unintended requests, missed briefings, expired records and no overflow. Dedicated workflow runs these with existing pinned actions and locked dependencies; the repository's complete CI, Chromium/WebKit, security and original-form gates remain required. Tests must be observed passing on the exact PR revision, not inferred from this document.

Before merge: inspect the complete diff, preserve concurrent main work and confirm all applicable exact-head checks. Release only the reviewed merged SHA through the canonical Railway web service. Read back SUCCESS, exact release identity and actual public probes before claiming deployed; synthetic browser tests do not certify a physical phone. Rollback target is the prior verified deployment above if a genuine release regression is established; do not change unrelated services.

Coordination: #390 original-source evidence; #394 source correctness; #349 Tender Desk originals; #202 release acceptance. The next editorial step is full-book/addendum verification after 13 November, not silently changing these cards to open.
