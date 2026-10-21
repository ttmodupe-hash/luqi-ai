# LUQI Development Security Hardening — 2026-10-21

**Scope:** Branch `fix/companion-audit-reliability`, draft PR #96. No production deployment or migration is implied.

## Verified automated evidence
- Node CI run **39597744496** succeeded on commit `abf78f1c7035bdd8a75f86b21d3f804de4240170`: TypeScript project check, **25 test files / 124 tests**, and production build.
- Security Review run **39597744732** succeeded: production dependency audit and Gitleaks job.
- Lockfile Repair run **39597744621** succeeded: dependency installation and production dependency audit.
- This evidence establishes neither absence of all vulnerabilities nor production runtime security. Dev dependencies, container images, third-party providers, cloud IAM and penetration testing require separate assessment.

## Temporary fail-closed API controls
The following legacy tRPC routes were open to anonymous requests or trusted caller-supplied IDs, and now use `legacyRestrictedProcedure`, which denies **all** requests until implemented safely:
- `archive.*`: flight recorder, memory, artifacts and internal status (8).
- `guardian.*`: guardian/student association, records and alerts (4).
- `selfHealing.*`: telemetry, patch proposals, patch status, testing and agent control (34). Some previous replies were simulations, not verified execution.
- `voice.*`: command processing, history and execution flags (3).
- `grading.*`: student assessment records (3).
- `adaptive.*`: student profiles and learning history (3).
- `offline.queueAction/getPending/markSynced`: device-specific private sync data and mutations (3).
- `orchestrator.generate/status/logs`: unrestricted provider spending, internal logs and provider status (3).
- `botanical.ask/verify`: paid AI calls and unverified botanical endorsements (2).
- `knowledge.saveArticle`: unauthenticated modifications to shared learning materials (1).
- `superCore.getTelemetry/runAutonomousRefinement/getHistoricalPatches/compileEducationalSimulation/getEducationalTelemetry/compileAdaptiveLesson`: internal records and unbounded autonomous workloads (6).
- `video.*`: 14 legacy sensitive operations blocked, including provider configuration disclosure; public informational pricing estimators still accessible.

These restrictions are intentionally disruptive for users of the affected features; they do **not** delete stored data. They must not be described as operational features until ownership, privacy, and spending controls are restored and tested.

## Controls still to build before re-enabling
1. Authenticated identity via persistent sessions; no caller-supplied userId/userKey as an authority. Return only data belonging to the verified user. Require guardian consent and formal student/guardian relationship proof.
2. Every object lookup, mutation, report and offline sync action must enforce scope in the database query, with a real database (no simplified in-memory filter fallback).
3. Role-based administration with least privilege, per-action authorisation, audit logs, and human approval for patch/deployment decisions.
4. AI/video/search spend quotas, tenant-level budget caps, request-size limits, provider key isolation and distributed rate limiting.
5. Verified payment webhooks, replay protection, idempotent credit ledger and financial reconciliation.
6. Privacy assessment including minors' data, retention, deletion and POPIA compliance, encrypted storage and backup restore tests.
7. Staging integration tests for IDOR/cross-account access, consent, forged clients, privilege escalation, CSRF, upload scanning and session expiry.
8. Full inventory of remaining routes, cloud IAM checks, secrets rotation if indicated, external penetration test and documented production approval.

## Re-enable discipline
Each blocked route requires an owner, threat model, documented authorisation policy, automated negative tests and independent review. Restore narrowly per route; never remove the shared security middleware from the entire router merely to make the frontend appear functional.

## Documentation accuracy
- No evidence of a current data breach was found in this code review. A repository audit cannot establish whether a past breach happened.
- No guarantee of an unhackable service is technically possible.
- Build success and zero reported **production dependency** findings are narrower than full platform security certification.
