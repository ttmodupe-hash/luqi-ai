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
