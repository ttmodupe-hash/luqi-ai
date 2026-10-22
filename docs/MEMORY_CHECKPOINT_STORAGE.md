# Local checkpoint persistence

`LangGraphCheckpointer` records snapshots through `LocalCheckpointStore`.
The store appends JSONL files under `LUQI_ARCHIVE_PATH/checkpoints` and recovers
history from those files when read or reopened. The optional Postgres saver is
not the persistence backend for this wrapper's `save_checkpoint` method.

## Guarantees within the local store

- Thread IDs must be 1–128 ASCII letters, digits, dots, underscores or hyphens,
  starting with a letter or digit. Invalid IDs are rejected, not renamed or
  normalized into another session's file.
- Directory-relative file opens and no-follow flags reject symlink targets.
  The configured archive root is trusted operator configuration.
- Checkpoint directories use mode 0700; written files use mode 0600.
- POSIX file locks coordinate cooperating writers on the same filesystem.
  The next sequence number is derived from validated on-disk history under
  the lock, including after a process restart.
- A successful save requires file and directory synchronization. Failed writes
  raise `CheckpointPersistenceError`; callers must not report a saved checkpoint.
- Invalid JSON, truncated records, checksum mismatches, incorrect thread IDs
  and broken sequences cause recovery/append to fail. The existing file is
  retained for investigation rather than reset, skipped or overwritten.
- Returned JSON values are detached from the stored snapshot. Changing a
  returned dictionary or the original payload cannot rewrite past records.

Existing valid JSONL records with the original checksum format remain readable.
Old files with duplicate sequence numbers from earlier restarts are rejected;
retain an original copy and perform an explicit reviewed repair before use.
An I/O failure can leave a partial or already-written record. Inspect/recover
that history before retrying an operation with external side effects.

## Operational limits

This is local checkpoint storage, not an immutable audit ledger or distributed
task queue. The checksum detects accidental corruption; it is not a signature.
The implementation requires POSIX locking, directory descriptors and no-follow
support. Unsupported filesystems/platforms fail rather than drop these controls.

Deployments need an appropriately protected persistent volume and tested backups
to retain files across restarts/redeployments. The currently deployed Node web
service does not gain such a volume from this code change. No storage service,
worker, provider, billing switch or production data migration is enabled here.

`MemoryManager` conversation turns and context are still process-local. Its
checkpoint snapshots contain event metadata, not complete conversation content;
checkpoint recovery does not restore conversation memory. Host applications
remain responsible for tenant authorization before exposing thread histories.
