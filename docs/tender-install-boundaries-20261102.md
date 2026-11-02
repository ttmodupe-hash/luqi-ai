# Tender deadlines and local installation diagnostics — 2 November 2026

Owner requested the remaining issues be addressed and deployed. Baseline: main `1e94db1a09a5f7aa0e8b49acc634db50295dd304`; this change preserves the guided SBD 1, science, Motion and Academy release. It does not replace the supplied standalone prototype or introduce another login. Related #390, #374, #354 and #394.

## Implemented safeguards
- Published tender closing times are interpreted at the exact SAST minute, not with an invented 59-second grace period. At that instant and afterwards, the dated notice is historical. Strict calendar/time validation rejects impossible dates and noncanonical formats.
- A date-only content review is conservatively measured from the start of its SAST day and expires after 48 hours or the registry recheck boundary, whichever comes first. Invalid/future review dates and invalid deadlines never pass freshness. This tightens evidence handling rather than rolling dates forward.
- An open Tender Desk refreshes its displayed clock, including after visibility/focus changes. A selected applicant draft is preserved when a notice becomes historical. Approved export reassesses at click time, independent of stale render state; drafts remain explicitly unapproved worksheets.
- The install page adds an opt-in local browser check with actionable distinctions for official HTTPS origin, secure-context API, network hint, service-worker support, standalone display and native install-prompt availability. It records only the already-loaded allowlisted public boot-asset path, not a current server revision or evidence of cache recovery.
- A selectable report is generated only on request and invalidated on relevant browser changes. No network request, clipboard write, browser inventory, user agent, cookie, account, private URL, sensor or persistent storage access. Nothing is sent or saved; the visitor chooses whether to copy it. It is explicitly NOT security certification or physical-device acceptance.
- Existing Android/iPhone manual instructions, no-APK policy, Play Protect warnings and safe browser fallback remain. Guest and signed-in AI availability are described separately; installation does not require an account.

## Source follow-up, not successful original-file renewal
Attempt date: **2 November 2026**. Existing `TENDER_REVIEWED_ON=2026-10-29` and `TENDER_RECHECK_AFTER=2026-11-02` are unchanged. The following accessible official search representations were checked separately from direct page retrieval. A search extract is not an original-file/addenda check or proof a bid remains open.

| Original publisher destination | Observed representation and unresolved check |
|---|---|
| https://www.dsbd.gov.za/tenders/ | Indexed official listing repeated the two MSME studies and 2 November 2026 11:00 closing time; direct retrieval was unavailable. Exact 2026 original RFQs, references, channel and amendments were not established. |
| https://www.gcis.gov.za/content/latest-tenders | Indexed official listing repeated RFQ 012 2026/2027, 600 SASL hours and 6 November 11:00, with a specification and audio addendum. Direct parsed page was older and did not show that record. Neither representation establishes withdrawal or current acceptance; exact files/addenda remain unchecked. |
| https://www.ekurhuleni.gov.za/business/tenders/ps-f-02-2027/ | Indexed issuer text repeated 5 November 10:00 and sealed physical submission at Golden Heights, Germiston. Original bid files/addenda were not independently inspected. |
| https://www.ekurhuleni.gov.za/business/tenders/ps-redp-17-2026/ | Indexed issuer text repeated 24 November 10:00 and physical submission; linked filename wording differs from the notice reference. Do not silently reconcile it without the original. |
| https://www.ekurhuleni.gov.za/business/tenders/a-ws-08-2026/ | Indexed official tender list repeated reference/title and 30 November 10:00. Full conditions and amendments remain unchecked. |
| https://www.tshwane.gov.za/?p=104421 | Indexed notice repeated GPM 04 and HD 01 closing details and describes electronic SAP Ariba plus matching supplementary hardcopy delivery. Exact bid-specific files and amendments must be checked before changing submission instructions. No claim of bidder eligibility. |

A similarly named DSBD PDF surfaced at `https://www.dsbd.gov.za/sites/default/files/tenders/RFQ%20Market%20Access%20study.pdf`. Its parsed text concerns a 2025 request with a 3 December 2025 closing date and a different scope. Visual retrieval failed, so document byte/visual identity was not verified. It was NOT used as the 2026 original or to alter any field. No official form was signed, submitted or filled for a real applicant.

**#390 remains open:** current indexed notices are not enough to certify all original documents and addenda. The customer page makes that gap visible, maintains issuer links and retains unconfirmed/historical states.

## Physical-device evidence still required
PR #375 already provides the secure PWA install route. This increment does not modify native Android target SDKs, ship an APK, update a customer's browser/OS or certify Play Protect. No physical handset is attached to this session.

For Samsung/Android (including a supported no-Google-services browser) and iPhone/Safari, record phone model, OS/browser version, timestamp, exact public release, whether install or only shortcut is offered, confirmation from the home-screen icon and any warning. Keep protection enabled. Separately exercise a pre-release tab/installed PWA after a new release: exact old/current JS paths, uncached-import failure, visible recovery, saved/copied draft and user-approved refresh. Browser emulation cannot close #374 or #354. The optional report helps correlate a loaded boot asset without collecting private data; standalone mode and a service-worker API do not prove successful installation or cache fallback.

Official guidance consulted: Google Chrome web apps (`https://support.google.com/chrome/answer/9658361`), Apple iPhone Safari web apps (`https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios`), and MDN beforeinstallprompt (`https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event`). Browser-controlled installation availability varies; no forced install or bypass is introduced.

## Validation / release
Local Node boundary/privacy/mirror suite: **46 passed, zero failures/skips**. Added DOM tests cover opt-in, report invalidation and click-time expiry; actual browser journeys cover 320px and a tab crossing its published deadline while retaining the selected draft. These new DOM/browser tests have not been executed locally; exact-head CI must establish their results. Both frontend trees are mirrored. Existing original-form mappings, source dates, applicant approvals, dependency/security, full Chromium/WebKit, startup/mobile and parity gates are preserved.

No new dependency, paid inference, customer account access, secrets, payments, general form auto-submit, DNS, production variables, database schema or budget/guest-capacity changes. Only a tested, reviewed exact commit is eligible for the owner-authorised release. Railway SUCCESS and real post-deployment public-domain checks must be verified separately. Keep unresolved evidence issues open.
