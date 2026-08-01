# SPEC_v292.md — omega.py v29.1.0 -> v29.2.0 "Enterprise Evolution"

ALL prior specs (SPEC.md, SPEC_v29.md, SPEC_v291.md) remain in force. Extend `/mnt/agents/output/omega.py` IN PLACE. Single file, py3.11, stdlib-only, ASCII-only source, CLI-only, zero unhandled exceptions.

## 1. Version
`VERSION = "29.2.0"`; banner `LUQI AI v29.2.0 - Unified Master Engine`. `status` shows evolution generation + pillars integrity.

## 2. Subsystem #10 — Evolution Engine (SAFE self-improvement)
Absorbs the uploaded OmegaHyperEngine CONCEPT with a hardened implementation. Router keywords: evolve, evolution, mutation, self improve engine.

### 2.1 Immutable pillars (REAL enforcement, not prompt text)
- Canonical pillars (exact strings from user's uploaded code): p1_build_sync "Omega AI Build & Sync (Continuous Mesh Matrix)", p2_status "Omega AI已建成 (System Baseline Operational Verification)", p3_mining "Omega AI Mining & Investment (Quantitative Yield Automation)", p4_tax "Omega AI税务支持 (Automated Transaction Ledger Tracking)", p5_security "API Key Status (Multi-Tenant Cryptographic Gateway)". (Chinese stored as \u escapes in source.)
- Boot: if `omega_pillars.json` missing -> create it with a `sha256` field = hash of canonical JSON. On every boot AND every `evolve run`: recompute hash; mismatch -> print `PILLAR TAMPER DETECTED - restored canonical pillars`, rewrite canonical, log to audit trail. Pillars dict is a module-level constant used for restoration.

### 2.2 Evolvable strategy module
- File `omega_strategy_gen.py` (cwd). Contract (same as user's code): single function `execute_logic(query, telemetry) -> str` whose output contains `<omega_analysis>`.
- Gen 1 bootstrap = user's Generation-01 logic matrix (cleaned, ASCII).
- Generation lineage: on adoption, current file archived to `omega_gen_<N>.py` (keep last 5, prune older). `omega_evolution.json` = lineage log {generation, fitness, adopted_at, parent} + current fitness.

### 2.3 Safety pipeline (the fix for the uploaded code's fake sandbox)
Every candidate mutation must pass ALL gates, in order:
1. **AST gate** (ast.parse): REJECT if the tree contains: Import/ImportFrom nodes; any Name or Attribute root in BANNED = {os, sys, subprocess, socket, requests, urllib, eval, exec, open, __import__, globals, locals, compile, input, exit, quit, breakpoint, ctypes, shutil, pathlib, memoryview, getattr, setattr, delattr, vars, dir, help}; any attribute starting with `_`; any Call to a banned builtin. Only these node types allowed: Module, FunctionDef, arguments, arg, Return, Assign, AugAssign, AnnAssign, Expr, Constant, Name, Load, Store, BinOp/UnaryOp/BoolOp/Compare and their operators, If, For, While, Try/ExceptHandler, List, Tuple, Dict, Set, Subscript, Slice, JoinedStr, FormattedValue, Call (only to whitelisted funcs: len,str,int,float,list,dict,tuple,set,sorted,min,max,sum,abs,round,enumerate,range,zip,isinstance,format,join via attribute, and str/list/dict methods), Attribute (str/list/dict methods only), IfExp, comprehension nodes, Pass, Break, Continue, Assert.
2. **Restricted exec**: exec candidate in namespace with `__builtins__` = whitelisted subset ONLY (no open/eval/exec/import/print -> print redirected to io.StringIO). Execute 3 fixed contract tests (not 1): ("Test Verify Parameter", ["Telemetry Operational"]), ("health check", []), ("rebalance portfolio", ["mining cluster alpha"]). Each must return str containing `<omega_analysis>`. Windows-safe timeout: run each test in a daemon thread, join(3s); timeout -> reject.
3. **Fitness gate**: fitness = 0.5*contract_pass_rate + 0.3*(1 if latency_avg <= 2.0s else 0) + 0.2*telemetry_health. Adopt candidate ONLY if fitness >= current generation fitness (or no current fitness recorded). Else reject with reason printed.

### 2.4 Commands
- `evolve` — status: current generation, fitness, health score, pillars integrity OK/TAMPERED, lineage length.
- `evolve run` — one evolution cycle. DEFAULT offline: template-based mutation engine (>= 3 deterministic strategy templates varying the analysis block structure/detail level; no network, no LLM — always works). If `.env` has OPENROUTER_API_KEY AND user typed `evolve run online`: LLM proposal via urllib POST to the CORRECT endpoint `https://openrouter.ai/api/v1/chat/completions`, model from `.env` `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), system prompt = meta-compiler prompt from user's uploaded code (pillars JSON + export rules), temp 0.25, 30s timeout, guarded. Strip ``` fences if present. Candidate goes through 2.3 pipeline regardless of source.
- `evolve rollback` — restore the highest-fitness archived generation as current; update lineage.
- `evolve lineage` — table of generations with fitness + timestamps.
- `evolve pillars` — show the 5 pillars + integrity check result.
- Telemetry: each REPL exchange routed through strategy execute_logic when user runs `evolve test <query>`; health score = mean of last 10 scores (success 1.0 else 0.0; -0.3 if tag missing; -0.2 if latency > 2.0; clamped to [0.0, 1.0] — FIXES the uploaded code's negative-score bug). Stored in omega_evolution.json.

## 3. Differentiation layer (from uploaded no-code myth doc)
- New command `why` — prints the 6 LUQI AI differentiators (ASCII, one line each + 1-line proof):
  1. Integration-first, not siloed (connects: GitHub, Excel/CSV, Serper, OpenAI, OpenRouter)
  2. Built to last, not a trend (versioned releases, audit trail, selftest every boot)
  3. Teaches while it works (companion + finance literacy build YOUR skill)
  4. Yours, not cookie-cutter (local memory, your language, your data stays on your machine)
  5. Free to run (pure stdlib, offline-first, no subscription)
  6. Makes you more capable, not obsolete (opportunity engine + reports you own)
- New command `integrations` — manifest table of the 5 connectors with live status (configured/available/missing + how to enable).

## 4. Selftest — grow to >= 40 checks (keep all 32)
New checks MUST include adversarial proof: (a) AST gate REJECTS candidate containing `import os`; (b) REJECTS candidate calling `open("omega_pillars.json")`; (c) REJECTS candidate with `__import__` or dunder attribute; (d) ACCEPTS a safe whitelisted sample; (e) restricted exec candidate cannot read files (attempt returns rejection, not data); (f) contract test enforces `<omega_analysis>`; (g) fitness gate rejects lower-fitness candidate; (h) pillars tamper: corrupt omega_pillars.json -> boot detects + restores; (i) rollback restores prior generation; (j) `why` + `integrations` output present; (k) offline `evolve run` completes with no network and no keys.

## 5. Also deliver
`REVIEW_OMEGA_HYPER_ENGINE.md` (repo doc): full review of the uploaded code — verdict, critical issues table (fake sandbox, non-immutable pillars, wrong endpoint https://openrouter.ai missing /api/v1/chat/completions, nonexistent model openai/gpt-5.6-sol, blocking requests in async, negative health score, no fitness/rollback), what was adopted (concept, pillars, generation contract, telemetry scoring fixed), and the v29.2.0 hardening mapping issue->fix. Professional tone, ASCII.
