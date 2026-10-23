# Separate schema preparation from the web identity

The production web process performs a bounded, read-only schema preflight before
opening its HTTP listener. It never imports the schema bootstrap or automatic
traditional-medicine seed. Existing records are untouched. An absent database
configuration permits a static preview with degraded readiness; a configured
but unreachable, invalid or incompatible database exits with status 1 before
listening. Raw SQL, connection strings and driver errors are redacted.

## Operator commands

`npm run build` packages `dist/prepare-mysql-schema.js` alongside the web and
password-recovery commands. Supply connection settings through the protected
environment of the operator process, never URL arguments or chat messages.

| Command | Identity | Effect |
|---|---|---|
| `npm run db:check` (or the binary without arguments) | Web identity | Read-only validation of the enabled runtime schema and SELECT access |
| `npm run db:apply` | Separate schema operator | Explicitly create missing base tables, then validate; never seed records |

The additive base bootstrap contains 38 `CREATE TABLE IF NOT EXISTS` statements.
It is idempotent but is **not** a versioned migration engine: it cannot repair
existing column/index drift, does not perform ALTERs, and MySQL DDL is not one
atomic transaction across all statements. A failure is nonzero in every mode;
some earlier creates may already have committed. Check the schema after any
interrupted apply. Review future versioned changes and backup/rollback needs
separately. The Omega table remains its separate opt-in migration; the base
command does not create it or enable workers.

Never place a privileged migration URL in the web service environment or run
schema apply automatically on each web restart. Run required additive changes
privately before deploying code that depends on them. Do not expose a database
TCP proxy to perform this work.

## Web permissions

Provision a dedicated, non-root account over an approved private SQL/operator
channel. Use a generated secret and narrow host/network scope supported by the
deployment. Do not reuse a schema, backup, recovery or worker credential. The
current web operations require these table-level privileges in their selected
database; grant no database-wide or global privileges and no GRANT OPTION:

| Table | Permissions |
|---|---|
| users | SELECT, INSERT, UPDATE |
| companion_conversations | SELECT, INSERT, UPDATE, DELETE |
| companion_messages | SELECT, INSERT, DELETE |
| companion_memories | SELECT, DELETE |
| offline_sync_queue | SELECT, INSERT, UPDATE |
| auth_attempt_windows | SELECT, INSERT, UPDATE, DELETE |
| ai_pilot_monthly_spend | SELECT, INSERT, UPDATE |
| ai_pilot_daily_user_usage | SELECT, INSERT, UPDATE |

There is no runtime CREATE, ALTER, DROP, TRUNCATE, FILE, CREATE USER, GRANT, or
access to unrelated legacy tables. Password recovery needs its own protected
operator access to users and legacy sessions. Backup credentials must be
reviewed against the dump strategy independently. The shared web account still
has access across app users; owner isolation remains enforced by authenticated
queries, not MySQL row-level security.

Preflight checks the eight core tables, their required columns, InnoDB engines,
critical guard counter/key types and nullability, and full-column unique keys.
Prefix uniqueness is insufficient. It verifies SELECT resolution with LIMIT 0,
without reading private rows. It does not exercise DML at startup, certify every
legacy table or validate every SQL default, check constraint or grant. When
`LUQI_OMEGA_WEB_ENABLED=true`, the opt-in Omega table and its SELECT access also
become mandatory; this does not activate a worker or verify worker permissions.

## Rotation, release and rollback

1. Verify recent backups and retain the known-good image and protected old
   connection setting. Provision the new account privately without changing
   existing accounts or data.
2. Apply any reviewed schema changes with the separate operator identity.
   Run `db:check` with the proposed web identity.
3. Test that identity in an isolated acceptance environment: signup/login,
   private conversation writes/export/deletion, offline operations, shared auth
   guards and budget reservations. Do not enable paid APIs to test SQL grants.
4. Deploy this migration-free runtime before switching production credentials.
   Then change only the protected web connection setting, redeploy and verify
   readiness plus designated-account acceptance. Keep paid AI/billing and Omega
   intake/workers disabled under the current rollout policy.
5. If validation or acceptance fails, restore the prior protected connection
   setting and the compatible image. Preserve data and all guard/task tables.
   An older image that performs startup DDL will need its prior operator-level
   setting; do not grant DDL back to the restricted identity to make it boot.
6. Revoke the old application's access only after the acceptance and rollback
   window. This code change does not rotate any production password or claim
   that the production service already uses the restricted account.

## Disposable evidence

The restricted-role CI job requires an exact loopback fixture URL and explicit
CI flag, creates a fresh MySQL 8.4 database, builds the actual production bundle,
and provisions only the grants above. It checks explicit apply versus read-only
checks, denied DDL/admin/legacy access, real signup/login, private ownership,
restart persistence, export/deletion, and failure before listening for missing
tables, missing/prefix unique indexes, unsafe counters, non-InnoDB storage,
unreachable configuration and optional Omega schema/access. These fixtures are
synthetic and cannot establish production credential rotation or recovery.
