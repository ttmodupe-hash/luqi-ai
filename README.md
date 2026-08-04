- v29.10.0 "Know Your Rights": rights & travel subsystem (SA-deep + universal world layer), tourism guides, map/directions opener, roadblock log, whereami.
- v29.9.0 "Study Hall": study <topic> teaches from your own documents, .docx/.xlsx ingestion, backup command.
- v29.8.0 "Deep Reader": IDF-ranked document Q&A, ingest <url> web page ingestion, professor-only classroom voice (voice all restores full speech).
![selftest](https://github.com/ttmodupe-hash/luqi-ai/actions/workflows/selftest.yml/badge.svg)

- **2026-08-03 -- v29.7.0 "Document Mind"**: persistent document store (`ingest`/`docs`/`forget doc`), stdlib retrieval, `ask`/`ask save` Q&A -- offline passages, LLM synthesis when keyed. 15 subsystems, 122 selftest checks.
- **2026-08-03 -- v29.6.0 "The Sovereign Voice"**: voice output (TTS via OpenAI), image generation, GitHub REST probe, OpenRouter LLM fallback, reminders. 14 subsystems, 103 selftest checks. Keys stay in `.env`; guard_secrets.py blocks committing real keys.
# LUQI AI v29.5.0 — Unified Master Engine

One engine. Every domain. A single-file, zero-dependency Python AI engine built in South Africa.

## What it is

`omega.py` is the LUQI AI master engine: a modular CLI router that unifies 9 capability subsystems — with persistent memory, GitHub auto-sync, and Excel/CSV data import. Pure Python standard library: **no pip installs required**.

### Subsystems

| Subsystem | Trigger / Command |
|---|---|
| Infrastructure Build & Sync | `build`, `sync`, deploy keywords |
| Mining & Investment | `mine`, investment keywords |
| Global Tax Support | `tax <country or topic>` |
| API Security Gatekeeper | `keys`, `status` |
| Deep Research | `research <query>` (Serper when key present, offline plan otherwise) |
| Learning Companion | `companion <topic>` |
| Opportunity Engine | `opportunities <domain>` |
| Finance Literacy | `finance <topic>` |
| Self-Improvement | `selfimprove <note>` + `omega_log.jsonl` audit trail |

### Memory, sync, data

- `remember <fact>` / `recall` / `forget <n>` / `history` — persistent memory in `omega_memory.json`, survives restarts, corrupt-file auto-recovery.
- `sync status` / `sync github` — commits and pushes `omega.py` + memory + logs via local git (set `GITHUB_REPO` in `.env`).
- `import <file.csv|.xlsx>` / `analyze` / `query <text>` — stdlib-only spreadsheet ingestion (xlsx read via zipfile + XML), 50k-row cap.
- **v29.1.0:** `version`, `export` (memory + audit to markdown), `report <topic>` (subsystem-routed .md reports), `lang <code>` (UI packs: en / isiZulu / isiXhosa / Sesotho / Afrikaans, persisted).
- **v29.2.0 — Enterprise Evolution:** subsystem #10 Evolution Engine — safe self-improvement with real enforcement: AST whitelist sandbox + restricted exec + fitness gate (adopt only if better), SHA-256-verified immutable pillars with tamper auto-restore, generation lineage + `evolve rollback`, offline evolution by default, optional `evolve run online` via OpenRouter. Plus `why` (6 differentiators) and `integrations` (live connector manifest). See `REVIEW_OMEGA_HYPER_ENGINE.md` for the hardening story.
- **v29.3.0 — Launch-Grade:** process-isolated evolution sandbox (killable candidates, 256 MB memory ceiling on POSIX, zero zombie processes), optional `claude_engine` bridge (`bridge` command — engine runs fine without it), all **15 African language packs** completed, and `launch` — a GO/NO-GO pre-flight checklist (see `LAUNCH_CHECKLIST.md`).
- **v29.4.0 — Global Citizen:** **100 language packs** (70 African — incl. Nigerian Pidgin and a SePitori tribute pack — plus 30 world majors, greetings independently verified), `translate <lang> <text>` (LLM-backed, graceful offline), and `cost` — the pricing-disruption story: world-best capabilities, African-friendly price.
- **v29.5.0 — The Professor:** a true conversational mentor. `teach <subject>` opens a classroom — multi-turn dialogue with full context (online) or an honest offline classroom (built-in curricula, self-check quizzes), `syllabus <subject>` (8 built-in 10-lesson curricula + generated outlines), graded quizzes, and `progress` — a persistent learner profile that remembers your lessons, scores, and weak points across sessions.

15 African languages on the roadmap strip: isiZulu, isiXhosa, Sesotho, Setswana, Sepedi, Xitsonga, Tshivenda, siSwati, isiNdebele, Afrikaans, English, Swahili, Amharic, Yoruba, Hausa.

## Quickstart (Windows)

```powershell
py -3.11 omega.py --selftest   # 24/24 checks should PASS
py -3.11 omega.py              # interactive [OMEGA] > terminal
py -3.11 omega.py "tax south africa"   # one-shot mode
```

## Integration watch-items

- **2026-07-30 — GitHub Models fully retired** (playground, catalog, inference API, BYOK). LUQI AI is unaffected: the engine routes through OpenAI / Serper / OpenRouter directly. OpenRouter (`evolve run online`) is a recommended migration path for anyone moving off GitHub Models.
- **2026-08-26 — Copilot default model enablement** takes effect for Business/Enterprise orgs (GA models switch on by default unless the org policy opts out). Review org model settings before this date.

## Configuration (.env — all optional)

Copy `.env.example` to `.env`. Without keys the engine runs fully offline with graceful degradation.

## Built-in verification

`--selftest` runs 83 checks: router smoke tests over all 9 subsystems, .env parser tolerance, secret masking, memory roundtrip + corruption recovery, CSV and real-XLSX import, git-missing graceful paths. Exit code 0 = all pass.

## Repo layout

- `omega.py` — the engine (single file)
- `site/index.html` — official landing page (self-contained, no dependencies)
- `docs/` — SPEC.md (v1 base spec), SPEC_v29.md (v29 additions)
- `.env.example` — configuration template

---
Luqi AI (c) 2026. Built to be verified, not trusted: every release ships with a selftest.
