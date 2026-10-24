# Local recovery drill — remaining launch evidence

This is an operator tool, **not a new production endpoint or backup schedule**.
It never receives a database URL, source credential or existing target name. It
accepts a trusted local MySQL 8.4 logical gzip export, checks its independently
recorded SHA-256, and (only with `--execute`) restores into a newly named local
Docker container. It cannot inspect Railway's backup inventory or retrieve data
from Railway. A Railway volume snapshot is not this tool's input format.

## Safety boundaries

The Docker host is fixed to the local Linux Unix socket. Docker contexts and
source/provider credentials are not inherited. The preloaded `mysql:8.4` image is
resolved to its immutable local image ID; the tool never implicitly pulls an
image. It creates no hosted resource and publishes no ports. The destination
uses `--network=none`, a non-root OS user, a read-only root filesystem, dropped
capabilities, disabled event scheduling and local-file imports, and temporary
in-memory database storage. No host directory or Docker socket is mounted into it.
The isolated socket-only server uses a disposable empty password, never a real
credential. Noninteractive MySQL client commands are disabled with `--binary-mode`.

The original backup is read-only. Owned file permissions must exclude group and
other users. Symlinks, wrong checksums, corrupt gzip, wrong engine/version, large
files and existing evidence paths are refused. Limits: 128 MiB compressed,
512 MiB expanded SQL, 1 GiB temporary MySQL data, 2 GiB container memory, one CPU.
The initialization, import, readback and cleanup commands have deadlines. Larger
or non-8.4 exports need a separately reviewed procedure, not a silent bypass.

After import without SQL errors, the tool checks the eight enabled runtime tables
are InnoDB and reads the restored schema/data back through mysqldump. It removes
only the container it created and refuses to return successful evidence unless
removal is confirmed. Interrupted or killed hosts may require local cleanup;
inspect containers labelled `luqi.restore-drill=isolated`. There is no claim of
secure erasure: temporary host files, Docker-host administration and possible
host swapping remain privacy concerns. Use a trusted encrypted Linux workstation
with adequate storage/memory, and an approved private temporary directory.

**Never upload production dumps, private reports, credentials or customer data
to GitHub issues, Actions artifacts, this chat, or a shared machine.** CI refuses
`--source-kind production-derived`; that label is an operator declaration, not
proof of provenance. The tool is for trusted exports, not hostile SQL sandboxing.

## Operator procedure when the approved export is available

First obtain an approved logical export using the existing backup process and
record its source version, UTC timestamp and hash privately. Retain the source
backup unchanged. Preload and review the official MySQL 8.4 image separately on
the approved local host. Do not restore anything into the running Railway service.

Run the no-database precheck first, from the reviewed repository revision:

```sh
python3 scripts/verify-local-mysql-backup.py \
  --backup /private/path/backup.sql.gz \
  --sha256 "$RECORDED_BACKUP_SHA256" \
  --source-kind production-derived \
  --report /private/path/precheck.json
```

Then repeat with a different report name and `--execute` to perform the isolated
database import/readback. Paths above are placeholders, not invitations to copy
production data into CI. Keep report files private; the tool creates them as 0600
and does not include SQL, account details, source paths or note content.

## What this evidence establishes — and what it does not

`preflight_only` means **no restore happened**.
`isolated_import_and_readback_passed` means that specific compressed export was
accepted, imported and readable in the isolated MySQL instance, which was then
removed. It does not prove the export is current, complete relative to its source,
or equivalent to all source rows. It is not full schema-contract, functional
application acceptance, retention compliance, or a production failover rehearsal.
Every report explicitly leaves `launch_approved` and
`source_data_equivalence_verified` false.

The CI workflow uses the existing 38-table disposable account/quota fixture and
actual `scripts/backup.sh`, then exercises this exact tool. This proves the tool's
operation on fixture data only; **production recovery stays open** until an
operator provides privately reviewed production-derived evidence, source-data
reconciliation and agreed recovery-time/recovery-point targets. A backup inventory
screenshot alone does not establish successful recovery.

## Primary references

- MySQL logical exports and reloads: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL noninteractive client controls: https://dev.mysql.com/doc/refman/8.4/en/mysql-command-options.html
- Docker networking isolation: https://docs.docker.com/engine/network/drivers/none/
- Docker temporary storage and swap caveat: https://docs.docker.com/engine/storage/tmpfs/
