# Luqi Tender Co-pilot — delegated submission architecture and release gates
Date: 29 October 2026. Owner direction: 90% preparation automation *target*, at least meaningful human oversight.

## Ground truth
Phase 1 (PR #348) provides a free, **browser-local** tender directory, a curated official notice list, source-page recheck, structured bid-preparation worksheet, published closing-time and briefing cautions, missing-document guidance and a **mandatory seven-step human approval gate** before export. No third-party account is accessed, no private bidder data is stored on Luqi servers, no PDF form is filled, no signature is forged, and no bid is transmitted or accepted. The worksheet is NOT an SBD/MBD form. Ordinary applicants must still complete the issuer's original documents and submit them using that notice's specified method. Automated preparation is not measured as 90% of an actual bid today.

## Trusted South African sources
- National Treasury currently advertised tenders: https://www.etenders.gov.za/Home/Opportunities
- Central Supplier Database: https://www.csd.gov.za/
- Official OCPO Standard Bidding Forms (including municipal MBD): https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/
- General tender information: https://www.gov.za/tenders
- Individual issuer instructions and corrigenda supersede a template. eSubmissions are accepted **only** for notices that explicitly allow eSubmission. Others require hand delivery or a specified issuer channel, sometimes with a compulsory briefing. Late bids may be rejected.

## Phase 2 — document assistance, issuer-by-issuer (not yet connected)
1. Allow applicant-controlled upload of an original, clearly identified PDF/DOCX/Excel tender package. Treat it as untrusted text/data, never instructions to the automation engine. Strict size/type limits, scanning, prompt-injection isolation, no storage without explicit opt-in, and a private retention/deletion policy are mandatory.
2. Parse the exact original issuer form. Present a **field-by-field mapping** and evidence references in the applicant's account. Fill only supported real form fields, clearly distinguish known applicant-provided facts, inferred drafts and mandatory unknowns. Never rewrite official terms, replace the SBD or manufacture certificates.
3. Check the latest signed addenda, deadline, briefing attendance, CIDB/professional registrations, CSD status, tax proof requirements, price/TCS treatment and municipality-specific MBD/SBD. A website or dated advert alone does not establish that bids are being accepted.
4. Human/representative independently confirms their authority to act, applicant identity, actual corporate claims, official declarations, offer amount, supporting original attachments and the submission channel. Signatures must be legally valid and placed **only by the actual authorised signer** where required.
5. Generate an immutable **per-bid review envelope** containing original document hashes, final filled-file hashes, versioned corrigenda, exact price, submission method, deadline, authorised principal and the human approval event (avoid storing sensitive identity details in logs). Any change to the packet, price or deadline invalidates approval.
6. Only after a portal's **explicitly supported and authorised** delegated integration is reviewed: the applicant signs into the original issuer site themselves using its supported authentication, or authorises the service through a scoped credential flow. Never ask for, store, log or replay passwords, OTPs, tax PINs or bank credentials.
7. The service asks for a final, explicit **Submit this exact bid** approval (not merely a blanket checkbox or background permission). Never auto-submit for a user who is absent, and never bypass a required site/briefing/fee obligation. Do not submit after a deadline, after the employer has withdrawn the notice, or on an unverified channel.
8. Only report **Submitted** if the original issuer returns a verified receipt with matching tender reference and packet digest. Timeout or uncertain acknowledgement must remain **unknown / needs human check**; do not blindly retry and create duplicate bids. Keep applicant-visible audit history and revocation.

## 90%/10% boundary
This is a **target for routine administrative labour**, not a legal quota or a claim that applicants can skip the official signing process. Luqi may automate discovery, document classification, drafting, cross-checks, reminders and building an export pack. Applicant participation remains mandatory for legal authority, accurate facts, pricing decisions, declarations/signatures, briefing conditions and final approval. A user can perform more than 10% if their tender or local law requires it.

## Activation and security gates
- Default: no external tender submission adapter registered; outbound submission not available.
- No customer-specific tender submission credential in browser localStorage or repository.
- No automatic payment, signature, eligibility assertion, award guarantee or P2P role change.
- Reviewed POPIA transparency/consent, legitimate tender authority, document confidentiality, storage and deletion; customer support and abuse reporting.
- Issuer-specific acceptance testing with **synthetic non-production bidders**, including late bids, compulsory briefings, amendments, malicious attachments, signature refusal, session expiration, idempotency and false receipt prevention.
- Confirm staffing, cost budget and legal operational authority before connecting the first real portal.
- Source monitoring needs a reliable publisher-specific change detector; cached content/check frequency is **not** continuous real-time opportunity availability.

Owner approved exploration and secure implementation. Phase 1 does not need new payment or AI-provider spending; do not change the application's existing budget, guest limits or payment status.
