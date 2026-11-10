# Owner-authorised Tender Desk redesign — 9 November 2026

The owner requested immediate implementation, testing and deployment after rejecting the old information-heavy design. This extends PR #509 rather than creating another abandoned draft. The customer journey is discovery, understanding, requirement checks and a useful next step, within Luqi's single product and login.

## Scope
An emerald-and-warm-paper responsive workspace, service/reference/area/province search, explicit published-ceiling filter, saved public notice IDs on this device, and source-linked per-notice guidance. Tri-state requirement checks are self-reports, not eligibility assessments. The local downloadable checklist contains the original URLs, exact SAST dates, applicant responsibilities, fee/value distinctions and clarification questions. No submission, pricing, fee payment, account access, provider inference or private profile storage is introduced. Existing original-form worker, verification hashes, approval invalidation and seven human gates remain unchanged. Existing source monitor retains its fixed eight-record contract and dated reviews.

## Source provenance, not a new live scan
Five previously original-reviewed watch handoffs are selected: Stellenbosch workwear (no numerical reference; published ceiling R30,000 including taxes, not exact value), Saldanha Q314/2027, Q315/2027 and Q317/2027, and NMBM CSQ10266160. Their original full-document review date remains 9 November; release-time retrieval could not be repeated. They are explicitly research/preparation leads with **Recheck original**, not confirmed open bids. No source date was renewed. The exact official links and all substantive conditions come from the connected issue records:
- https://github.com/ttmodupe-hash/luqi-ai/issues/390#issuecomment-6729356857
- https://github.com/ttmodupe-hash/luqi-ai/issues/390#issuecomment-6736052368
- https://github.com/ttmodupe-hash/luqi-ai/issues/390#issuecomment-6731970688

Q316 reference conflict remains excluded. The two incomplete Dikgatlong advertisements remain under Sources & history, not main discovery. This selection covers Western/Eastern Cape only; the province filter offers all nine provinces but an empty result never claims no opportunities elsewhere. No invented amount, demographic restriction, company-registration generalisation, confidence percentage or award promise.

## Tests and release
New Node tests cover filters, strict exact-time suppression, invalid/future source dates, dedup, fee/value truthfulness, saved-ID allowlisting, original links, current export status and identical frontend copies. Browser journeys cover 320px overflow, normal desktop/mobile discovery, keyboard focus, requirement resets, explicit source access, local checklist download, shortlist reload/clear/storage failure, and exact expiry. Existing original-form and approval tests are changed only to navigate the new intentional sections, not to skip their protections.

The dedicated CI builds the real app and preserves screenshots. The existing desktop dependency job retains all audit, checksum, archive and smoke steps while pinning its OS and enabling downloader diagnostics to identify the previous HTTP 504. No failure is waived. Public release acceptance must verify the exact merged SHA and the actual customer route after canonical Railway SUCCESS. Neither a passing local suite nor this document proves deployment.

Baseline production: a9141c52873c83323215b52e5d33aea4a87054fb, deployment 76aba20b-4ebc-4a33-a842-21642ee162b5. Deployment, DNS and variables have not been changed by this commit. Final release evidence belongs on #202 / #349; #394 retains original-source contradictions.
