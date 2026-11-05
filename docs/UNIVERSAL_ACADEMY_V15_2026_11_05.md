# Universal Academy V15 - implementation and acceptance

Development PR, not a deployment. An expandable six-track workspace with starter lessons is NOT six completed accredited courses or proof that every KHORO tool is active.

## Integration and preservation
The real entrypoints are `src/App.tsx` and `app/src/App.tsx`, not a standalone App.jsx. Both now declare `/academy`, `/cert-academy` and `/exam-prep` for the Universal Academy. Existing Cisco/ITIL practice is retained at `/cert-academy/legacy`, `/ccna`, `/ccnp`, `/itil-ai` and `/networking-lab`. All original route and local iframe preservation checks remain enforced. The exact two additional paths are explicitly allowlisted, not wildcard-exempted.

Academy page, content, engines, styling, Maths component and searchable workspace directory entry are byte-identical across both frontend trees, checked by `tests/universal-academy-parity.test.mjs`. This preserves the secondary source tree; it is not a claim that a native mobile build was released or physically tested. The existing Content Studio directory ID `academy` remains unchanged; this tool uses `universal-academy`.

No backend endpoint, account permission, production setting, migration, provider budget or payment setting changes. The workspace is lazy-loaded.

## Delivered capabilities and boundaries
| Track | Practical learning delivered | Boundary |
|---|---|---|
| CCNA | Full-integer IPv4 /0-/32 calculations, IOS-style configuration modes, generated host-count exercises | Not IOS XE, a packet emulator, complete VLSM allocator or OSPF adjacency engine |
| Security+ | CIA/risk lessons, SLE/ALE, real WebCrypto SHA-256, synthetic UFW/Nmap fixture | No external scanning, host changes or issuer accreditation |
| AWS | Responsibility/service lessons, user-assumed costs and synthetic CLI examples | No AWS credentials, provisioning, live prices or real cloud bills |
| Python/AI | Strict arithmetic/print/sum output-trace grammar, JSON validation and API project tasks | Not a full Python interpreter; FastAPI execution requires a separately isolated environment |
| Matric | Work-energy, signed momentum/average force, photoelectric thresholds and quadratic roots/vertex/derivative | Not complete CAPS coverage or an official marking service |
| Solar/K53/business | Energy/battery/PV estimates and distinct supervised-driving/business-readiness pathways | No live mains work, installation certification, driving licence, SANS redistribution or legal filings |

The catalog has 18 original guided activities, each with explanation, example, analogy, misconception, practical steps and evidence requirements. An additional quadratic investigation links to existing online algebra/geometry labs. Practice uses one parameterized starter family per track, not a complete mock exam or exam dumps.

## Study and custom courses
Optional cycle: learn -> reflect -> practise -> teach back -> correct/revisit. This modern design draws inspiration from self-cultivation and Ubuntu peer learning; it does not describe every Chinese tradition or claim independently proven learning gains. Direct answers, freedom of belief and learner dignity remain intact.

Five teaching modes and seven language preferences prepare a request for the existing Chat. They do not silently send it or the notebook. English lessons are not falsely described as already translated. Native-speaker review and full multilingual content remain expansion work.

The custom builder creates a learner-owned outline from subject, goal, weekly time and 1-20 unique topics. It does not claim to ingest, watch, license or verify a YouTube course. It provides bounded generic learn/explain/build/test/revisit steps, not invented authoritative subject content.

## Privacy, cost and execution
Calculations, question generation and draft planning are local. The teaching grammar never uses eval, Function, a shell, AWS credentials or real scans. External video is opt-in; original source links remain usable if embedding is blocked. No videos or transcripts are scraped or redistributed. A valid video URL is not a quality or rights verdict.

Learner drafts, attempts and reflections are React-memory-only; navigation/reload or account changes clear them. Identity changes synchronously recreate the workspace. Explicit JSON downloads retain work on the user's device. No cloud learner record or automatic reminder is created. A correct practice answer is not a certificate; revealing an answer is not counted as a successful attempt.

The SHA-256 example detects differences against a trusted reference; it does not encrypt or authenticate the author. Solar/cloud outputs label their assumptions and omissions. Local calculations do not generate new inference charges. Internet access is still needed to load the app and external resources; this is not a guaranteed offline-install package.

## Source review: 5 November 2026
- Cisco issuer: https://learningnetwork.cisco.com/s/ccna-exam-topics . v1.1 last testing 2 February 2027; v2.0 starts 3 February 2027. Match content to the learner's exam date.
- AWS issuer: https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/ and https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/clf-02-revisions.html . Revision 1.3 published 29 October 2026. Coding and implementation projects are enrichment beyond core CLF-C02 scope.
- SY0-701 creator index: https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/ . Current issuer availability could not be independently confirmed in this review; the CompTIA source is explicitly unverified. Do not invent an exam retirement date.
- Supplied video `7HKot-brXFE` is not reused as a Python course. AWS publisher page: https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-study-course-pass-the-exam-with-this-free-13-hour-course/ . External playback is not independently certified.
- FastAPI: https://fastapi.tiangolo.com/tutorial/first-steps/ . Official Python and SABS links remain unverified for this review, rather than falsely date-stamped.
- DBE: https://www.education.gov.za/2021Grade12ExamGuidelines.aspx and https://www.education.gov.za/SelfStudyGuidesGrade10-12.aspx . Read with CAPS and later official circulars.
- Licensing: https://www.gov.za/services/driving-licence/apply-learners-licence . An app exercise does not issue a driving qualification.

Resources older than 30 days are flagged for review. This is NOT continuous automatic updating. Before a content change: inspect the issuer's current blueprint; record version differences; review creator rights and topic coverage; update lessons and reference tests; retain the earlier version and migration note. A changed web page must not silently become model instructions.

## Verification and promotion
- Engine tests cover reference values and edge cases, 1,200 seeded track/seed combinations, malformed URLs, source ageing, course bounds and bounded command grammar.
- Maths tests cover roots, residuals, degenerate inputs and rendered interaction.
- React tests cover six-track switching, local results, answer/reveal distinction, custom outlines, explicit external-player consent, language request controls and account-change clearing.
- Browser spec covers built-UI discovery, six-track switching, 320px overflow, local terminal state and actual course/notebook downloads; screenshot evidence is synthetic/public only.
- The existing mobile workflow retains all recovery, route and payload checks and additionally runs focused Academy tests, both-tree parity and the new browser spec. No existing gate is disabled.

Require passing exact-head checks and review browser evidence before promotion. Physical-device testing, external video playback, current issuer verification where missing, educator/native-language review and complete syllabus coverage are separate acceptance work. No merge or production promotion is performed by these changes.
