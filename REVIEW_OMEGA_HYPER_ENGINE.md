# Code Review: OmegaHyperEngine (uploaded reference implementation)

Reviewer: LUQI AI engineering (Agent E)
Date: 2026-07-31
Subject: Uploaded `OmegaHyperEngine` self-evolving engine (179 lines)
Verdict: **REJECT as shipped. Concept absorbed; implementation rewritten and
hardened as omega.py v29.2.0 subsystem #10 (Evolution Engine).**

The uploaded code is an ambitious "self-improving AI kernel": an LLM
proposes a new version of the engine's own runtime module, a "sandbox"
validates it, and the file is hot-swapped on disk. The *idea* is good. The
*implementation* is unsafe to run: the sandbox is not a sandbox, the
"immutable" pillars are mutable prompt text, the LLM endpoint and model
are both wrong, and the telemetry math can produce negative health scores.
Every one of these defects is fixed in v29.2.0.

---

## 1. Strengths (what was worth keeping)

1. **The core concept.** Safe, gated self-improvement - where a strategy
   module evolves under explicit constraints - is a genuinely useful
   differentiator. Adopted as subsystem #10.
2. **The immutable pillars idea.** Anchoring evolution to five structural
   invariants (build/sync, status, mining, tax, security) is the right
   instinct. The uploaded code only *talked* about immutability; v29.2.0
   *enforces* it (sha256 tamper detection + automatic restore).
3. **The hot-swap contract.** A single function
   `execute_logic(query, telemetry) -> str` whose output must contain an
   `<omega_analysis>` block is a clean, testable module boundary. Adopted
   verbatim as the generation contract.
4. **Telemetry intent.** Scoring every exchange (success, tag presence,
   latency) and tracking a rolling health score is the right feedback
   signal for an evolution loop. Adopted, with the scoring bug fixed.
5. **Evolution cycle shape.** Propose -> validate -> swap -> log is the
   correct pipeline shape. v29.2.0 keeps the shape and replaces each stage
   with a safe implementation, adding fitness comparison and rollback.

## 2. Critical flaws in the uploaded code

| # | Severity | Flaw | Evidence in uploaded code | Consequence |
|---|----------|------|---------------------------|-------------|
| 1 | CRITICAL | Fake sandbox: full-privilege exec of LLM-written code | `spec.loader.exec_module(mod)` on raw LLM output, then `os.replace(sandbox_file, active_module_path)` | Any string the model returns runs with full process privileges (file system, network, shell). One prompt-injection or model error = arbitrary code execution, then *installed as production code*. |
| 2 | CRITICAL | "Immutable pillars" are not immutable | `self.immutable_pillars` is only interpolated into the system prompt | The model is politely asked to obey; nothing stops a mutation from violating the pillars. No on-disk integrity check at all. |
| 3 | HIGH | Wrong API endpoint | `self.api_url = "https://openrouter.ai"` - the bare host, missing `/api/v1/chat/completions` | Every LLM call POSTs to a marketing page and fails; the evolution cycle can never have worked online. |
| 4 | HIGH | Nonexistent model | `self.target_model = "openai/gpt-5.6-sol"` | Even with a correct endpoint, the request would be rejected - the model ID does not exist. |
| 5 | HIGH | Blocking I/O inside async code | `requests.post(...)` (synchronous) called from `async def run_autonomous_evolution_cycle` | The "non-blocking background thread" blocks the entire event loop for up to 30 s per cycle. |
| 6 | MEDIUM | Negative health score | `score -= 0.3` (missing tag) and `score -= 0.2` (slow) with no floor, applied even when `success=False` starts the score at 0.0 | `system_health_score` can go to -0.5, poisoning every downstream comparison that assumes [0, 1]. |
| 7 | MEDIUM | No fitness comparison, no rollback | Sandbox pass = unconditional `os.replace` + `generation_version += 1` | A worse mutation silently overwrites a better generation; there is no archive and no way back. |
| 8 | MEDIUM | Awaited "background" thread | `await hyper_core.run_autonomous_evolution_cycle()` in `main()` | The advertised asynchronous background evolution is fully serialized - there is no concurrency at all. |
| 9 | LOW | Third-party dependency | `import requests` | Violates the stdlib-only constraint; crashes at import on a clean machine. |
| 10 | LOW | Single weak contract test | One call, one assertion (`"<omega_analysis>" in test_run`) | Trivially passed by a degenerate or hostile function; no timeout, so an infinite loop hangs the process forever. |
| 11 | LOW | Unguarded state I/O | `json.load(f)` on `omega_state_vault.json` with no corruption handling | One truncated write bricks every subsequent boot. |

## 3. Adopted vs. fixed mapping

| Uploaded concept | v29.2.0 treatment |
|---|---|
| Immutable pillars (prompt text) | ADOPTED as concept; FIXED by persisting `omega_pillars.json` with a `sha256` of the canonical pillar JSON. Every boot and every `evolve run` re-verifies the hash; any mismatch prints `PILLAR TAMPER DETECTED - restored canonical pillars`, rewrites the canonical file from a module-level constant, and logs to the audit trail. |
| `execute_logic(query, telemetry)` hot-swap contract | ADOPTED unchanged (`omega_strategy_gen.py`, Generation-01 bootstrap = the uploaded initial logic matrix, cleaned to ASCII). FIXED by routing every hot-swap through the 3-gate pipeline first. |
| "Rigid sandbox testing layer" | REPLACED. Gate 1: AST whitelist - no Import/ImportFrom, banned names (`os`, `sys`, `open`, `eval`, `exec`, `__import__`, ...), no `_`-prefixed attributes, calls restricted to whitelisted builtins and str/list/dict/set methods. Gate 2: restricted `exec` whose `__builtins__` is the whitelist only (no `open`/`eval`/`exec`/`__import__`; `print` redirected to a buffer), 3 fixed contract tests, each in a daemon thread with a 3 s `join()` timeout (Windows-safe, no signals). Gate 3: fitness gate - adopt only if candidate fitness >= current generation fitness. |
| OpenRouter LLM proposals | ADOPTED as optional `evolve run online`. FIXED: correct endpoint `https://openrouter.ai/api/v1/chat/completions`, model from `.env` `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), stdlib `urllib` instead of `requests`, 30 s timeout, fully guarded, `OPENROUTER_API_KEY` required, markdown fences stripped. Default `evolve run` is a deterministic offline template engine (3 templates) - no network, no keys, always works. |
| Telemetry scoring | ADOPTED (success/tag/latency, rolling mean of last 10). FIXED: every score clamped to [0.0, 1.0] - the negative-health bug is mathematically impossible now. |
| Generation versioning | ADOPTED and extended: `omega_evolution.json` lineage log `{generation, fitness, adopted_at, parent, source}` + current fitness + health; previous generations archived to `omega_gen_<N>.py` (last 5 kept, older pruned); `evolve rollback` restores the highest-fitness archive; `evolve lineage` renders the table. |
| Async "background" evolution | REPLACED with explicit, honest CLI cycles (`evolve run`) - no fake concurrency, no event loop to block. |
| Meta-compiler system prompt | ADOPTED verbatim (pillars JSON + the 3 export rules) as the online-mode system prompt. |

## 4. v29.2.0 hardening summary (issue -> fix)

| Issue # | Fix shipped in v29.2.0 |
|---|---|
| 1 | 3-gate pipeline: AST whitelist -> restricted exec (whitelisted `__builtins__` only) -> 3 contract tests with daemon-thread timeouts. Adversarial proofs in the selftest: `import os` rejected, `open()` rejected, `__import__`/dunder rejected, sandbox file-read attempt returns a rejection (never data), infinite loop rejected after 3 s. |
| 2 | `omega_pillars.json` + sha256 tamper detection on every boot and every `evolve run`; automatic restore from the module-level canonical constant; audit-trail entry on tamper. |
| 3 | Correct endpoint `https://openrouter.ai/api/v1/chat/completions`. |
| 4 | Configurable `OPENROUTER_MODEL`, default `openai/gpt-4o-mini`. |
| 5, 8 | No async at all: synchronous, guarded, explicit evolution cycles. |
| 6 | Scores and health clamped to [0.0, 1.0]; selftest proves the floor (failure + missing tag + slow = exactly 0.0). |
| 7 | Fitness gate (0.5*contract + 0.3*latency + 0.2*health) with adopt-only-if-not-worse rule; archive of last 5 generations; `evolve rollback` restores highest-fitness archive. |
| 9 | Pure stdlib (`urllib`); zero third-party imports. |
| 10 | 3 fixed contract tests, each timeout-guarded; degenerate candidates without `<omega_analysis>` rejected (selftest-proven). |
| 11 | All state files loaded defensively with defaults; every I/O wrapped; zero unhandled exceptions under missing/corrupt state. |

## 5. Verification evidence

- `python3 -m py_compile omega.py` - clean.
- `omega.py --selftest` in a fresh directory: **48/48 PASS, exit 0**
  (32 pre-existing v1/v29/v29.1.0 checks preserved + 16 new v29.2.0
  checks, including all adversarial sandbox proofs).
- Interactive session (`evolve`, `evolve run`, `evolve lineage`,
  `evolve pillars`, `evolve test`, `evolve rollback`, `why`,
  `integrations`) - no tracebacks; `omega_strategy_gen.py`,
  `omega_pillars.json`, `omega_evolution.json` created; archives pruned to
  the last 5 after 6 adoptions.
- Deliberate tamper test: `omega_pillars.json` corrupted by hand ->
  next boot prints `PILLAR TAMPER DETECTED - restored canonical pillars`
  and the file hash verifies against the canonical constant.
- Malicious candidate (`import os` + `os.system('touch PWNED_MARKER')`)
  rejected at gate 1; marker file never created.

## 6. Final verdict

The uploaded OmegaHyperEngine should never be executed as written: its
"sandbox" executes arbitrary LLM output with full privileges and then
promotes it to production. Its conceptual contribution - pillars,
contract-based hot-swapping, telemetry-driven evolution - is real, and is
now available safely in LUQI AI v29.2.0 as the Evolution Engine
(`evolve`, `evolve run`, `evolve rollback`, `evolve lineage`,
`evolve pillars`, `evolve test <query>`), offline-first with an optional,
correctly-wired online mode.
