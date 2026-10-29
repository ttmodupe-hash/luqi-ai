# Luqi Circles — safe activation runbook (28 Oct 2026)

**Verified production blocker:** Railway's web service currently has no LUQI_P2P_ENABLED or LUQI_P2P_REPORT_KEY configured. Therefore customer-to-customer messaging is OFF. Green website connectivity does not mean any human member is online.

Do not switch on P2P until every gate below is independently verified. The existing source files are db/migrations/p2p-circles-v1.sql, db/p2pContracts.ts, db/runtimeSchema.ts, db/p2pPreflight.ts and api/services/sovereignP2P.ts.

## P0 — required operator checks

1. Assign a named accountable owner and trained abuse moderator with an escalation, privacy, evidence-handling and retention procedure, particularly for minors.
2. Audit actual production MySQL schema, backups, all five P2P-specific InnoDB tables, indexes/foreign keys and the audit head. An operator may apply the separately reviewed additive migration only after rollback/recovery planning. The web application must never migrate its own data.
3. Compare least-privilege database grants with P2P_RUNTIME_GRANTS and the web runtime role. Do not grant wildcard administrator access.
4. Provision a fresh high-entropy 32-byte LUQI_P2P_REPORT_KEY securely as a Railway sealed secret. Do not put its plaintext value in Chat, GitHub source, issue comments, transcripts, logs or screenshots. Plan secure rotation and access auditing.
5. Verify user eligibility with an authorised manual process. The service recognises independently verified adult roles and school cohorts; ordinary new signups must not be automatically classified as adults or verified students. Do not collect ID documents through public chat.
6. From an authorised operator shell with reviewed environment variables loaded, run `npm run p2p:preflight`. It runs the read-only schema/key/least-privilege preflight **and** the new aggregate-only eligibility/maturity gate: at least one active `p2p_moderator` and at least two adults (including moderators) **or** two verified-student role tags in the **same** school cohort. The count check reads no names, emails, IDs or message text, prints no counts or secrets, and cannot verify age documents or actual moderators' willingness to work. Roles must be assigned independently by a trusted operator; a role tag alone is never accepted as identity proof. No feature flag or record is modified. If any check fails, deployment stays disabled. Then perform two-account/two-device acceptance: invitation expiry and mutual approval; child isolation; AES-GCM message integrity; safety code; blocking, abuse reports, moderation; duplicate/retry, rate limits and explicit translation consent.
7. Confirm rollback owner, notice for affected users, backup and metrics. Only then stage LUQI_P2P_ENABLED=true, deploy and confirm real account communication on physical devices. A missing report key or improper grants can cause startup preflight failure.

## P1 — real peer presence

Current user presence is deliberately not shared. An active account is not an online human. Use a green/red dot for messaging **service availability only** until a separate opt-in, server-authorised, short-TTL heartbeat exists for mutually approved and unblocked contacts. Never label hidden presence as offline. Child protections, blocking, clear consent and privacy-retention controls apply before building presence.

## User-facing promise

Luqi can explain opportunity verification, education, rights and application guidance using original official-source links. This does not mean Luqi can upload documents, decide eligibility, submit applications, access government accounts or expose other users' identities.

There is no authorised new AI budget, guest quota, payment activation or secret rotation under this runbook. The operator must independently complete production prerequisites before calling customer-to-customer messaging active. Track progress in issue #344. Opportunity verification development is tracked in issue #345.
