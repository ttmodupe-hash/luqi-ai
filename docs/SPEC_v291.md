# SPEC_v291.md — omega.py v29.0.0 -> v29.1.0 delta

ALL v1 (`SPEC.md`) + v29 (`SPEC_v29.md`) requirements remain in force (single file, py3.11, stdlib-only, ASCII-only source, CLI-only, no unhandled exceptions, masked secrets). Extend `/mnt/agents/output/omega.py` IN PLACE.

## Changes
1. `VERSION = "29.1.0"`; banner line: `LUQI AI v29.1.0 - Unified Master Engine`.
2. New command `version` — prints version, subsystem count, session number, facts count.
3. New command `export` — writes `omega_export_<UTC timestamp>.md` (cwd): header, system_state, all facts, last import metadata, last 50 history entries, last 50 audit entries. Prints saved filename. Guarded I/O.
4. New command `report <topic>` — routes topic through `execute_omega_subsystem`, then writes `omega_report_<slug>_<UTCts>.md`: title, generated-at, subsystem used, key findings (from result dict), suggested next actions (3 generic + 2 subsystem-specific). Prints saved filename.
5. New command `lang <code>` — switches UI strings for: greeting, goodbye, help-header, unknown-command, remembered, forgot. Ship packs: `en` (default), `zu` (isiZulu), `xh` (isiXhosa), `st` (Sesotho), `af` (Afrikaans); architecture must allow adding the remaining 10 languages as data-only entries later. `lang` with no/unknown code lists available packs. Persist choice in memory; restore on boot.
6. `help` lists the 4 new commands. `status` shows version + active language.

## Selftest (must grow to >= 30 checks, all PASS, exit 0)
Add checks: version command output, lang switch zu->en roundtrip + persistence, export file created and contains a known fact, report file created with correct slug, unknown lang code graceful. Keep all 24 existing checks.

## Constraints reminder
No new dependencies. No emoji/unicode in source (language pack strings use ASCII-safe transliterations). Windows-compatible paths.
