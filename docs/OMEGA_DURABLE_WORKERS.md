# Durable Omega workflow contract

`omega_ai.mysql_workflow.MySQLWorkflowEngine` is an opt-in Python library for
MySQL 8.4/InnoDB. The Node web service does not import it, apply its migration or
start workers. An opt-in [authenticated queue bridge](OMEGA_WEB_BRIDGE.md) now
shares its storage contract for two bounded calculations; production activation
and user-facing task controls remain outstanding.
Provider activation and billing stay disabled.

## Storage and claims

Apply `db/migrations/20261023_omega_tasks.sql` explicitly to an approved target.
The additive, repeatable migration creates only `omega_tasks_v1`; it does not
modify existing LUQI tables. CI applies it twice while preserving a task.
Do not apply it to production as a side effect of importing a module or starting
the current web service. Production rollout requires reviewed host integration,
database permissions, capacity, retention and a backup/restore plan.

Each operation obtains a fresh PyMySQL connection from a host-supplied factory,
sets UTC and READ COMMITTED, then commits or rolls back a short transaction.
No connection or schema is created on import or construction. Connection errors
produce `StorageUnavailable`, without credentials, payloads or fallback storage.
An unknown commit outcome is never reported as confirmed success or failure.
Inspect the task using its owner-scoped idempotency key before deciding how to
proceed; a failed response is not permission to repeat an external action.

The unique binary `(owner_id, idempotency_key)` index arbitrates submissions
across connections. Identity/key case remains significant. A row lock commits
the claim, attempt increment, UUID claim token and expiration together **before**
handler invocation. The transaction ends before invoking host code. Other tasks
can progress while a handler blocks. A new process sees committed state.

Claim time, heartbeat time, retry eligibility and recovery use MySQL's UTC clock;
the durable API does not accept a caller-supplied clock. Lease duration is an
integer from 1 to 3600 seconds, default 60. Trusted handlers receive
`DurableTaskContext`, extending the existing task/owner/key/attempt context with
`heartbeat()`. Long operations must renew before expiry. Renewal and completion
lock the row and require both the current token and an unexpired lease. An old
worker cannot extend a replacement claim or overwrite its outcome (`LeaseLost`).
No timer, daemon, queue polling or renewal thread starts automatically.

## Recovery and effects

The host explicitly calls `recover_expired(actor=..., limit=...)`, a bounded,
owner-only operation (1–100 tasks). Competing recovery processes use
`FOR UPDATE SKIP LOCKED`. Recovery reads the **persisted** effects classification,
even when no handler is registered in that process.

| Interrupted work | Recorded outcome |
|---|---|
| Read-only, attempts remain | `retry_wait`, exponential backoff, next attempt remains bounded |
| Read-only, attempt limit reached | `failed` |
| Side effect may have occurred | `reconciliation_required`, never automatically retried |

Approval remains owner-only and requires the separate human-authorization
callback. A callback holds no transaction open; cancellation and authorization
are checked again afterwards. Cancellation is allowed only before execution.
Handler exceptions/results that cannot be safely serialized become fixed error
codes. Side-effect errors, interruptions and expired claims require reconciliation.
No automatic reconciliation or operator override is included.

Leases cannot stop a process from continuing an external call after expiration.
Read-only work may consequently overlap after recovery. Side-effect work is
quarantined, and real providers must support idempotency and verified outcome
reconciliation before use. This is **not exactly-once external execution**.
Classify billable requests and all externally observable changes as side effects.
Never mark a handler read-only simply to bypass approval or allow retries.

## Host and data requirements

- Supply `authorizer(actor, action)` tied to a verified request/session or a
  separately reviewed delegated worker identity. Every public task operation
  defaults to deny. A string or hardcoded account allowlist is not authentication.
  The web bridge implements active-account authentication and a narrow delegated
  worker policy for its two handlers. General operator RBAC and other domain
  APIs remain outstanding.
- Register trusted handlers with `side_effects=...` and a stable `version=...`.
  Workers must match the stored version and effects classification. Version
  changes require a new registration name or an explicitly reviewed migration;
  deployment must never silently reinterpret pending work or existing approval.
  This version check relies on the host changing its version when behavior changes.
- Handlers must authorize domain resources using `context.owner_id`, regardless
  of any claimed owner inside the payload. Policies/handlers are trusted host
  code, not user-supplied plugins or a sandbox.
- Payloads are strict JSON objects up to 16 KiB; results are JSON values up to
  64 KiB. Nesting is capped at 32, integers at signed 64 bits, and floats must be
  finite. Tuples, datetime, dataclasses, Decimal and arbitrary objects are rejected.
  Domain hosts must deliberately convert dates and exact money amounts to strings
  with an explicit schema/version; there is no pickle or automatic coercion.
- Task data is persisted as JSON, not application-encrypted. Do not submit
  credentials, tokens or sensitive conversation contents. Before production use,
  configure restricted DB access, encrypted transport/storage, retention and
  erasure, account deletion linkage, quotas and safe diagnostics. The engine does
  not read `DATABASE_URL`, configure TLS or manage secrets on the host's behalf.
- The runtime account should have only required SELECT/INSERT/UPDATE rights on
  the task table. Run schema migration separately with an approved migration role.
  Never share a live connection between threads or use untrusted connection factories.

## Verification and rollback

`.github/workflows/omega-mysql.yml` starts disposable MySQL 8.4 and runs
`tests/test_omega_mysql_integration.py`. The suite connects only to a hardcoded
loopback CI database after explicit CI opt-in; it never reads a production URL.
It exercises repeatable migration, independent processes, forced process exit,
concurrent submissions/claims/batches/recovery, owner isolation, approval races,
heartbeat, stale completion/renewal, handler contract mismatch, bounded attempts,
invalid results, claim rollback and loss of storage after a possible effect.
Offline input/policy tests run in the existing Python 3.10/3.11/3.12 matrix.
These fixture results do not verify production backup recoverability.

For a future activated worker release: stop new claims first, inspect/drain
active work, and quarantine ambiguous external outcomes. Roll back code while
preserving the table and its rows. Do not drop the table, reset ambiguous tasks
to pending, or let old code ignore persisted handler versions. This PR has no
production migration or worker activation to undo.

Implementation references: [MySQL locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html),
[PyMySQL connections](https://pymysql.readthedocs.io/en/latest/modules/connections.html).
