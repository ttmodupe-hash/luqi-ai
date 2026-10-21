# LUQI flight-recorder and cognitive-memory integrity repair

**Scope:** An independent draft PR against `fix/companion-audit-reliability` (PR #96). No hosting, payment, Railway or Cloudflare operations.

## Confirmed problems in existing source
- `api/services/flightRecorder.ts` created fake `luqi_session_genesis` events, with a simulated `verified: true` tool response, whenever no thread was present; the fabricated fixture was also committed to `data/archive/checkpoints/luqi_session_genesis.jsonl`.
- The checkpoint record procedure accepted unvalidated `threadId` strings and used them as raw filenames.
- Filesystem failures were logged and swallowed while checkpoint recording was reported as successful.
- Thread summaries depended on process memory rather than enumerating verified persisted journals after restart.
- `api/services/cognitiveMemory.ts` seeded SARS tax and LUQI credit margin/pricing assertions as verified facts without current evidence, and acknowledged new facts even if their backing file write failed.
- Cognitive facts and their entity index were reconstructed from the hard-coded in-memory seeds, not the persisted JSON file.

## Changes
1. Remove the fabricated genesis fixture and all synthetic checkpoint and cognitive-memory seeding.
2. Reject unsafe thread IDs at the tRPC boundary **and** at the file-service boundary.
3. Read thread journals from disk, validate thread ID, sequential step numbers, checkpoint IDs and historical SHA-256-derived checksum before returning them; detect incomplete/tampered entries and reject symbolic-link files.
4. Return success only after synchronous write + filesystem sync; propagate write errors instead of suppressing them.
5. Rebuild thread listing from real files on disk, including after application process restarts.
6. Persist cognitive facts with a temporary file + sync + rename; re-read persisted data on every query/store, validate expected shape, derive entity memory from actual facts, and reject prototype-polluting property names.
7. Add unit tests for empty archives, restart rehydration, tamper rejection, directory/path traversal, symbolic-link protection, and storage failures.

## Important boundaries
- The **legacy 16-character SHA-256 fragment is a corruption/tamper-evidence checksum**, not an authenticated signature or immutable audit ledger. An attacker with filesystem write access can recalculate it.
- The journal and cognitive JSON file are **LOCAL storage**. These changes do not make them reliable in Railway/Cloud Run ephemeral containers or safe across multiple writers/replicas. Railway volume persistence, a private database/object storage migration, concurrency control, backups and recovery tests remain blocking before a distributed production release.
- No claim is made that historical logs are complete, that previous synthetic entries were real, or that tax rates/AI pricing are current.
- Cognitive facts are administrator-only operational records, **not evidence-grounded user-facing memory**. Converting them to per-user agent memories requires identity/ownership, consent, retention and encryption reviews.
- Existing external fixtures, training content or data references outside the deleted genesis fixture were not rewritten.

## Release gate
Run the CI workflow on the exact PR head; review any test failures; then explicitly approve a separate staging data migration and backup/restore process before release. Do not merge to `main` while the unresolved automatic deployment guard remains in draft PR #100.
