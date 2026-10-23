# Separate schema preparation from the web identity

The production web process performs a bounded, read-only schema preflight before
opening its HTTP listener. It never imports the schema bootstrap or automatic
traditional-medicine seed. Existing records are untouched. An absent database
configuration permits a static preview with degraded readiness; a configured
but unreachable, invalid or incompatible database exits with status 1 before
listening. Raw SQL, connection strings and driver errors are redacted.

## Operator commands

`npm run build` packages `dist/prepare-mysql-schema.js` and
`dist/prepare-mysql-runtime-role.js` alongside the web and
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

## Dedicated role operator

The private `prepare-mysql-runtime-role` CLI defaults to `--check`: it connects
as the proposed web identity and validates its exact grants and runtime schema
without changing users or tables. `--provision-new` explicitly creates the fixed
`luqi_web_runtime` identity only when no identity with that name exists, then
grants exactly the eight table-level permission sets below and verifies them.
It never alters passwords, revokes privileges, drops accounts or migrates data.
Retries refuse an existing identity; if a DCL operation fails midway, preserve
the partial identity and review it privately instead of retrying creation.

The operator process receives its existing protected MySQL `DATABASE_URL` and
an independently generated 32-byte hex `LUQI_RUNTIME_DB_PASSWORD`. No secrets
are accepted as arguments, printed or returned. Production connections must
use Railway private DNS; the only loopback exception is the exact CI fixture.
The command rejects a reused operator password and an enabled Omega intake.
It also rejects any inherited role or extra grants when checking the result.

Run the utility in an existing private Railway console/operator process, not
an HTTP endpoint, web startup or automatic deployment hook. After verification,
switch only the web `DATABASE_URL` to the dedicated identity, remove the
one-time password variable, redeploy and verify readiness and release probes.
Keep the old connection reference in the protected operator/rollback boundary,
not the new web process. Do not revoke MySQL's root/operator identity as part
of this app-only transition, and do not describe it as historic root-secret
revocation. No database restart or public TCP proxy is needed.

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
   readiness plus designated-account acceptance. Preserve the separately approved
   AI budget/activation settings; customer billing and Omega intake/workers stay disabled.
5. If validation or acceptance fails, restore the prior protected connection
   setting and the compatible image. Preserve data and all guard/task tables.
   An older image that performs startup DDL will need its prior operator-level
   setting; do not grant DDL back to the restricted identity to make it boot.
6. Revoke the old application's access only after the acceptance and rollback
   window. This code change does not rotate any production password or claim
   that the production service already uses the restricted account. Record the
   actual deployment evidence separately after the operational switch.

## Disposable evidence

The restricted-role CI job requires an exact loopback fixture URL and explicit
CI flag, creates a fresh MySQL 8.4 database, builds the actual production bundle,
and provisions only the grants above. It checks explicit apply versus read-only
checks, denied DDL/admin/legacy access, real signup/login, private ownership,
restart persistence, export/deletion, and failure before listening for missing
tables, missing/prefix unique indexes, unsafe counters, non-InnoDB storage,
unreachable configuration and optional Omega schema/access. These fixtures are
synthetic and cannot establish production credential rotation or recovery.

## Verified production transition, 2026-10-23

PR #193 passed all six workflows after correcting the browser fixture to use
the same provisioned identity. The private Railway console then ran the actual
packaged `--provision-new` operator on deployment
`76c52b73-8d91-47a5-8714-1cd8db4edec3`; it returned validated, eight tables,
dedicated_web and table_only. No application records or application schema tables were changed.

The web connection was replaced with the new dedicated identity and the
one-time password variable was cleared. Deployment
`8faffbf1-bfd0-4f41-8768-2290fb37a8df` reached SUCCESS. A private read-only check
confirmed eight valid runtime tables, the expected current identity, nine grant
rows (USAGE plus eight table grants), no inherited roles and a cleared one-time
variable. MySQL retained deployment `3776e76d-1621-485f-8fc9-67f5d16263c2`.

That restricted-role deployment is a compatible rollback reference. An earlier
root-configured snapshot can reintroduce the old operator connection, so review
its configuration rather than rolling back blindly. Root/operator credential
revocation and designated human-account acceptance are not established here.
The initial 941 MB backup and next scheduled backup were visible; no restore
was run over production and no claim of production-derived recovery is made.
