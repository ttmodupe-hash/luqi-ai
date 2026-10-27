# P2P review follow-up — concurrent operations

28 October 2026. Review of the repeated SovereignP2PEngine proposal found that the
requested component, navigation, cryptography, blocking, reporting, student cohort
checks and translation integration already exist in merged PR #319. This follow-up
extends that integration; it does not add another messenger or enable production.

## Finding and correction

The service locks the authenticated actor before a circle and its peer accounts.
Two peers sending concurrently can therefore encounter an InnoDB deadlock. The
previous transaction helper returned an unavailable error for every conflict and
could leak an unexpected rollback/acquisition error to internal callers. It also
released connections after unsuccessful transaction setup or rollback.

The helper now allows at most three attempts for a recognised InnoDB deadlock or
lock-wait conflict **before commit**, and only after a confirmed full rollback. It
releases the connection and waits 10/20 milliseconds before reacquiring one. Each
attempt rechecks the current active account, role, membership and block rules through
the existing operation. A revoked account cannot rely on an earlier attempt's check.

An uncertain commit is never retried, even if its error resembles a lock conflict.
The client still requires an explicit retry of the identical encrypted packet and
message ID. This is distinct from restarting SQL work that is confirmed rolled back.
No crypto operation, provider call, HTTP resend or browser action is automatically
replayed. Report encryption may be recomputed only inside a rolled-back database
attempt, before any report/block/head change has committed.

Connections with failed setup, failed rollback, fatal errors or uncertain commits
are destroyed rather than returned to the pool. Acquisition and rollback errors
become the existing sanitised `P2P_UNAVAILABLE` response. Ordinary validation,
authorisation and duplicate-key errors are not retried. No grants, schema, report
keys, roles, encryption formats or feature flags are changed.

## Evidence and limits

Ten synthetic transaction tests cover recovery after deadlock/lock-wait errors,
revocation between attempts, retry exhaustion, failed rollback/setup, unknown commit
outcomes, ordinary errors and connection acquisition failures. Before the fix, nine
of those ten tests failed. The restricted-MySQL suite additionally sends messages
from both peers at once, checks every encrypted packet is retained exactly once and
retries an already accepted packet without duplicating it. CI runs this with the
existing two-account browser acceptance. Exact-head build and CI outcomes belong in
the pull request; a passing build is not production messaging acceptance.

The production activation boundaries remain those in
[the implementation review](P2P_MESSENGER_REVIEW_2026_10_27.md): the separately reviewed
schema/grants, report-key handling and recovery, genuine eligibility/moderation
processes, privacy/retention readiness and physical-device acceptance. Messaging
remains off until those requirements are met. No complete-security, immutable-ledger,
verified translation quality or multi-member group-chat claim is made.

Primary references checked during review:

- [MySQL 8.4 — InnoDB error handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html):
  deadlocks roll back a transaction; lock-wait timeouts can roll back only a statement.
  Explicitly rolling back the full attempt is necessary before replaying its work.
- [MySQL 8.4 — Handling deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html).
- [W3C Web Cryptography](https://www.w3.org/TR/webcrypto/).
- [OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html):
  device encryption does not establish browser authentication or protect an unlocked
  page from same-origin script compromise.
