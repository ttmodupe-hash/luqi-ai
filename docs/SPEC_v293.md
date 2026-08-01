# SPEC_v293.md — omega.py v29.2.0 -> v29.3.0 "Launch-Grade"

ALL prior specs remain in force. Extend `/mnt/agents/output/omega.py` IN PLACE. Single file, py3.11, stdlib-only, ASCII-only source, CLI-only, zero unhandled exceptions, all 48 existing selftest checks keep passing.

## 1. Version
`VERSION = "29.3.0"`; banner `LUQI AI v29.3.0 - Unified Master Engine`.

## 2. Process-isolated sandbox (REPLACES thread-based exec in the evolution gate)
Goal: kill the two v29.2.0 disclosed limits (zombie threads, no memory ceiling).
- Gate 2 (contract exec) reimplemented with `multiprocessing.get_context("spawn")`: candidate runs in a child Process; result via `multiprocessing.Queue`; `join(timeout=3.0)`; if still alive -> `terminate()` + `join()` -> reject as timeout. After every gate run assert no child process remains alive (no zombies — direct fix).
- Memory ceiling: in the child target, BEFORE exec'ing candidate code, try `import resource; resource.setrlimit(resource.RLIMIT_AS, (268435456, 268435456))` (256 MB) inside try/except (ImportError/ValueError) — POSIX gets a hard cap (MemoryError -> rejection), Windows documented as timeout-only (comment + REVIEW note). Keep the SAME restricted-builtins namespace and AST gate order (AST gate first, unchanged).
- Spawn-safety: worker target must be a module-level function; omega.py already guards `__main__`; multiprocessing must never be invoked at import time.
- Selftest additions: (a) infinite-loop candidate rejected via timeout AND no live child processes remain after; (b) on POSIX, memory-bomb candidate (`x = list(range(10**8))`) rejected (MemoryError path); on non-POSIX, check documents skip; (c) safe candidate still accepted end-to-end.

## 3. Optional claude_engine bridge (dogfooding, zero-dep guarantee preserved)
- Boot: try `from claude_engine import ClaudeLikeEngine` -> BRIDGE_AVAILABLE flag. NEVER a hard dependency; absence is silent except in status surfaces.
- `_llm()`: if BRIDGE_AVAILABLE and OPENAI_API_KEY set -> lazy singleton ClaudeLikeEngine(model=.env OMEGA_LLM_MODEL default "gpt-4o-mini", provider "openai", api_key from env; if ANTHROPIC_API_KEY also set, configure fallback_provider="anthropic" with fallback model "claude-3-5-sonnet-latest"); call .chat(); ANY exception -> fall back to existing urllib path. Behavior identical from outside.
- New command `bridge`: reports available/not (+ how to enable: clone repo, pip install -e .), active provider + fallback, circuit-breaker stats() if engine instantiated.
- `integrations` gains a 6th row: claude_engine bridge (available / not installed / no key).
- Selftest: imports + all commands work with claude_engine ABSENT (the sandbox env does not have it installed — this is the natural test condition).

## 4. Complete the 15 language packs (data-only)
Add to LANG_PACKS (existing en/zu/xh/st/af): `tn` Setswana, `nso` Sepedi, `ts` Xitsonga, `ve` Tshivenda, `ss` siSwati, `nr` isiNdebele, `sw` Swahili, `am` Amharic (ASCII transliteration), `yo` Yoruba, `ha` Hausa. Same 6 UI strings each (greeting, goodbye, help-header, unknown-command, remembered, forgot), ASCII-safe transliterations, respectful and correct. `lang` list shows all 15 with native names. Selftest: pack count == 15, switch to 2 of the new packs roundtrip.

## 5. Launch readiness
- New command `launch`: pre-flight GO/NO-GO checklist printed as a table: version current, selftest core pass, pillars integrity OK, memory writable, strategy module present, per-integration key status (github/serper/openai/openrouter/bridge), site version note. Final line: `LAUNCH READY` or `NOT READY: <comma-separated blockers>` (blockers = missing pillars/memory/selftest failure ONLY; missing optional keys are WARN, not blockers).
- New file `/mnt/agents/output/LAUNCH_CHECKLIST.md`: human launch runbook — engine selftest (48+ PASS), .env keys, `launch` command GO, `sync github` push, website publish via the platform 发布 button, post-publish smoke (visit site, check badge v29.3.0), rollback note (previous website version + git history). ASCII.

## 6. Selftest total: >= 56 checks, all PASS, exit 0, idempotent.

## 7. README bump to v29.3.0 (orchestrator will handle site/push; coder updates the engine only + LAUNCH_CHECKLIST.md).
