# SPEC_v29.md — LUQI AI v29.0.0 (Omega Engine v2)

Extends `/mnt/agents/output/SPEC.md` (read it first — ALL v1 requirements still apply: single file `/mnt/agents/output/omega.py`, Python 3.11, stdlib-only, ASCII-only source, CLI-only, no unhandled exceptions, masked secrets, `--selftest`, one-shot argv mode). This spec ADDS three modules and rebrands. Version string: `LUQI AI v29.0.0` (banner: `LUQI AI v29.0.0 - Unified Master Engine`).

## Module A — Persistent Memory
- File: `omega_memory.json` in cwd (fallback: user home dir if cwd unwritable). All I/O guarded.
- Schema: `{"facts": [str], "history": [{"ts","role","text"}], "datasets": {"last_import": {...}}, "sessions": int}`
- Boot: load memory, increment `sessions`, restore last-import dataset reference, print remembered-facts count in banner line.
- Every REPL exchange appended to `history` (cap: keep last 200 entries, trim oldest).
- New commands:
  - `remember <fact>` — append to `facts`, save, confirm.
  - `recall` — list all facts (numbered).
  - `forget <n>` — delete fact #n, save, confirm.
  - `history [n]` — show last n (default 10) exchanges.
- Save on: remember/forget, import, and clean exit. Never crash on corrupt JSON (backup to `.bak`, start fresh).

## Module B — GitHub Auto-Sync
- New commands:
  - `sync github` — if `git` binary exists (`shutil.which`) AND `.env` has `GITHUB_REPO` (owner/repo or full URL): run `git add omega.py omega_memory.json omega_log.jsonl` + `git commit -m "LUQI AI sync <timestamp>"` + `git push`. Use `subprocess` with `capture_output`, 30s timeout, guarded. Optional `.env` `GITHUB_TOKEN` — may be embedded in remote URL but NEVER printed (mask in all output).
  - `sync status` — show git availability, repo configured yes/no, last commit line (`git log -1 --oneline`) if in a repo.
- Missing git / not a repo / no GITHUB_REPO → clear graceful message with setup hint, no traceback.

## Module C — Excel/CSV Data Import
- New commands:
  - `import <path>` — load `.csv` via `csv` module; load `.xlsx` via STDLIB-ONLY minimal reader (xlsx = zip: parse `xl/sharedStrings.xml` + first `xl/worksheets/sheet*.xml` with `xml.etree.ElementTree`; handle shared strings, inline strings, numbers; first row = headers). Other extensions → polite error.
  - `analyze` — summary of current dataset: row count, column names, per-column non-empty counts, numeric min/max/mean for numeric columns, top 5 values for text columns.
  - `query <text>` — case-insensitive substring filter over all cells; print matching rows (max 15) with row numbers.
- Datasets capped at 50,000 rows (refuse larger with clear message). Store import metadata in memory `datasets.last_import`.
- Imported dataset must be referenceable by `tax`/`mine` subsystems: if a dataset is loaded and user runs `tax`, append a one-line note that N rows are available for analysis.

## Selftest additions (all must PASS)
- Memory roundtrip in a temp cwd: remember/recall/forget, corrupt-JSON recovery.
- Import of a generated CSV (3 cols x 5 rows) + analyze + query.
- Import of a minimal generated XLSX (build a real .xlsx via `zipfile` in the test).
- `sync status` with no git repo → graceful message, no exception.
- Total selftest must still exit 0.

## Keep intact
All 9 v1 subsystems, exact v1 pillar messages, free-text routing, `[OMEGA] > ` prompt, KeyboardInterrupt/EOFError handling, `omega_log.jsonl` audit trail.
