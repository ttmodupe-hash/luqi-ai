# Legacy operational endpoint closure

The October 2026 authorization review found public handlers that could append
an audit event using a caller-supplied actor, read a shared audit chain, retrieve
an offline bundle without account ownership, and request another user's grading
ledger. The grading filter also included events belonging to other users based
on action names. These are confirmed code-level authorization gaps; this review
does not establish that anyone exploited them in production.

Other handlers reported applied security patches, a hardened security posture,
healthy database indexes or persisted progression records without performing
those operations or measuring those properties.

`api/lib/legacyOperations.ts` now returns 503 `LEGACY_OPERATION_UNAVAILABLE`
with `Cache-Control: no-store` for all methods at these paths:

- `/api/v1/audit/ledger` and `/api/v1/audit/seal`
- `/api/v1/grading/ledger/:user_id`
- `/api/v1/offline-sync/status` and `/api/v1/offline-sync/bundle`
- `/api/v1/edge-cache/telemetry`
- `/api/v1/security/shield-audit` and `/security/shield-audit`
- `/api/v1/security/diagnostics` and `/security/diagnostics`
- `/api/v1/analytics/log-progression`
- `/api/v1/diagnostics/database-indexes`
- `/api/v1/governance/system-cards`

The old handlers are removed, rather than merely hidden in the UI. No submitted
body is read, no actor is accepted, and no provider, storage or ledger operation
is invoked by the replacement handlers. The in-process legacy ledger is not a
durable audit database; closing its HTTP handlers is not an implementation of
secure audit logging or private offline sync.

Reviewed account login and private MySQL conversation routes remain reachable.
Existing paid-model gates remain unchanged. No production schema migration,
record deletion, credential rotation or provider activation is part of this fix.

Reopening each capability requires server-derived identity, explicit ownership
or operator authorization, bounded input, durable transactional writes where
applicable, and tests proving cross-account isolation and truthful results.
Offline bundles additionally need a defined scope and export/retention policy.
Production backups and restore testing remain separate work.
