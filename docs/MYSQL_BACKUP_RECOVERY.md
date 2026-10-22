# LUQI MySQL 8.4 — backup, restore and disaster recovery

**Status:** A disposable GitHub CI database has a tested *logical backup
and restore* procedure. This does **NOT** mean automated snapshots,
offsite retention, or a production restoration drill are already configured.

## Production safety rules

1. Identify the correct Railway MySQL service and deployment. LUQI's new
   production MySQL 8.4 service is distinct from the older PostgreSQL service
   whose name misleadingly contains `mysql`.
2. Before recording sensitive user data, the operator should configure
   automated volume snapshots or a managed backup plan in Railway, verify
   retention and encryption, and test restoring to a different project.
   See Railway's current backup guidance for the plan and account.
3. Independently schedule encrypted MySQL logical exports to a private,
   access-controlled backup store **outside the production database volume**.
   Never commit a dump, token, root password, or personal data to GitHub or
   include them in logs, screenshots, chat or CI artifacts.
4. Issue a dedicated backup account with minimum necessary privileges; do
   not use the Railway template's root URL for routine runtime operations.
5. Define RPO/RTO targets before public launch. A reasonable starting
   *proposal* is daily backups with 7–30 day retention, but that is not an
   implemented guarantee. Choose a recovery cadence based on business needs.
6. Rehearse restores regularly into an **isolated target MySQL 8.4 server**.
   Never overwrite the only production instance during a restore rehearsal.
7. Validate all application tables, account records, transaction references,
   monthly AI spend quotas and daily per-user quota rows; verify unique
   indexes and the InnoDB engine, not merely that `mysqldump` exits 0.
8. Review unusual access, schema migration, backup failures and spend-ledger
   reconciliation after each recovery; keep API providers disabled until
   budget limits and account ownership have been checked.
9. Store documented ownership, emergency procedures and tested restore
   evidence in an access-controlled operations system.

## What GitHub CI actually proves

`.github/workflows/mysql-live-integration.yml` provisions an ephemeral
MySQL 8.4 instance with fake credentials. Its second job seeds a sample
account and both pilot spending ledgers, runs a transactional `mysqldump`,
restores it into a newly created database, and checks 37 tables and the
survival of account and quota data.

Run the fixture against disposable CI only. The script
`scripts/ci-mysql-restore.sh` refuses any source URL other than the exact
disposable fixture and deletes its temporary SQL dump on exit.

This **does not** validate volume snapshot settings, true production data
recovery time, geographically separate backups, PITR, consistency across
other services, encryption policy, or live cross-version migration.

## Remaining launch gate

Before inviting customers, complete GitHub issue #144: set Railway backup
retention, least-privilege DB credentials, hosting spend notifications,
a production-like restore rehearsal and documented incident ownership.

## Explicit logical export command (not scheduled)

`scripts/backup.sh` supports `DB_ENGINE=mysql` using a MySQL 8 client.
The legacy default remains `postgres`; always set the engine explicitly for
Railway MySQL. Set `BACKUP_REDIS=false` when no Redis snapshot is required.
Supply `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` through the
operator's protected environment. Do not paste production credentials into
commands, workflow files, or chat. Use a dedicated backup account with the
privileges needed to export tables, triggers and routines.

```sh
DB_ENGINE=mysql BACKUP_REDIS=false BACKUP_DIR=/var/backups/luqi-ai bash scripts/backup.sh
```

The output directory must belong to the invoking user and exclude group/other
access. Exports use private temporary files and publish only after successful
database export and, if requested, actual Redis RDB download and remote upload.
Passwords are passed through client environment variables, never command-line
arguments; client diagnostics are discarded to avoid leaking credentials.
Use a trusted isolated host: same-user/root processes may inspect environments.

MySQL exports use `--single-transaction` for InnoDB and exclude database-selection
statements so restore tooling can choose a separate target. Avoid concurrent DDL
during export; this is not a consistent backup of nontransactional tables.
The CI restore job now exercises this exact script with a disposable MySQL 8.4
server and checks the restored application data and spending ledgers.

The script checks command failures, nonempty SQL, gzip integrity and the Redis
RDB header. Only a successful isolated restore proves recoverability. Local
exports are compressed, **not encrypted**. Use encrypted storage and restrict
access before processing production data. `S3_BUCKET` optionally uploads both
requested exports to an existing destination using the configured AWS CLI;
this neither creates storage nor proves its encryption or retention policy.
An upload failure may leave a partial remote set, but never reports success or
runs retention cleanup. No schedule, cloud storage, paid service, or production
backup is enabled by this code change.

`RETENTION_DAYS` defaults to 30 and must be positive. Cleanup runs only after
all requested exports/uploads succeed, and affects only matching local files
for the selected engine/database (plus Redis when requested). Configure remote
retention separately. Failed exports clean private temporary files and preserve
existing published backups.

## Complete fixture comparison

The isolated CI drill also compares deterministic logical dumps of the source
and recovered database, including all tables, password hashes, rows, indexes,
constraints, routines and triggers. Both fixtures remain quiescent during this
comparison. SQL stays in a private temporary directory and is removed on exit;
a mismatch fails the job without printing records. This expands fixture
coverage, but is still not evidence of a production backup schedule or restore.
