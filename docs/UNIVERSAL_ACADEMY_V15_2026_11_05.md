# Universal Academy V15 - implementation and acceptance

Status: development PR, not deployed. This is an expandable learning workspace with starter content, NOT six completed accredited courses or proof that all 20 KHORO tools are active.

## Integration
- Actual application entry: `src/App.tsx`, not a fabricated standalone `App.jsx`.
- New canonical route `/academy`; `/cert-academy` and `/exam-prep` open the same workspace. Existing Cisco/ITIL implementation remains at `/cert-academy/legacy`, `/ccna`, `/ccnp`, `/itil-ai` and `/networking-lab`.
- Searchable `universal-academy` directory entry. Existing `academy` directory ID still belongs to Content Studio and is not repurposed.
- Lazy frontend-only implementation. No new backend route, secret, migration, model activation, billing or deployment setting.
- The secondary packaged `app/src` tree is not a second Academy implementation. The canonical web build is the target of this change; do not claim a native-app release.

## Delivered scope
| Track | Implemented practical scope | Deliberate boundary |
|---|---|---|
| CCNA | Full-integer IPv4 calculator /0-/32, IOS-style mode/configuration subset, generated host-count practice | Not IOS XE, packet forwarding, a complete VLSM allocator or OSPF adjacency simulation |
| Security+ | CIA/risk lessons, SLE/ALE, real browser SHA-256, bounded synthetic UFW/Nmap fixture | No host access, real scanning or claim of issuer authorization |
| AWS | Shared-responsibility lessons, cost assumptions, synthetic CLI responses | No AWS account, provisioning, real bill or live price retrieval |
| Python | Output prediction, strict arithmetic/print/sum teaching grammar, JSON/API design tasks | Not an actual Python interpreter; full FastAPI work requires a separate isolated environment |
| Matric | Work-energy, signed momentum/average force, photoelectric threshold, quadratic roots/vertex/derivative; links to existing algebra and geometry labs | Not complete CAPS coverage or an official marking service |
| Solar/K53/business | Essential energy/battery/PV estimates, separate supervised-driving and business-readiness activities | No mains installation design, driving licence, SANS redistribution or legal filing |

The catalog contains 18 original guided activities. Each has an explanation, worked example, everyday analogy, misconception, practical steps and evidence to retain. The Maths component adds a quadratic investigation. Practice has one parameterized starter family per track, not full-length exams or leaked certification questions.

## Learning method
The optional learn -> reflect -> practise -> teach back -> correct/revisit cycle is a modern teaching design inspired by self-cultivation and Ubuntu peer learning. It is not a universal description of Chinese culture or an empirically certified intervention. Direct answers remain available. No religious adherence, shame, cultural ranking or pressure-based scoring.

Mode/language controls create a reviewed prompt for the existing Chat page. They do not silently send a notebook, make paid calls or claim that all English lessons are already translated. Reviewed native-language lessons, complete adaptive scheduling and subject-specialist moderation remain expansion work.

## Privacy, execution and cost
- All new calculations, question generation and draft planning run locally. The teaching parser never uses eval, Function, a shell or network execution.
- Drafts and attempts are memory-only and keyed to the current account identity. Account changes synchronously recreate the workspace. Export JSON explicitly to retain work; the notebook is not yet a cloud-backed learner record.
- YouTube has an exact HTTPS watch/share URL parser. A valid URL is NOT a licensing or accuracy verdict. No remote request occurs until the user loads a player or opens a source link. No transcript/video is scraped or redistributed.
- Keep existing HTTP framing policies. The user can open the original video when embedding is unavailable. Browser tests must not be presented as proof that external playback works in every region.
- Custom course generation is a learner-authored scaffold from a bounded topic list. It does not hallucinate an authoritative syllabus or claim to have watched a supplied video.

## Source review - 5 November 2026
- Cisco official exam topics: https://learningnetwork.cisco.com/s/ccna-exam-topics . Current v1.1 last test date 2 February 2027; v2.0 first test date 3 February 2027. Learners must prepare for their chosen exam date.
- AWS guide/revisions: https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/ and https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/clf-02-revisions.html . Guide revision 1.3 published 29 October 2026. CLI/implementation projects are enrichment beyond foundational CLF-C02 scope.
- CompTIA issuer link could not be independently verified in this review. The UI correctly marks it unverified rather than inventing a retirement date. SY0-701 creator course index: https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/ . Creator material does not determine issuer exam availability.
- Supplied video `7HKot-brXFE` is retained for AWS, not reused as a Python course. The freeCodeCamp AWS course publisher page was reviewed: https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-study-course-pass-the-exam-with-this-free-13-hour-course/ . External playback/embedding is not certified.
- FastAPI: https://fastapi.tiangolo.com/tutorial/first-steps/ . Python tutorial and SABS links remain explicitly unverified for this review, not falsely date-stamped.
- DBE: https://www.education.gov.za/2021Grade12ExamGuidelines.aspx and https://www.education.gov.za/SelfStudyGuidesGrade10-12.aspx . Existing guidance must be read with CAPS and subsequent official circulars.
- Licensing: https://www.gov.za/services/driving-licence/apply-learners-licence . A learning exercise does not issue a licence or replace supervised practice.

Freshness behavior: each resource has a review date or an unverified state. Over-30-day reviews are visibly flagged. This is NOT automatic continuous curriculum updating. Before revising a track, compare the original issuer blueprint, record changes, review content/rights, update matching activities and tests, and preserve a versioned migration note. No silent ingestion of a changed page into model instructions.

## Verification
- `src/features/academy/academy.test.ts`: calculation references and edge cases, 1,200 seeded track/seed combinations, bounded command grammar, malicious URLs, source ageing and custom-outline constraints.
- `src/features/academy/AcademyMathLab.test.tsx`: quadratic reference values, residuals, invalid coefficients and rendered interaction.
- `src/pages/UniversalAcademyPage.test.tsx`: six-track switching, local calculations, answer/reveal distinction, custom-course generation, external-video consent, explicit language request and cross-account clearing.
- `browser-tests/universal-academy.spec.ts`: real built UI discovery, six-track journey, 320-pixel overflow, command state, course/notebook downloads and screenshots. Synthetic/local tests are not physical-device acceptance or external YouTube acceptance.
- Mobile loading guard adds only the exact two new canonical paths and retains all existing route/iframe/payload checks. No test is disabled to permit this feature.

## Before promotion
Require passing exact-head CI, review the new browser evidence, check actual external video behavior without sharing private data, and review representative lessons with educators/native speakers. No merge or production change is authorized by this document. Follow-on work includes fuller domain coverage, reviewed multilingual content, real sandboxed programming, curriculum-change monitoring, notebook import/cloud persistence with consent, and independently validated mastery assessment.
