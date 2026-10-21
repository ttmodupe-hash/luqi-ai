# LUQI Permanent Security Remediation and Staging Acceptance

**Repository:** ttmodupe-hash/luqi-ai  
**Branch:** fix/companion-audit-reliability  
**PR:** #96  
**Status:** Development implementation validated by GitHub Actions; **not deployed to production**; penetration test, live cloud review and payment-provider settlement testing outstanding.

## Problem identified

The system exposed unauthenticated tRPC and legacy REST routes that could read or modify caller-selected records or claim financial/operational success without verification. This is a code-level security weakness, **not confirmation of a data breach**. Low traffic, obscurity and lack of public knowledge do not establish that an endpoint was never accessed. Production access and audit logs must be preserved and reviewed separately.

## Permanent controls committed

1. Identity comes from persistent, expiring database sessions. Legacy REST login/signup/me use the shared session implementation and HttpOnly cookie. Removed fallback JWT signing key and the unsafe in-memory authentication path.
2. Student progress, personal reports, voice history and device sync require a session; owner identity is included in SQL `WHERE` and write filters, never trusted from a request payload. Sensitive operations fail closed if the persistent DB is unavailable.
3. Guardian access is student-initiated, guardian-accepted, and revocable. Only `consented:parent|teacher|tutor` records are eligible for guardian records access. Old plain-text relationship values are excluded; the protocol fits existing schema without a new column. Real-world age and guardian identity verification still require a child-safety workflow before use by minors.
4. Video project creation, listing, retrieval, edits and deletion enforce the authenticated account's user ID. Historical projects without authenticated ownership are deliberately not exposed.
5. Agent administration, internal telemetry and archive APIs use validated role-based administrator access. Assertions that tests, MFA, patch deployment, synthetic sandbox runs or cloud certificates were verified are removed when no independent evidence exists.
6. Browser API state-changing requests require approved first-party origins for session cookies, including older `/auth/*`, `/v1/*` and `/api/*` routes. CORS does not permit wildcard credentialed origins. Production deployment must configure `FRONTEND_URL` and any necessary `ALLOWED_ORIGINS` with exact HTTPS origins.
7. Legacy REST payments can no longer grant credits from caller-provided amounts or unsigned PayFast/Stripe webhook bodies. Paystack checkout is bound to the authenticated account. Webhooks verify raw-body signature, provider settlement, original reference, currency, amount and account; the wallet update and event processing occur under a database transaction with row locking to prevent double settlement.
8. AI chat no longer trusts client-provided email as wallet identity. Its sessions and cache keys are account-scoped. Paid AI endpoints reserve a per-account, 24-hour allowance transactionally under a database row lock; defaults to 20 calls daily, with `LUQI_MAX_AI_CALLS_PER_DAY` bounded between 1 and 50. This limits abusive calls but is **not** a full vendor-level dollar spending cap.

## Honest feature status

- **Restored on development branch:** personal adaptive learning, reports, voice history, offline queue, guardian invitation/consent/revocation, video project CRUD, administrator-only archives and telemetry.
- **Paystack settlement:** code path implemented and covered by mocked signed/unsigned, mismatched-user and duplicate-callback regression tests; not validated against actual provider sandbox and Cloud SQL deployment.
- **Pending real implementation:** durable spendable-credit ledger for paid video rendering; authenticated per-job reservation/refund, background workers, media integrity checks, and provider-level spending caps. The old fake in-memory credit minting and paid job APIs have been retired rather than presented as working payments. Legacy tRPC `video.generate` and unverified credit mutations remain unavailable to all callers until a real transactional pipeline replaces them.
- **User-facing compatibility:** front-end flows built against old `/auth/login` token responses, fake credit/job endpoints, or anonymous paid AI must be migrated and tested before any production rollout. Auth responses now favour HttpOnly cookies over exposing tokens in JSON.
- **Existing production:** not assessed or changed by this branch work. Merging is not release authorisation.

## Evidence and limitations

Latest validated GitHub Actions run **39603480410** completed TypeScript checking, **31 test files / 159 tests**, and the production build. Associated Security Review run **39603481657** and lockfile audit run **39603480277** succeeded. No vulnerability-audit finding is not equivalent to a complete security certification. CI mocks cannot prove Paystack and MySQL transactions work against live provider/database environments.

## Required production gates

1. Check latest branch CI, all regression tests, dependency scan and secret scan; require all protected branch checks.
2. Stage against a real MySQL/Cloud SQL database with production-like schemas; test guardian consent, cross-account access, SQL transactions, concurrent payments and expired sessions.
3. Perform real Paystack sandbox checkout and verified webhook/replay/refund tests; do not enable paid rendering before accurate credit-ledger accounting and quota enforcement are proved.
4. Verify `FRONTEND_URL`, `ALLOWED_ORIGINS`, cookies and cross-domain frontend clients; test CORS and CSRF against deployed domains.
5. Review legacy REST routes not yet migrated for service permissions, identity and dollar-cost limits; confirm retired endpoints and frontend compatibility.
6. Verify GCP project ID, Cloud Run service, region, service accounts, minimum IAM permissions, Secret Manager, encrypted storage, logging, alerting and tested restore procedures.
7. Preserve and examine production access logs before making any statement about historical unauthorised access. Follow POPIA/contractual incident procedures if evidence indicates a reportable event.
8. Independent penetration test and remediation of discovered high or critical issues; stage/rollback plan and explicit production approval.
9. Review session management, email verification, MFA for administrators, secure age/guardian verification, retention/deletion, content scanning, prompt injection and third-party processor policies.

**Never represent committed code, simulated behaviour or a successful build as proof of live provider settlement, full penetration-test clearance, deployed functionality or absence of a past breach.**
