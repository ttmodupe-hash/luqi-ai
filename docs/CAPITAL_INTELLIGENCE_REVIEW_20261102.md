# Luqi Capital Intelligence — source-bound production review handoff (2 Nov 2026)

## Scope and current implementation
- Proposed additive Luqi/KHORO feature under the existing public African Opportunity Radar route, with the same login. No separate identity system.
- Retires fabricated live grant listings and simulated open-call percentages in the old `/api/v1/sensing` REST compatibility namespace; preserve retired self-healing dispatch denial. Captured original PR: #267.
- Locally computes an explainable funding-preparation shortlist from user-entered stage, sector, purpose, optional age and documents. TIA, NYDA and IDC are **programme descriptions only**, not open calls. A source listing must not be presented as a verified award window.
- Generates an editable plain-text, explicitly **unsubmitted** worksheet. No account data, GPS, browser telemetry, provider inference, API fetching or financial-document uploads. No payment or token integration.
- Mirrored `src/` and `app/src/` frontend modules stay identical. Data is never written to browser storage or transmitted by this feature.
- VC, Web3, crowdfunding and non-South-African catalogues are **types for future reviewed sources**, not operational investment matching.

## Published primary sources checked 2 November 2026
1. TIA: https://www.tia.org.za/funding-instruments/ and https://www.tia.org.za/how-to-apply/ — Seed Fund programme description and official funding gateway. Does **not** establish that a new Q4 round is open. TIA requires proof-of-concept/technology readiness depending on the instrument; final eligibility comes from the call and applicant's circumstances.
2. IDC: https://www.idc.co.za/faq/ and https://www.idc.co.za/funding-checklist/ — registered business, plan and finance readiness. IDC financing is not necessarily an equity-free grant. Sector, instrument and bankability require verification.
3. NYDA: https://www.nyda.gov.za/Products-Services/NYDA-Grant-Programme.html — SA youth entrepreneurs, published 18–35 range, and explicit exclusion of research-and-development seed capital. Confirm timing, citizenship/residency, training, turnover, credit and actual availability at the official publisher.
4. Legacy AfCFTA Digital Innovation Challenge (not used as an open programme): https://volunteer.africa/public/opportunities/afcfta-digital-innovation-challenge — historical 4 September 2026 deadline. No evidence for the old USD250k–500k live cash grant assertions.

## Security and honest matching guarantees
- Source ingestion normalises and deep-freezes a publisher allowlist, HTTPS URLs and nested funding specs. Rejected payloads are never displayed as verified opportunities.
- No funding amounts, live deadlines, automatic submissions, acceptance probabilities or remote source-code inspections are inferred.
- A 0–100 **suggested document completeness** indicator is explicitly not eligibility or funding probability.
- Unknown or stale requirements remain checks; known NYDA incompatible age/R&D purpose produces a mismatch. Cross-border fit remains unverified.
- Programme review date: 2 Nov 2026. After 2 Dec 2026, source guidance is marked overdue and cannot appear as a straightforward potential fit.
- No model credits, enterprise spend, production data, secrets, paid API, third-party connection or website mutation is required to render and export a worksheet.

## Acceptance, risk, and release
- Required review-only CI: source-matrix and negative-case Vitest, jsdom keyboard/document journey, Hono closed sensing endpoints, mirror parity, strict TypeScript, full Web Build, Playwright Chromium and WebKit including 320px and an expired source clock.
- Re-evaluate other production routes (business, account, guest, study, tender, payments, PWA) to ensure no regressions.
- Before public merge/deploy: inspect exact-head and merge-head failures, verify main has not moved, owner-authorise release, confirm Railway pin and postrelease SHA/HTTPS. Physical Android/Huawei/Xiaomi/Oppo/iPhone acceptance remains outstanding.
- One-maintainer technical review is automatic **evidence, not a human approval**. No invented reviewer needed; ensure owner makes the final decision.
- **Rollback:** do not revert earlier main release. Before merge, leave the PR unmerged. After an authorised release, prepare a narrow revert of this PR's exact commits or restore the last verified Railway source pin after explicit owner decision; never silently reopen fabricated sensing routes.

No deployment, funding application, payment or legal certification is included in this change.
