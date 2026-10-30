# Luqi Tender Co-pilot — delegated submission architecture and release gates
Date: 29 October 2026. Owner direction: 90% preparation automation *target*, at least meaningful human oversight.

## Phase 2 first increment — original form assistance (30 October 2026)

`/#/tenders` now has a separate **original government form assistance** workflow.
The existing discovery, eligibility hints, worksheet and seven original worksheet
gates are preserved. This increment fills seven supplier contact cells in the
actual National Treasury **revised SBD 1 DOCX**, rather than generating a replacement
document. It is a **partial, unsigned form**, not a complete bid or submission packet.

The source was downloaded from the OCPO official form directory on 30 October 2026:

- Directory: https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/
- Original: https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/REVISED%20SBD1.docx
- SHA-256: `76094c42d8f098fb0bb51ab922f8ba1a832e1858039107b2dbd14b4c086bf1fe`
- Size: 56,343 bytes; printed footer: Version 1 of 2023; mapping version: 1.
- Source bytes preserved in `public/forms/tenders/treasury-revised-sbd1.docx`
  and its mirrored app path; test fixture contains the identical official original.

The original expressly requires official forms rather than retyping them. Only
empty supplier contact cells are changed by inserting escaped applicant-entered
text into their existing Word paragraphs. Every other XML byte and package part,
including labels, terms, tables, styles, headers, footers, checkboxes, declarations
and signature areas, is preserved. A source hash mismatch blocks filling, even
if the filename or labels look correct. Issuer-customised forms require a separate
reviewed mapping; the blank Treasury template must never silently replace them.

| Format | Current supported extraction | Filling/export |
| --- | --- | --- |
| Exact verified revised SBD 1 DOCX | Official text and seven field locations | Original DOCX with applicant-entered contact facts only |
| Other DOCX | Bounded document text, treated only as untrusted data | Blocked until the exact original has a reviewed mapping |
| PDF | Up to 200 AcroForm field names; no OCR or flat-page text | Blocked until an exact mapping is reviewed |
| XLSX | First 200 non-empty cell values with worksheet-part/cell references; formulas shown without evaluation | Blocked until an exact mapping is reviewed |
| DOC, XLS, XLSM, scanned/OCR forms, encrypted/signed files, active/embedded content | Unsupported | Blocked |

### Verified field mapping

Indices below are zero-based physical `w:tr`/`w:tc` positions in the first table,
not the expanded Word grid containing repeated references for merged cells.

| Applicant field | Row | Cell | Maximum characters |
| --- | ---: | ---: | ---: |
| Name of bidder | 14 | 1 | 70 |
| Postal address | 15 | 1 | 90 |
| Street address | 16 | 1 | 90 |
| Telephone code | 17 | 2 | 8 |
| Telephone number | 17 | 4 | 24 |
| Cellphone number | 18 | 1 | 24 |
| Email address | 20 | 1 | 80 |

Only the bidder name is required for this partial export; an unknown optional
value is left blank. Luqi does not obtain, infer or invent supplier data. Tax PIN,
VAT/CSD registration cells, certifications, ownership interests, eligibility,
prices, declarations and signatures are not filled by this mapping. The applicant
must complete and verify every remaining issuer requirement in the original.
The OCPO directory separately lists municipal forms and a recently revised SBD 4;
this SBD 1 mapping does not assert that any legacy SBD/MBD declaration is current
or replace the authority's required version.

### Handling, amendments and review

- Processing requires explicit local-processing consent and happens in a fresh
  worker terminated after eight seconds. Files, entered facts, review history and
  prepared exports stay in tab memory. No upload endpoint, AI call, server-side
  supplier profile, credential collection or browser persistence was added.
- A file must be a non-empty PDF/DOCX/XLSX up to 3 MiB with matching magic/MIME/type.
  Office packages have central/local ZIP-header, path, duplicate-name, entry,
  compressed expansion, XML and relationship checks. Limits: 256 entries, 2 MiB
  per entry and 12 MiB total expanded content. Macros, active external templates,
  embedded objects, signatures and connections are rejected. Static HTTP(S)
  hyperlinks are retained without being fetched or executed.
- PDF filtering is intentionally conservative: stream expansion is bounded before
  parsing; ambiguous/indirect/chained or unsupported compression filters are
  rejected. PDF actions, JavaScript, embedded files, XFA and signatures are rejected
  structurally after parsing, including compressed object dictionaries. These
  structural controls are **not a malware/antivirus certification**.
- Up to six applicant-imported addenda can accompany the original. Each is checked
  using the same import controls and bound by its SHA-256. Duplicate documents
  are rejected. Their official origin, relevance, signed authenticity and latest
  status still require applicant checks; Luqi does not certify those facts.
- Applicant-entered tender reference, authority, exact deadline with timezone,
  channel/destination, price and authorised representative identify the private
  review record; they do not populate or change issuer/pricing/declaration fields.
- Preparing creates a digest over the exact original, filled original, addenda,
  mapping version, context and revision. All seven applicant gates are separate
  from the worksheet gates and require deliberate confirmation. Export permission
  is explicitly **partial-form export**, not a legal signature or final submission.
- Every field/context change or addendum import/removal clears all approvals.
  Review expires after 30 minutes or at the closing time. The exact bytes and
  digest are checked again before export. Clear/consent revocation, page exit,
  account change, logout or expiry clears local work and rejects late worker results.
- The private ZIP contains the unchanged original, filled partial original,
  selected addenda, a JSON review/approval record and completion instructions.
  The JSON records approvals and amendment hashes in a chained local history;
  event subjects contain field IDs or document hashes rather than private values.
  Consecutive typing in one field is combined. This is not an independently
  witnessed identity/authority audit or a legally binding digital signature.
- After downloading, manual changes require a new review of the final documents.
  Downloaded private files remain the applicant's responsibility. Local clear
  cannot delete a previously downloaded file from the device.

### Submission and remaining Phase 2 work

**No submission integration is enabled.** No provider receipt, government acceptance
or final signed-bid readiness is claimed. Nothing is auto-submitted, retried,
paid or signed. Connecting an authority requires documented permission, a
supported scoped authentication method, explicit applicant authorisation of the
exact final signed packet, deadline/idempotency controls and independent verified
receipt evidence. Physical bids remain physical where the issuer requires them.

Next increments are reviewed issuer-specific PDF/Excel/custom-DOCX mappings,
additional SBD/MBD versions, genuine signatory-controlled signature workflows,
and any separately permitted submission integration. Account-bound encrypted
storage and retention would require an explicit opt-in workflow and security
review; current local-only handling avoids collecting private tender documents.

Validation covers exact official source recognition, untouched package parts,
XML escaping, unknown fields, lookalikes, malformed archives, expansion bombs,
XML entities, active content, PDF actions, Excel non-execution, approval expiry,
file/digest tampering, amendment changes, stale worker results, account switching
and real desktop/mobile import-to-export. Source and filled SBD 1 are rendered for
visual comparison; the unchanged terms/signature page remains pixel-identical.
No payment state, guest quotas, provider allocation or approved USD300 AI budget
is changed by this increment.

## Phase 1 ground truth before this increment
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
