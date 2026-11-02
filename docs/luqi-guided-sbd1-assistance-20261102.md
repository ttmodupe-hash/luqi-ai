# Guided SBD 1 contact assistance — 2 November 2026

Implements the first assigned form-assistance milestone from #394/#349. Based on main bb6e95fce84be1a5cd50e450c5209c830d8ef1cb. No new issuer policy, universal form filling or automatic submission is introduced.

The pinned original remains 56343 bytes with SHA-256 76094c42d8f098fb0bb51ab922f8ba1a832e1858039107b2dbd14b4c086bf1fe, reviewed 30 October 2026. Its original date is not renewed. Local XML inspection confirms the existing supplier rows: bidder, postal and street addresses, separate telephone CODE/NUMBER, cellphone and email. Help is Luqi's plain-language explanation of these labels, not new official wording or an independent eligibility/legal review.

## Implementation
- Separate controlled TenderSupplierGuide uses the same parent-owned seven values. All fields remain available by default; optional guided mode presents one field at a time.
- Previous/next and named issue controls focus the actual selected input. View changes preserve values and do not invoke edit callbacks or revoke approvals. Real edits still invalidate every approval through the existing parent handler.
- Every field has specific help and an accessible description. Missing bidder name and format errors are reported, with direct correction controls. Optional blanks are not fabricated or labelled application failures.
- Progress explicitly concerns only valid-format entries in seven supported contact fields; it never certifies facts, whole-form completion, eligibility or submission. Issuer instructions may require fields that Luqi permits blank in a partial export.
- Input checks use current field limits and mirror the existing worker's controls/email rule. Worker/original hash/parser/approval/deadline/packet validation remains authoritative and unchanged.
- No saved profile, client persistence, provider request, upload, sensors or signature generation. Existing account-change/clear/page-exit disposal remains intact; the guide unmounts with private work.

## Acceptance
A dedicated read-only, pinned-action workflow runs new Node/DOM tests and the existing original-file, export, approval and account-clear suites. Existing full Chromium/WebKit suites automatically include a new 320px guided journey; the original real-DOCX-fill/export/approval journey is retained unchanged. No security, review expiry, original hash, source date or performance threshold is weakened.

Local execution and exact-head CI results must be recorded separately in the PR. Creating this change is not proof of physical-device recovery or production deployment. Prices/declarations/signatures/final submission remain with the applicant. No customer application data is used; all test answers are synthetic.
