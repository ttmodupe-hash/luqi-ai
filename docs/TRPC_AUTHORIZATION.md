# tRPC account boundary

The authorization review found public archive reads/writes, arbitrary offline
queue owners and acknowledgements, and shared knowledge writes without an
administrator session. The archive also imported a service that wrote sample
workbooks and labeled them verified on process startup.

## Changed behavior

- Every registered tRPC procedure now passes an explicit procedure/type policy.
  Unreviewed procedures return `TRPC_PROCEDURE_UNAVAILABLE` before input parsing,
  storage or providers. This applies to direct calls, HTTP calls and each member
  of a batch. Adding a new method does not implicitly publish it.
- Only ping and the existing public content/knowledge reads remain anonymous.
  List limits are bounded to 100. This policy does not certify the accuracy of
  previously stored public content. Shared knowledge writes/quiz generation,
  unmetered search and legacy agent namespaces remain unavailable.
- Offline queue requests authenticate through the existing scoped JWT and
  current active MySQL account. Development has no bypass; `APP_SECRET` does not
  confer account or administrator authority. The API derives the owner rather
  than accepting `userId`. Reads/acknowledgements constrain both account and
  device; a device ID alone conveys no authority. Null-owner legacy rows remain
  untouched and inaccessible. There is no migration assigning them to users.
- Payloads are limited to 8 KiB; pages and acknowledgement batches to 100. The
  queue retains at most 1,000 rows per account, including acknowledged entries.
  Intake serializes on the account row in a MySQL transaction before counting.
  Reaching the cap returns `OFFLINE_QUEUE_LIMIT` without deleting data. These
  endpoints store/acknowledge records; they do not execute arbitrary actions or
  provide an end-to-end offline sync client. Retention, erasure and idempotency
  remain separate work.
- HTTP tRPC responses use `Cache-Control: no-store`, request bodies are limited
  to 64 KiB even without Content-Length, batches to ten calls, and error output
  excludes raw SQL, driver messages, input payloads and stack traces.
- The archive router no longer imports storage services or creates sample files.
  Existing files are preserved. `/archive` and `/vault` explain unavailable access
  and link to account-owned private notes, without polling or write controls.
  Restoring archive access requires owner-scoped persistence and retention design.

## Verification and release checks

`tests/trpc-authorization.test.ts` exercises every unreviewed registered
procedure, future-method default denial, method-type mismatch, encoded mixed
batches, all environment modes, input bounds, error redaction and body/batch
limits. `tests/mysql-live.integration.test.ts` adds real MySQL cross-account
isolation, forged-owner refusal, cursor pagination, credential revocation,
preservation of unowned rows and eight concurrent inserts at the storage cap.
The integration fixture runs only against disposable CI MySQL, never production.

The archive UI has component and 320px browser checks in both frontend builds.
`scripts/verify-trpc-boundary.mjs [base-url]` checks the built deployment without
valid credentials, provider calls or production data writes. Existing CI also
checks the Docker image, health, database migrations and isolated fixture restore.

No schema changes, production data edits, provider activation or billing changes
are included. This closes the reviewed tRPC boundary, not the entire legacy REST
or Python authorization surface. Production backup/restore verification, shared
login throttling and administrator RBAC are still outstanding. Rollback should
retain these guards or use a forward fix: the preceding release exposes the
legacy tRPC surfaces again.
