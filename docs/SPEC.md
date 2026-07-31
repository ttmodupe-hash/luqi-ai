# SPEC.md — Omega AI Unified Master Engine (`omega.py`)

Single source of truth. Implement faithfully.

## 1. Deliverable
- ONE file: `/mnt/agents/output/omega.py`
- Python 3.11, runs on Windows via `py -3.11 omega.py`
- **Stdlib-only core** — the engine MUST boot with zero third-party packages. Optional network calls use `urllib` (stdlib). No `openai`, `dotenv`, `requests`, `rich` imports at top level.
- **ASCII-only source** (no smart quotes, no em-dashes, no emoji in code/strings) — past sessions broke on encoding.
- CLI/terminal ONLY. No Streamlit, no web server, no GUI.

## 2. Architecture — `OmegaMasterEngine`
Preserve the user's router pattern: method `execute_omega_subsystem(domain: str, payload: dict) -> dict`.
Keyword routing (case-insensitive) to 9 subsystems:

| Subsystem | Trigger keywords | Behavior |
|---|---|---|
| Build & Sync | build, sync, deploy, 已建成 | infra integrity/sync status report |
| Mining & Investment | mining, investment, invest, portfolio, crypto | engine status + strategy/allocation snapshot |
| Tax Support | tax, 税务, vat, sars, compliance | global tax guidance + disclaimer; LLM-enhanced if key present |
| API & Security | api, key, status, security | masked key status + gatekeeper health |
| Deep Research | research, search, deep, find out | Serper search if key present, else offline research-plan guidance |
| Companion/Tutor | companion, teach, learn, explain | study-companion explanation scaffold |
| Opportunity Engine | opportunity, opportunities, hustle, business | opportunity scan framework for given domain |
| Finance Literacy | finance, scam, budget, debt, saving | literacy/scam-avoidance guidance |
| Self-Improvement | selfimprove, improve yourself, evolve | appends improvement note to log, confirms |

Unknown input → routed to master core generic evaluation (keep user's fallback behavior).

## 3. `.env` handling
- Manual parser (no python-dotenv): read `.env` from cwd, `KEY=VALUE` lines, strip quotes, ignore blanks/`#` comments, tolerate malformed lines.
- Never hardcode keys. Never print full secrets — mask: first 4 chars + `...` + last 2.
- Expected keys: `OPENAI_API_KEY`, `SERPER_API_KEY` (both optional; engine degrades gracefully).

## 4. Optional online capabilities (all guarded try/except, 15s timeout)
- `_serper_search(query)` → POST `https://google.serper.dev/search` via urllib; returns top 5 results (title/link/snippet). On any failure → return None, caller falls back to offline guidance.
- `_llm(prompt)` → POST `https://api.openai.com/v1/chat/completions` (model `gpt-4o-mini`) via urllib. On any failure → None.
- Every online path must have an offline fallback so the CLI never crashes.

## 5. CLI REPL
- Banner: `OMEGA AI — Unified Master Engine` + subsystem availability matrix at boot (Available / Degraded + reason).
- Prompt: `[OMEGA] > `
- Commands:
  - `help` — command list
  - `status` — subsystem matrix + `system_state` dict
  - `keys` — masked API key report
  - `research <query>` — deep research
  - `mine` — mining/investment subsystem
  - `tax <country or topic>` — tax support
  - `companion <topic>` — tutor mode
  - `opportunities <domain>` — opportunity engine
  - `finance <topic>` — finance literacy
  - `languages` — African language support list (>= 12 languages)
  - `selfimprove <note>` — log self-improvement entry
  - `log` — last 10 audit entries
  - `clear` — clear screen (os.system('cls'/'clear'))
  - `exit` / `quit` — graceful shutdown
- Free text (no command) → routed through `execute_omega_subsystem` keyword detection → generic core if no match.
- Handle `KeyboardInterrupt` (reprompt) and `EOFError` (exit) cleanly.
- `system_state` preserved from user's blueprint: build_sync_status, mining_investment_active, tax_compliance_region, api_key_status.
- Optional one-shot mode: `py -3.11 omega.py "your question"` → process once, exit.

## 6. Audit / self-improvement log
- Append JSON lines to `omega_log.jsonl` (cwd): `{ts, subsystem, input_summary, status}`.
- `selfimprove` notes also appended with type marker. All file I/O guarded.

## 7. Self-test
- `py -3.11 omega.py --selftest` → non-interactive: runs router smoke test over all 9 subsystems + .env parse + log write; prints PASS/FAIL per check; exit code 0 if all pass.

## 8. Quality bar
- No unhandled exceptions under: missing .env, empty .env, no network, garbage input.
- Clean, commented, PEP8-ish. Windows + macOS + Linux compatible.
