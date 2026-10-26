# LUQI P0 — read-only backup inventory and real restore acceptance

**Date:** 25 October 2026 (Africa/Johannesburg) · **Status:** RECOVERY ACCEPTANCE OPEN.

## Verified scope and limits

- Correct production project: Railway **kind-spontaneity**, project `9f627cb8-3136-4b30-89d2-32ca648a1e5f`.
- Environment: **production**, `1e192ef3-1fa6-4684-81fc-60165c7b0e22`.
- MySQL service: `8094576f-f2c7-4e50-b474-69661e7c0ba8`, NOT the older PostgreSQL service in `comfortable-illumination`.
- Persistent volume: `d02ad924-218c-4afc-a886-0cee686bc62b`, mounted at `/var/lib/mysql`.
- On 25 Oct, read-only Railway service checks reported web/MySQL **one running, zero crashed** each, no staged changes. Disk usage was about 0.94 GB. This is **not** a verified backup inventory or a restore result.
- Earlier records mention a 941 MB backup and daily schedule / six-day retention on 23 Oct. Those observations **must be refreshed**; do not assume the schedule ran today.
- The Railway connector in this chat exposes service/volume state, but does **not** provide backup-list or schedule-list read actions. Never substitute disk usage for a backup count.

## Operator-only read-only backup inventory

Railway documents `volumeInstanceBackupList` and `volumeInstanceBackupScheduleList` GraphQL **queries**:
https://docs.railway.com/integrations/api/manage-volumes#list-backups

`scripts/read-railway-backup-inventory.py` makes **one bounded, TLS-validated, read-only GraphQL POST** to the fixed official API endpoint. It refuses redirects, checks GraphQL errors even if HTTP succeeds, caps the response, never retries, and verifies the exact LUQI volume ID + **MySQL** service name + mount path. It never retrieves a snapshot, opens a database, reads variables, restarts services, changes settings, or invokes any AI provider.

A Railway **volume-instance ID** is not the same as the known volume ID above. Obtain the correct production volume-instance ID from the authenticated Railway dashboard or an authorised existing read-only API view. If it cannot be resolved, record a visibility gap, not a backup count.

On an authorised owner's protected machine (NOT GitHub Actions, a shared shell, or this chat), use an **existing, authorised** Railway token in that machine's protected environment. Never share, paste or commit it. For an account/workspace token already set as `RAILWAY_API_TOKEN`:

```sh
python3 scripts/read-railway-backup-inventory.py \
  --volume-instance-id "CURRENT_VERIFIED_MYSQL_VOLUME_INSTANCE_UUID" \
  --auth-mode account-or-workspace \
  --private-report /approved/private/0700-directory/backup-inventory.json
```

For an authorised environment-scoped project token already stored as `RAILWAY_TOKEN`, change only `--auth-mode project`. The tool does not acquire tokens or make accounts. An unavailable token, insufficient permissions, unknown volume-instance ID, unexpected response, or query failure is **MONITORING GAP**. Do not weaken authentication to work around it. The optional report directory must already exist, be operator-owned, and be inaccessible to other users; the new report is `0600` and never overwritten. Keep it private: backup metadata can reveal operational posture.

Output contains counts, latest/oldest backup timestamps, metadata retention settings and the immutable expected resource IDs. It **intentionally does not print backup IDs, credentials, names, raw GraphQL responses or source SQL**. The API's `volumeInstance` lookup verifies the unique volume ID, mount and service name; project/environment IDs are configured expectations, not independently queried ownership attestations.

Even if backups and schedules appear in the result, all of these remain **false**:
`backup_contents_verified`, `production_derived_isolated_restore_verified`, `source_equivalence_verified`, `rpo_rto_approved`, `paid_launch_approved`. A scheduled job is neither a guarantee that it ran nor continuous monitoring.

## Further recovery acceptance — separate human authorisation required

1. Name a recovery owner. Privately check snapshot timestamps, schedule, expiration, retention, operator access, security and actual cost. Protect at least one usable recent point without altering the live volume.
2. With **separate permission** for production-derived extraction, independently collect a source-identified, encrypted, off-volume logical backup and SHA-256 through the existing approved backup runbook. Do **not** upload SQL/customer content to CI, GitHub, ChatGPT or shared storage.
3. Use `docs/LOCAL_RECOVERY_DRILL.md` on an approved encrypted workstation, only with the correct reviewed MySQL image and an *isolated* target. The script's fixture tests are NOT a production restore. Never click Railway's production **Restore** button for a rehearsal.
4. Independently compare recovery-source provenance and a consistent source snapshot against target: expected tables, InnoDB, constraints, customer ownership, private notes, quotas, authentication throttles and associated record integrity. Keep record-level proofs, hashes and counts in restricted storage, not a public ticket. Obtain designated real-account recovery acceptance.
5. **Measure and approve** end-to-end recovery-point and recovery-time objectives with a named operator; an isolated import duration alone is not RTO. Review backup retention/erasure and whether additional services require recovery.
6. Record only a redacted decision, timestamp (SAST), evidence owners and the remaining blockers in issue [#202](https://github.com/ttmodupe-hash/luqi-ai/issues/202). Do not change status to RECOVERED or paid-launch-ready merely because this tool ran.

No new schedule, snapshot, production backup, database connection, cost commitment, migration, API/billing activation or credential rotation is authorised by this file.
