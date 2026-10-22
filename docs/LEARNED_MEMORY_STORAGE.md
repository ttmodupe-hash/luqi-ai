# Learned-fact storage reliability

`memory_manager.CrewAIUnifiedMemory` now appends facts to the existing locked,
checksummed local checkpoint format in `<storage_dir>/fact_journal/learned_facts.jsonl`.
Each acknowledged fact has passed file and directory fsync. Cooperating processes
on one trusted POSIX filesystem preserve concurrent additions; new instances
and existing readers reload persisted facts. IDs use UUIDs. Returned dictionaries
are detached copies, so callers cannot alter stored facts through a read result.

Invalid records, torn journal writes, unsafe legacy files and failed persistence
raise an error. They never silently become empty memory or a successful save.
A failed flush may have written bytes before failure: recovery must inspect the
journal; callers must not assume failure proves no write or blindly retry as an
exactly-once operation. This is not a distributed store.

## Existing installations

Stop all old-version writers before upgrading. The previous `unified_memory.json`
remains untouched and is read alongside the new journal. It must contain valid
fact records, be a regular non-symlink file, and have no group/other permissions
(for example mode 0600). Resolve permissions through a trusted operator; do not
replace damaged files with an empty list. Keep a protected backup before repair.
Rollback to old code cannot see journal facts, so preserve both files and export
verified records deliberately if a rollback is necessary.

## Scope and remaining work

This is the Python learned-fact component, not a new web companion-memory API.
It does not add tenant authorization or connect the independent Omega JSON
memory manager. Callers must supply an authorized, separate storage location
for each privacy boundary; never accept arbitrary paths from HTTP clients.
Trusted directory ancestors, filesystem access restrictions, durable volumes,
backups, retention and deletion policy remain operational requirements.

The current Railway web service has no attached data volume. This change does
not claim memory survives its redeployments, provision storage, enable a paid
provider, migrate production records, or execute a production recovery.

Offline tests exercise concurrent processes, restart recovery, failed flushes,
corruption preservation, read isolation, legacy compatibility, unsafe legacy
files, separate directories and invalid confidence inputs.
