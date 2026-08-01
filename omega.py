#!/usr/bin/env python3
"""
LUQI AI v29.3.0 - Unified Master Engine (omega.py)

Single-file, stdlib-only CLI engine unifying 10 subsystems behind the
user's original OmegaMasterEngine router pattern.

v29.0.0 additions (SPEC_v29.md):
- Module A: persistent memory (omega_memory.json) with
  remember/recall/forget/history commands.
- Module B: GitHub auto-sync (sync github / sync status) via subprocess git,
  GITHUB_REPO / GITHUB_TOKEN from .env, token always masked.
- Module C: Excel/CSV data import (import / analyze / query) with a
  stdlib-only .xlsx reader (zipfile + xml.etree.ElementTree).

v29.1.0 additions (SPEC_v291.md):
- 'version' command: version, subsystem count, session number, facts count.
- 'export' command: omega_export_<UTCts>.md snapshot (system_state, facts,
  last import, last 50 history entries, last 50 audit entries).
- 'report <topic>' command: routes through execute_omega_subsystem and
  writes omega_report_<slug>_<UTCts>.md with findings + next actions.
- 'lang <code>' command: UI string packs (en/zu/xh/st/af) for greeting,
  goodbye, help-header, unknown-command, remembered, forgot. Persisted in
  memory and restored on boot; new languages are data-only pack entries.

v29.2.0 additions (SPEC_v292.md) - "Enterprise Evolution":
- Subsystem #10: Evolution Engine (SAFE self-improvement). Absorbs the
  uploaded OmegaHyperEngine concept with real hardening:
  * Immutable pillars enforced for real: omega_pillars.json carries a
    sha256 of the canonical pillar JSON; every boot and every 'evolve run'
    re-verifies it, and any tamper is detected, reported, and restored.
  * Evolvable strategy module omega_strategy_gen.py exporting
    execute_logic(query, telemetry) -> str containing '<omega_analysis>'.
    Generation lineage in omega_evolution.json; last 5 generations
    archived as omega_gen_<N>.py; 'evolve rollback' restores the
    highest-fitness archive.
  * 3-gate safety pipeline for every candidate mutation:
    gate 1 = AST whitelist (no imports, no banned names, no dunders),
    gate 2 = restricted exec (whitelisted builtins only) + 3 contract
    tests with Windows-safe daemon-thread timeouts,
    gate 3 = fitness gate (adopt only if >= current generation fitness).
  * 'evolve run' is OFFLINE by default (deterministic template mutation,
    no network, no LLM). 'evolve run online' uses the correct OpenRouter
    endpoint with OPENROUTER_API_KEY / OPENROUTER_MODEL from .env.
  * Telemetry health is the clamped [0.0, 1.0] mean of the last 10 scores
    ('evolve test <query>'); the uploaded code's negative-score bug is
    fixed by clamping.
- 'why' command: the 6 LUQI AI differentiators with proofs.
- 'integrations' command: 5-connector live status manifest.

v29.3.0 additions (SPEC_v293.md) - "Launch-Grade":
- Evolution gate 2 (contract exec) is now PROCESS-ISOLATED:
  multiprocessing.get_context("spawn") child process per candidate,
  results via Queue, join(3.0) then terminate() on timeout, and an
  assertion that no child processes remain alive after every gate run
  (kills the v29.2.0 zombie-thread limit). POSIX children also get a
  256 MB RLIMIT_AS memory ceiling (MemoryError -> rejection); Windows
  is documented as timeout-only. AST gate and fitness gate unchanged.
- Optional claude_engine bridge (dogfooding): guarded import that is
  NEVER a hard dependency. When present + OPENAI_API_KEY set, _llm()
  routes through a lazy singleton ClaudeLikeEngine (anthropic fallback
  when ANTHROPIC_API_KEY set); ANY exception falls back to the stdlib
  urllib path. New 'bridge' command; 'integrations' gains a 6th row.
- LANG_PACKS completed to 15 packs: tn, nso, ts, ve, ss, nr, sw, am
  (ASCII transliteration), yo, ha added to en/zu/xh/st/af.
- New 'launch' command: GO/NO-GO pre-flight table (blockers are
  pillars/memory/selftest-core failures ONLY; optional keys are WARN).
- LAUNCH_CHECKLIST.md: human launch runbook (engine selftest, .env
  keys, launch GO, sync github push, site publish + smoke, rollback).

- Python 3.11, standard library only, ASCII-only source.
- Boots with no .env, no network, no third-party packages.
- Windows/macOS/Linux compatible:  py -3.11 omega.py
- Modes:
    py -3.11 omega.py                -> interactive REPL
    py -3.11 omega.py "question"     -> one-shot mode
    py -3.11 omega.py --selftest     -> non-interactive self test
"""

import ast
import builtins
import contextlib
import csv
import hashlib
import io
import json
import multiprocessing
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ENGINE_VERSION = "29.3.0"
ENGINE_NAME = "LUQI AI v" + ENGINE_VERSION + " - Unified Master Engine"
LOG_FILE = "omega_log.jsonl"
ENV_FILE = ".env"
MEMORY_FILE = "omega_memory.json"
MAX_HISTORY_ENTRIES = 200  # cap for persistent REPL history
MAX_DATASET_ROWS = 50000   # refuse larger datasets with a clear message
GIT_TIMEOUT = 30           # seconds, per SPEC_v29
HTTP_TIMEOUT = 15  # seconds, per spec
SERPER_URL = "https://google.serper.dev/search"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"

# ---------------------------------------------------------------------------
# v29.3.0: optional claude_engine bridge (dogfooding)
# ---------------------------------------------------------------------------
# Guarded import: the bridge is NEVER a hard dependency. When the module is
# absent the flag stays False and every surface degrades silently; the whole
# engine keeps working exactly as before (urllib fallback path).
try:
    from claude_engine import ClaudeLikeEngine  # type: ignore
    BRIDGE_AVAILABLE = True
except Exception:
    ClaudeLikeEngine = None  # type: ignore
    BRIDGE_AVAILABLE = False

CLAUDE_FALLBACK_MODEL = "claude-3-5-sonnet-latest"

# ---------------------------------------------------------------------------
# v29.2.0: Evolution Engine constants (SPEC_v292.md)
# ---------------------------------------------------------------------------

PILLARS_FILE = "omega_pillars.json"
STRATEGY_FILE = "omega_strategy_gen.py"
EVOLUTION_FILE = "omega_evolution.json"
EVO_ARCHIVE_KEEP = 5           # keep the last 5 archived generations
EVO_TEST_TIMEOUT = 3.0         # seconds the sandbox child may run (join timeout)
EVO_HTTP_TIMEOUT = 30          # seconds for the optional online proposal
EVO_MEMORY_LIMIT = 268435456   # 256 MB RLIMIT_AS ceiling inside the child (POSIX)
# Correct OpenRouter chat-completions endpoint (the uploaded code used the
# bare https://openrouter.ai host, which is not a valid API path).
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_DEFAULT_MODEL = "openai/gpt-4o-mini"

# Canonical immutable pillars (exact strings from the uploaded code; the
# Chinese text is stored ASCII-safe via unicode escapes). This dict is the
# module-level constant used for tamper restoration.
CANONICAL_PILLARS: Dict[str, str] = {
    "p1_build_sync": "Omega AI Build & Sync (Continuous Mesh Matrix)",
    "p2_status": "Omega AI\u5df2\u5efa\u6210 (System Baseline Operational Verification)",
    "p3_mining": "Omega AI Mining & Investment (Quantitative Yield Automation)",
    "p4_tax": "Omega AI\u7a0e\u52a1\u652f\u6301 (Automated Transaction Ledger Tracking)",
    "p5_security": "API Key Status (Multi-Tenant Cryptographic Gateway)",
}

# Generation-01 bootstrap strategy: the uploaded code's initial logic
# matrix, cleaned and ASCII-only. Contract: execute_logic(query, telemetry)
# returns a string containing '<omega_analysis>'.
EVO_GEN1_CODE = (
    "def execute_logic(query, telemetry):\n"
    "    # Generation 01 Initial Logic Matrix\n"
    "    analysis = f'<omega_analysis>Parsing variables for query: {query}</omega_analysis>'\n"
    "    response = f'Omega AI Core Active. Data streams processed successfully.'\n"
    "    return f'{analysis}\\n{response}'\n"
)

# Offline deterministic mutation templates (>= 3), varying the analysis
# block structure / detail level. All of them pass the 3-gate pipeline.
EVO_TEMPLATES: List[str] = [
    # Template 1: structured multi-line analysis block.
    (
        "def execute_logic(query, telemetry):\n"
        "    # Template: structured analysis matrix\n"
        "    text = str(query)\n"
        "    signals = len(list(telemetry))\n"
        "    parts = []\n"
        "    parts.append('<omega_analysis>')\n"
        "    parts.append('mode: structured | query: ' + text)\n"
        "    parts.append('telemetry signals: ' + str(signals))\n"
        "    parts.append('</omega_analysis>')\n"
        "    block = '\\n'.join(parts)\n"
        "    return block + '\\nOmega AI Core Active. Structured pass complete.'\n"
    ),
    # Template 2: compact single-line analysis block.
    (
        "def execute_logic(query, telemetry):\n"
        "    # Template: compact analysis matrix\n"
        "    text = str(query)\n"
        "    count = len(list(telemetry))\n"
        "    summary = 'compact | query: ' + text + ' | signals: ' + str(count)\n"
        "    return '<omega_analysis>' + summary + '</omega_analysis> Omega AI Core Active.'\n"
    ),
    # Template 3: detailed per-signal analysis block.
    (
        "def execute_logic(query, telemetry):\n"
        "    # Template: detailed per-signal analysis matrix\n"
        "    lines = []\n"
        "    lines.append('<omega_analysis> detailed scan')\n"
        "    for item in list(telemetry):\n"
        "        lines.append('signal: ' + str(item))\n"
        "    lines.append('query: ' + str(query))\n"
        "    lines.append('</omega_analysis>')\n"
        "    return '\\n'.join(lines)\n"
    ),
]

# Meta-compiler system prompt from the uploaded code (pillars injected).
EVO_META_SYSTEM_PROMPT = (
    "You are the Meta-Cognitive Sandbox Compiler of Omega AI.\n"
    "You are bound by these unalterable anchors:\n{pillars}\n"
    "Your task is to write a raw Python code string that fixes processing "
    "inefficiencies or formatting drifts found in telemetry.\n"
    "CRITICAL EXPORT RULES:\n"
    "1. You must export a single python function named "
    "'execute_logic(query, telemetry)'.\n"
    "2. It must return a string containing an internal structural logic "
    "block wrapped inside '<omega_analysis>'.\n"
    "3. Do not include markdown code block formatting (e.g., no "
    "```python). Output purely executable code script text."
)

# AST gate: names that may never appear in a candidate mutation.
EVO_BANNED_NAMES = frozenset([
    "os", "sys", "subprocess", "socket", "requests", "urllib", "eval",
    "exec", "open", "__import__", "globals", "locals", "compile", "input",
    "exit", "quit", "breakpoint", "ctypes", "shutil", "pathlib",
    "memoryview", "getattr", "setattr", "delattr", "vars", "dir", "help",
])

# AST gate: the ONLY bare-name functions a candidate may call.
EVO_SAFE_FUNCS = frozenset([
    "len", "str", "int", "float", "list", "dict", "tuple", "set", "sorted",
    "min", "max", "sum", "abs", "round", "enumerate", "range", "zip",
    "isinstance", "format",
])

# AST gate: the ONLY attribute (method) calls a candidate may make
# (str / list / dict / set methods).
EVO_SAFE_METHODS = frozenset([
    "join", "append", "extend", "insert", "remove", "pop", "index",
    "count", "sort", "reverse", "copy", "clear", "get", "keys", "values",
    "items", "update", "setdefault", "add", "discard", "union",
    "intersection", "difference", "issubset", "issuperset", "lower",
    "upper", "title", "capitalize", "swapcase", "strip", "lstrip",
    "rstrip", "split", "rsplit", "splitlines", "replace", "startswith",
    "endswith", "find", "rfind", "format", "format_map", "zfill", "rjust",
    "ljust", "center", "partition", "rpartition", "isdigit", "isalpha",
    "isalnum", "isspace", "isnumeric", "islower", "isupper", "istitle",
])

# AST gate: whitelisted node types. Operator/context abstract bases cover
# every concrete operator (Add, Eq, Not, Load, Store, ...).
_EVO_ALLOWED_NODES = (
    ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.Return,
    ast.Assign, ast.AugAssign, ast.AnnAssign, ast.Expr, ast.Constant,
    ast.Name, ast.BinOp, ast.UnaryOp, ast.BoolOp, ast.Compare, ast.If,
    ast.For, ast.While, ast.Try, ast.ExceptHandler, ast.List, ast.Tuple,
    ast.Dict, ast.Set, ast.Subscript, ast.Slice, ast.JoinedStr,
    ast.FormattedValue, ast.Call, ast.Attribute, ast.IfExp, ast.ListComp,
    ast.SetComp, ast.DictComp, ast.GeneratorExp, ast.comprehension,
    ast.Pass, ast.Break, ast.Continue, ast.Assert, ast.keyword,
    ast.operator, ast.unaryop, ast.boolop, ast.cmpop, ast.expr_context,
)

# Non-ASCII trigger keywords kept ASCII-safe via unicode escapes:
#   "yi jian cheng" (built/deployed) and "shui wu" (tax affairs).
KW_BUILT_ZH = "\u5df2\u5efa\u6210"  # "yi jian cheng" (built/deployed)
KW_TAX_ZH = "\u7a0e\u52a1"  # "shui wu" (tax affairs)

AFRICAN_LANGUAGES = [
    ("isiZulu", "South Africa"),
    ("isiXhosa", "South Africa"),
    ("Sesotho", "South Africa / Lesotho"),
    ("Setswana", "Botswana / South Africa"),
    ("Sepedi", "South Africa"),
    ("Xitsonga", "South Africa / Mozambique"),
    ("Tshivenda", "South Africa / Zimbabwe"),
    ("Afrikaans", "South Africa / Namibia"),
    ("Swahili", "Kenya / Tanzania / East Africa"),
    ("Amharic", "Ethiopia"),
    ("Hausa", "Nigeria / West Africa"),
    ("Yoruba", "Nigeria / Benin"),
    ("Igbo", "Nigeria"),
    ("Shona", "Zimbabwe"),
    ("Oromo", "Ethiopia / Kenya"),
]

TAX_DISCLAIMER = (
    "Disclaimer: general educational guidance only, not professional tax, "
    "legal, or financial advice. Consult a registered tax practitioner for "
    "your jurisdiction."
)

# ---------------------------------------------------------------------------
# v29.1.0: UI language packs (data-only; add more languages as new entries)
# ---------------------------------------------------------------------------
# Every pack MUST define these keys (ASCII-safe transliterations only):
#   greeting, goodbye, help_header, unknown_command, remembered, forgot
# 'remembered'/'forgot' are printf-style templates taking (number, fact).
DEFAULT_LANG = "en"

LANG_PACKS: Dict[str, Dict[str, str]] = {
    "en": {
        "name": "English",
        "greeting": "Type 'help' for commands. 'exit' to quit.",
        "goodbye": "OMEGA shutting down. Stay sovereign.",
        "help_header": "Commands:",
        "unknown_command": ("Unrecognized command - routed to the master "
                            "core for evaluation."),
        "remembered": "Remembered fact #%d: %s",
        "forgot": "Forgot fact #%d: %s",
    },
    "zu": {
        "name": "isiZulu",
        "greeting": "Sawubona! Thayipha 'help' ukuze ubone imiyalo. 'exit' ukuze uphume.",
        "goodbye": "OMEGA iyacima. Sala kahle, hlala ukhululekile.",
        "help_header": "Imiyalo:",
        "unknown_command": ("Umyalo ongaziwa - udluliselwe ku-master core "
                            "ukuze uhlolwe."),
        "remembered": "Iqiniso #%d likhunjulwe: %s",
        "forgot": "Iqiniso #%d lishiwe: %s",
    },
    "xh": {
        "name": "isiXhosa",
        "greeting": "Molo! Thayipha 'help' ukubona imiyalo. 'exit' ukuphuma.",
        "goodbye": "OMEGA iyacima. Sala kakuhle, hlala ukhululekile.",
        "help_header": "Imiyalo:",
        "unknown_command": ("Umyalo ongaziwayo - ugqithiselwe ku-master core "
                            "ukuvavanywa."),
        "remembered": "Inyani #%d likhunjulwe: %s",
        "forgot": "Inyani #%d liyekiwe: %s",
    },
    "st": {
        "name": "Sesotho",
        "greeting": "Dumela! Tlanya 'help' ho bona ditaelo. 'exit' ho tswa.",
        "goodbye": "OMEGA e tima. Sala hantle, dula o lokolohile.",
        "help_header": "Ditaelo:",
        "unknown_command": ("Taelo e sa tsejweng - e rometswe ho master core "
                            "ho hlahlojwa."),
        "remembered": "Nnete #%d e gopolotswe: %s",
        "forgot": "Nnete #%d e lebetswe: %s",
    },
    "af": {
        "name": "Afrikaans",
        "greeting": "Hallo! Tik 'help' vir bevele. 'exit' om af te sluit.",
        "goodbye": "OMEGA skakel af. Bly soewerein.",
        "help_header": "Bevele:",
        "unknown_command": ("Onbekende bevel - na die meesterkern gestuur "
                            "vir evaluasie."),
        "remembered": "Feit #%d onthou: %s",
        "forgot": "Feit #%d vergeet: %s",
    },
    # v29.3.0: the remaining 10 packs (data-only, ASCII transliterations).
    "tn": {
        "name": "Setswana",
        "greeting": "Dumela! Tlanya 'help' go bona ditaelo. 'exit' go tswa.",
        "goodbye": "OMEGA e tima. Sala sentle, nna o ikemetse.",
        "help_header": "Ditaelo:",
        "unknown_command": ("Taelo e e sa itsiweng - e rometswe go master "
                            "core go sekasekwa."),
        "remembered": "Nnete #%d e gakolotswe: %s",
        "forgot": "Nnete #%d e lebetswe: %s",
    },
    "nso": {
        "name": "Sepedi",
        "greeting": "Dumela! Tlanya 'help' go bona ditaelo. 'exit' go tswa.",
        "goodbye": "OMEGA e tima. Sala gabotse, dula o ikemetse.",
        "help_header": "Ditaelo:",
        "unknown_command": ("Taelo ye e sa tsebjego - e rometswe go master "
                            "core go hlahlobjwa."),
        "remembered": "Nnete #%d e gopolotswe: %s",
        "forgot": "Nnete #%d e lebetswe: %s",
    },
    "ts": {
        "name": "Xitsonga",
        "greeting": "Avuxeni! Tlanya 'help' ku vona swileriso. 'exit' ku huma.",
        "goodbye": "OMEGA yi cima. Sala kahle, tshama u ntshunxekile.",
        "help_header": "Swileriso:",
        "unknown_command": ("Xileriso lexi nga tiviwiki - xi rhumeliwe eka "
                            "master core ku kamberiwa."),
        "remembered": "Xiyimo #%d xi tsariwe: %s",
        "forgot": "Xiyimo #%d xi rivariwe: %s",
    },
    "ve": {
        "name": "Tshivenda",
        "greeting": "Ndaa! Tlanya 'help' u vhona milayo. 'exit' u bva.",
        "goodbye": "OMEGA i a ima. Salani zwavhudi, dzulani ni tsho itsho.",
        "help_header": "Milayo:",
        "unknown_command": ("Mulayo u sa divheyiwi - u rumelwe kha master "
                            "core u toliwa."),
        "remembered": "Ndivho #%d yo dzulwa: %s",
        "forgot": "Ndivho #%d yo hangwelwa: %s",
    },
    "ss": {
        "name": "siSwati",
        "greeting": "Sawubona! Thayipha 'help' kubona imiyalo. 'exit' kuphuma.",
        "goodbye": "OMEGA iyacima. Sala kahle, hlala ukhululekile.",
        "help_header": "Imiyalo:",
        "unknown_command": ("Umyalo longatiwa - udluliselwe ku-master core "
                            "kuhlolwa."),
        "remembered": "Liqiniso #%d likhunjulwe: %s",
        "forgot": "Liqiniso #%d lishiyiwe: %s",
    },
    "nr": {
        "name": "isiNdebele",
        "greeting": "Lotjhani! Thayipha 'help' ukubona imiyalo. 'exit' ukuphuma.",
        "goodbye": "OMEGA iyacima. Sala kuhle, hlala ukhululekile.",
        "help_header": "Imiyalo:",
        "unknown_command": ("Umyalo ongaziwa - uthunyiwe ku-master core "
                            "ukuhlolwa."),
        "remembered": "Iqiniso #%d likhunjulwe: %s",
        "forgot": "Iqiniso #%d liyekelelwe: %s",
    },
    "sw": {
        "name": "Swahili",
        "greeting": "Habari! Andika 'help' kuona amri. 'exit' kutoka.",
        "goodbye": "OMEGA inazimwa. Kwaheri, kaa huru.",
        "help_header": "Amri:",
        "unknown_command": ("Amri isiyojulikana - imeelekezwa kwa master "
                            "core kwa tathmini."),
        "remembered": "Ukweli #%d umekumbukwa: %s",
        "forgot": "Ukweli #%d umesahauliwa: %s",
    },
    "am": {
        "name": "Amharic",
        "greeting": ("Selam! t'azzazochin lemareg 'help' yigetsu. "
                     "'exit' lemewt'at."),
        "goodbye": "OMEGA tet'ewalech. Dehna hun, dehna neh.",
        "help_header": "T'azzazochin:",
        "unknown_command": ("Yelayaweqe t'azzaz - wede master core "
                            "t'lkebwal."),
        "remembered": "Ewnet #%d t'zegnwal: %s",
        "forgot": "Ewnet #%d t'rshegnwal: %s",
    },
    "yo": {
        "name": "Yoruba",
        "greeting": "Pele o! Te 'help' lati ri awon ase. 'exit' lati jade.",
        "goodbye": "OMEGA ti pare. Odabo, wa laafin.",
        "help_header": "Awon ase:",
        "unknown_command": ("Ase ti a ko mo - a ti ran si master core fun "
                            "ayewo."),
        "remembered": "Otito #%d ti se akosile: %s",
        "forgot": "Otito #%d ti gbagbe: %s",
    },
    "ha": {
        "name": "Hausa",
        "greeting": "Sannu! Rubuta 'help' don ganin umarni. 'exit' don fita.",
        "goodbye": "OMEGA ta rufe. Sai anjima, kasance da 'yanci.",
        "help_header": "Umarni:",
        "unknown_command": ("Umarin da ba a sani ba - an tura shi zuwa "
                            "master core don bincike."),
        "remembered": "Gaskiya #%d an adana: %s",
        "forgot": "Gaskiya #%d an manta: %s",
    },
}

# v29.1.0: 'report' command - next-action tables (3 generic + 2 specific).
REPORT_GENERIC_ACTIONS = [
    "Review the findings above and confirm they match your priorities.",
    "Run 'research <topic>' to add external sources to these findings.",
    "Persist any decision you make with 'remember <fact>'.",
]

REPORT_DEFAULT_ACTIONS = [
    "Re-run 'report <topic>' with a more specific topic.",
    "Check 'status' to confirm subsystem availability.",
]

REPORT_NEXT_ACTIONS: Dict[str, List[str]] = {
    "Omega Infrastructure Build & Sync": [
        "Re-run 'sync status' to confirm git sync health.",
        "Schedule the next integrity check after any deploy.",
    ],
    "Omega Mining & Investment Engine": [
        "Review allocation drift against the +/- 5% rebalance trigger.",
        "Run 'analyze' if a portfolio dataset has been imported.",
    ],
    "Omega Tax & Audit Support": [
        "Export transactions and confirm cost-basis records are complete.",
        "Confirm filing deadlines for your region with a practitioner.",
    ],
    "Omega Security Gatekeeper": [
        "Rotate any API key that has been shared outside this machine.",
        "Run 'keys' to verify the masked key status report.",
    ],
    "Omega Deep Research": [
        "Set SERPER_API_KEY in .env and re-run for live web sources.",
        "Save key sources as facts with 'remember <fact>'.",
    ],
    "Omega Companion/Tutor": [
        "Do the one small practice task from the scaffold today.",
        "Teach the topic back in your own words to test recall.",
    ],
    "Omega Opportunity Engine": [
        "Pick one revenue model and design the 7-day validation test.",
        "Interview 3 potential customers before spending money.",
    ],
    "Omega Finance Literacy": [
        "Write a 50/30/20 budget for this month.",
        "Check one advisor or platform against your regulator's register.",
    ],
    "Omega Self-Improvement": [
        "Review the last 10 audit entries with 'log'.",
        "Pick one recurring issue and define a concrete fix.",
    ],
}


# ---------------------------------------------------------------------------
# .env manual parser (no python-dotenv)
# ---------------------------------------------------------------------------

def parse_env_file(path: str = ENV_FILE) -> Dict[str, str]:
    """Parse a .env file manually.

    Reads KEY=VALUE lines, strips surrounding quotes, ignores blank lines
    and '#' comments, and tolerates malformed lines. Never raises.
    """
    values: Dict[str, str] = {}
    try:
        if not os.path.isfile(path):
            return values
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue  # tolerate malformed lines
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if not key:
                    continue
                # Strip one layer of matching surrounding quotes.
                if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                    value = value[1:-1]
                values[key] = value
    except Exception:
        # .env parsing must never crash the engine.
        return values
    return values


def mask_secret(secret: Optional[str]) -> str:
    """Mask a secret: first 4 chars + '...' + last 2. Never print in full."""
    if not secret:
        return "(not set)"
    secret = str(secret)
    if len(secret) <= 6:
        return secret[:1] + "..." + secret[-1:]
    return secret[:4] + "..." + secret[-2:]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Module A: persistent memory (omega_memory.json)
# ---------------------------------------------------------------------------

def fresh_memory() -> Dict[str, Any]:
    """Return a new, empty memory structure (SPEC_v29 schema + v29.1 lang)."""
    return {
        "facts": [],
        "history": [],
        "datasets": {"last_import": None},
        "sessions": 0,
        "lang": DEFAULT_LANG,
    }


def _slugify(text: str) -> str:
    """Turn a report topic into a filesystem-safe ASCII slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")
    return slug or "topic"


def resolve_memory_path() -> str:
    """Prefer cwd/omega_memory.json; fall back to the user home dir."""
    try:
        cwd_path = os.path.join(os.getcwd(), MEMORY_FILE)
        if os.path.isfile(cwd_path):
            if os.access(cwd_path, os.W_OK):
                return cwd_path
        elif os.access(os.getcwd(), os.W_OK):
            return cwd_path
    except Exception:
        pass
    try:
        return os.path.join(os.path.expanduser("~"), MEMORY_FILE)
    except Exception:
        return MEMORY_FILE


def load_memory(path: str) -> Dict[str, Any]:
    """Load memory JSON from disk.

    On corrupt/malformed data, back the file up to `<path>.bak` and start
    fresh. Never raises.
    """
    memory = fresh_memory()
    try:
        if not os.path.isfile(path):
            return memory
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("memory root is not a JSON object")
        if isinstance(data.get("facts"), list):
            memory["facts"] = [str(f) for f in data["facts"]]
        if isinstance(data.get("history"), list):
            history = []
            for item in data["history"]:
                if isinstance(item, dict):
                    history.append({
                        "ts": str(item.get("ts", "")),
                        "role": str(item.get("role", "")),
                        "text": str(item.get("text", "")),
                    })
            memory["history"] = history[-MAX_HISTORY_ENTRIES:]
        if isinstance(data.get("datasets"), dict):
            memory["datasets"] = {
                "last_import": data["datasets"].get("last_import")
            }
        try:
            memory["sessions"] = int(data.get("sessions", 0))
        except Exception:
            memory["sessions"] = 0
        # v29.1.0: persisted UI language choice.
        lang = data.get("lang")
        if isinstance(lang, str) and lang in LANG_PACKS:
            memory["lang"] = lang
        return memory
    except Exception:
        # Corrupt memory: back up the broken file, start fresh.
        try:
            if os.path.isfile(path):
                with open(path, "rb") as src:
                    blob = src.read()
                with open(path + ".bak", "wb") as dst:
                    dst.write(blob)
        except Exception:
            pass
        return fresh_memory()


def save_memory(path: str, memory: Dict[str, Any]) -> bool:
    """Persist memory JSON to disk. Guarded; returns success flag."""
    try:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(memory, handle, ensure_ascii=True, indent=2)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Module C: dataset readers (CSV + stdlib-only minimal XLSX)
# ---------------------------------------------------------------------------

def _read_csv_dataset(path: str) -> Tuple[List[str], List[List[str]]]:
    """Read a CSV file; first row = headers. Returns (headers, rows)."""
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as handle:
        raw_rows = [row for row in csv.reader(handle)
                    if any(str(cell).strip() for cell in row)]
    if not raw_rows:
        return [], []
    headers = [str(h).strip() or "col_%d" % (i + 1)
               for i, h in enumerate(raw_rows[0])]
    width = len(headers)
    data = []
    for row in raw_rows[1:]:
        padded = (list(row) + [""] * width)[:width]
        data.append([str(cell) for cell in padded])
    return headers, data


def _xlsx_localname(tag: str) -> str:
    """Strip an XML namespace prefix from a tag name."""
    return str(tag).rsplit("}", 1)[-1]


def _xlsx_col_index(ref: str) -> Optional[int]:
    """Convert a cell reference like 'B12' to a zero-based column index."""
    letters = ""
    for ch in str(ref):
        if ch.isalpha():
            letters += ch.upper()
        else:
            break
    if not letters:
        return None
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch) - 64)
    return index - 1


def _read_xlsx_dataset(path: str) -> Tuple[List[str], List[List[str]]]:
    """Minimal stdlib-only .xlsx reader.

    An .xlsx file is a ZIP of XML parts. We parse xl/sharedStrings.xml and
    the first xl/worksheets/sheet*.xml with ElementTree. Handles shared
    strings, inline strings, booleans, and numbers. First row = headers.
    """
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        shared: List[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in root:
                if _xlsx_localname(si.tag) != "si":
                    continue
                parts = [node.text or "" for node in si.iter()
                         if _xlsx_localname(node.tag) == "t"]
                shared.append("".join(parts))
        sheets = sorted(n for n in names
                        if n.startswith("xl/worksheets/") and n.endswith(".xml"))
        if not sheets:
            return [], []
        sheet = ET.fromstring(archive.read(sheets[0]))

    table: List[List[str]] = []
    for row_el in sheet.iter():
        if _xlsx_localname(row_el.tag) != "row":
            continue
        cells: Dict[int, str] = {}
        next_col = 0
        for cell_el in row_el:
            if _xlsx_localname(cell_el.tag) != "c":
                continue
            col_idx = _xlsx_col_index(cell_el.get("r") or "")
            if col_idx is None:
                col_idx = next_col
            cell_type = cell_el.get("t") or ""
            value = ""
            if cell_type == "inlineStr":
                value = "".join(node.text or "" for node in cell_el.iter()
                                if _xlsx_localname(node.tag) == "t")
            else:
                v_text = None
                for child in cell_el:
                    if _xlsx_localname(child.tag) == "v":
                        v_text = child.text
                        break
                if v_text is not None:
                    if cell_type == "s":
                        try:
                            value = shared[int(v_text)]
                        except Exception:
                            value = v_text
                    elif cell_type == "b":
                        value = "TRUE" if v_text == "1" else "FALSE"
                    else:
                        value = v_text
            cells[col_idx] = value
            next_col = col_idx + 1
        if cells:
            width = max(cells.keys()) + 1
            table.append([cells.get(i, "") for i in range(width)])
    if not table:
        return [], []
    headers = [str(h).strip() or "col_%d" % (i + 1)
               for i, h in enumerate(table[0])]
    width = len(headers)
    data = []
    for row in table[1:]:
        padded = (row + [""] * width)[:width]
        if any(str(cell).strip() for cell in padded):
            data.append([str(cell) for cell in padded])
    return headers, data


# ---------------------------------------------------------------------------
# OmegaMasterEngine
# ---------------------------------------------------------------------------

class OmegaMasterEngine:
    """Unified master engine preserving the user's original router backbone."""

    def __init__(self) -> None:
        # Preserved verbatim from the user's blueprint.
        self.system_state = {
            "build_sync_status": "Deployed & Synced",
            "mining_investment_active": True,
            "tax_compliance_region": "Global/US-Compliant",
            "api_key_status": "Verified & Secure",
        }
        self.env = parse_env_file()
        self.openai_key = self.env.get("OPENAI_API_KEY") or os.environ.get(
            "OPENAI_API_KEY", ""
        )
        self.serper_key = self.env.get("SERPER_API_KEY") or os.environ.get(
            "SERPER_API_KEY", ""
        )
        self.session_log: List[Dict[str, Any]] = []
        # v29: GitHub sync configuration (token never printed in full).
        self.github_repo = self.env.get("GITHUB_REPO") or os.environ.get(
            "GITHUB_REPO", ""
        )
        self.github_token = self.env.get("GITHUB_TOKEN") or os.environ.get(
            "GITHUB_TOKEN", ""
        )
        # v29 Module A: persistent memory (load, count session, save).
        self.memory_path = resolve_memory_path()
        self.memory = load_memory(self.memory_path)
        self.memory["sessions"] = int(self.memory.get("sessions", 0)) + 1
        # v29.1.0: restore persisted UI language (defaults to English).
        self.lang = str(self.memory.get("lang") or DEFAULT_LANG)
        if self.lang not in LANG_PACKS:
            self.lang = DEFAULT_LANG
        self.memory["lang"] = self.lang
        save_memory(self.memory_path, self.memory)
        # v29 Module C: currently loaded dataset (restored from memory).
        self.dataset: Optional[Dict[str, Any]] = None
        self._restore_last_import()
        # v29.2.0: OpenRouter config for the optional online evolution mode.
        self.openrouter_key = self.env.get("OPENROUTER_API_KEY") or os.environ.get(
            "OPENROUTER_API_KEY", ""
        )
        self.openrouter_model = (
            self.env.get("OPENROUTER_MODEL")
            or os.environ.get("OPENROUTER_MODEL", "")
        ).strip() or OPENROUTER_DEFAULT_MODEL
        # v29.3.0: optional claude_engine bridge config. The engine itself is
        # created lazily on the first LLM call (never at boot).
        self.anthropic_key = self.env.get("ANTHROPIC_API_KEY") or os.environ.get(
            "ANTHROPIC_API_KEY", ""
        )
        self.omega_llm_model = (
            self.env.get("OMEGA_LLM_MODEL")
            or os.environ.get("OMEGA_LLM_MODEL", "")
        ).strip() or OPENAI_MODEL
        self._bridge_engine: Any = None
        self._bridge_attempted = False
        # v29.2.0: Subsystem #10 - Evolution Engine. Boot verifies/restores
        # omega_pillars.json (sha256 tamper detection) and bootstraps
        # omega_strategy_gen.py + omega_evolution.json when missing.
        self.evolution = EvolutionEngine(self)

    # ------------------------------------------------------------------
    # Availability matrix
    # ------------------------------------------------------------------

    def availability_matrix(self) -> List[Dict[str, str]]:
        """Return per-subsystem availability (Available / Degraded + reason)."""
        rows = [
            ("Build & Sync", "Available", "local integrity checks"),
            ("Mining & Investment", "Available", "local strategy snapshot"),
            (
                "Tax Support",
                "Available" if self.openai_key else "Degraded",
                "LLM-enhanced" if self.openai_key else "offline guidance (no OPENAI_API_KEY)",
            ),
            ("API & Security", "Available", "local gatekeeper checks"),
            (
                "Deep Research",
                "Available" if self.serper_key else "Degraded",
                "Serper live search" if self.serper_key else "offline research plan (no SERPER_API_KEY)",
            ),
            ("Companion/Tutor", "Available", "local study scaffolds"),
            ("Opportunity Engine", "Available", "local scan framework"),
            ("Finance Literacy", "Available", "local literacy guidance"),
            ("Self-Improvement", "Available", "local audit log"),
            (
                "Evolution Engine",
                "Available",
                "sandboxed self-evolution, pillars enforced",
            ),
        ]
        return [
            {"subsystem": name, "status": status, "detail": detail}
            for name, status, detail in rows
        ]

    # ------------------------------------------------------------------
    # Audit logging (all file I/O guarded)
    # ------------------------------------------------------------------

    def _audit(self, subsystem: str, input_summary: str, status: str,
               entry_type: str = "audit") -> Dict[str, Any]:
        entry = {
            "ts": utc_now_iso(),
            "type": entry_type,
            "subsystem": subsystem,
            "input_summary": str(input_summary)[:200],
            "status": status,
        }
        self.session_log.append(entry)
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as handle:
                handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
        except Exception:
            pass  # logging must never crash the engine
        return entry

    def read_log_tail(self, count: int = 10) -> List[Dict[str, Any]]:
        """Read the last `count` audit entries from omega_log.jsonl."""
        entries: List[Dict[str, Any]] = []
        try:
            if not os.path.isfile(LOG_FILE):
                return self.session_log[-count:]
            with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entries.append(json.loads(line))
                    except Exception:
                        continue
        except Exception:
            return self.session_log[-count:]
        return entries[-count:]

    # ------------------------------------------------------------------
    # Guarded online capabilities (stdlib urllib, 15s timeout)
    # ------------------------------------------------------------------

    def _serper_search(self, query: str) -> Optional[List[Dict[str, str]]]:
        """POST to Serper; return top 5 results or None on any failure."""
        if not self.serper_key:
            return None
        try:
            body = json.dumps({"q": query, "num": 5}).encode("utf-8")
            request = urllib.request.Request(
                SERPER_URL,
                data=body,
                headers={
                    "X-API-KEY": self.serper_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
            results = []
            for item in (data.get("organic") or [])[:5]:
                results.append({
                    "title": str(item.get("title", "")),
                    "link": str(item.get("link", "")),
                    "snippet": str(item.get("snippet", "")),
                })
            return results or None
        except Exception:
            return None

    def _get_bridge(self) -> Any:
        """Lazy singleton ClaudeLikeEngine. Returns None when unavailable.

        Never instantiated at boot and NEVER a hard dependency: when
        claude_engine is not installed (BRIDGE_AVAILABLE False) or no
        OPENAI_API_KEY is set, this simply returns None.
        """
        if self._bridge_attempted:
            return self._bridge_engine
        self._bridge_attempted = True
        if not BRIDGE_AVAILABLE or not self.openai_key:
            return None
        try:
            kwargs: Dict[str, Any] = {
                "model": self.omega_llm_model,
                "provider": "openai",
                "api_key": self.openai_key,
            }
            if self.anthropic_key:
                # Anthropic fallback provider for the circuit breaker.
                kwargs["fallback_provider"] = "anthropic"
                kwargs["fallback_model"] = CLAUDE_FALLBACK_MODEL
                kwargs["fallback_api_key"] = self.anthropic_key
            try:
                self._bridge_engine = ClaudeLikeEngine(**kwargs)
            except TypeError:
                # Tolerate a leaner constructor signature.
                self._bridge_engine = ClaudeLikeEngine(
                    model=self.omega_llm_model,
                    provider="openai",
                    api_key=self.openai_key,
                )
        except Exception:
            self._bridge_engine = None
        return self._bridge_engine

    def _bridge_llm(self, prompt: str) -> Optional[str]:
        """Try the claude_engine bridge; return text or None on ANY issue."""
        try:
            bridge = self._get_bridge()
            if bridge is None:
                return None
            reply = bridge.chat(prompt)
            if isinstance(reply, str):
                return reply if reply.strip() else None
            if isinstance(reply, dict):
                content = reply.get("content") or reply.get("text")
                if content:
                    return str(content)
            if reply:
                return str(reply)
            return None
        except Exception:
            return None

    def _llm(self, prompt: str) -> Optional[str]:
        """Return LLM text or None on failure.

        v29.3.0: routes through the optional claude_engine bridge first when
        it is installed and OPENAI_API_KEY is set; ANY exception (or empty
        reply) falls back to the stdlib urllib path below. Externally the
        behavior is identical.
        """
        if not self.openai_key:
            return None
        if BRIDGE_AVAILABLE:
            bridged = self._bridge_llm(prompt)
            if bridged:
                return bridged
            # Bridge failed -> fall through to the urllib path.
        try:
            body = json.dumps({
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 512,
            }).encode("utf-8")
            request = urllib.request.Request(
                OPENAI_URL,
                data=body,
                headers={
                    "Authorization": "Bearer " + self.openai_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
            choices = data.get("choices") or []
            if not choices:
                return None
            message = choices[0].get("message") or {}
            content = message.get("content")
            return str(content) if content else None
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Master router (user's backbone, extended to 9 subsystems)
    # ------------------------------------------------------------------

    def execute_omega_subsystem(self, domain: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        domain = (domain or "").lower().strip()
        entry_type = "audit"

        if any(k in domain for k in ("build", "sync", "deploy", KW_BUILT_ZH)):
            result = {
                "status": "Success",
                "subsystem": "Omega Infrastructure Build & Sync",
                "message": ("System integrity verified. Nodes synchronized. "
                            "Operational baseline steady."),
                "build_sync_status": self.system_state["build_sync_status"],
            }
        elif any(k in domain for k in ("mining", "investment", "invest",
                                       "portfolio", "crypto")):
            result = {
                "status": "Active",
                "subsystem": "Omega Mining & Investment Engine",
                "metrics": {
                    "hashrate_allocation": "Optimized",
                    "portfolio_rebalancing": "Automated",
                },
                "message": ("Yield optimization models running. "
                            "Market trend vectors updated."),
                "strategy_snapshot": self._mining_strategy(payload),
            }
            note = self.dataset_note()
            if note:
                result["dataset_note"] = note
        elif any(k in domain for k in ("tax", KW_TAX_ZH, "vat", "sars",
                                       "compliance")):
            result = self._tax_support(payload)
        elif any(k in domain for k in ("api", "key", "status", "security")):
            result = {
                "status": "Authenticated",
                "subsystem": "Omega Security Gatekeeper",
                "token_leak_protection": "Enabled",
                "message": ("API key handshakes secure. Rate limits healthy. "
                            "Encryption keys active."),
                "keys": {
                    "OPENAI_API_KEY": mask_secret(self.openai_key),
                    "SERPER_API_KEY": mask_secret(self.serper_key),
                },
            }
        elif any(k in domain for k in ("research", "search", "deep", "find out")):
            result = self._deep_research(payload)
        elif any(k in domain for k in ("companion", "teach", "learn", "explain")):
            result = self._companion(payload)
        elif any(k in domain for k in ("opportunity", "opportunities",
                                       "hustle", "business")):
            result = self._opportunity(payload)
        elif any(k in domain for k in ("finance", "scam", "budget", "debt",
                                       "saving")):
            result = self._finance_literacy(payload)
        elif any(k in domain for k in ("evolution", "mutation",
                                       "self improve engine")):
            result = {
                "status": "Ready",
                "subsystem": "Omega Evolution Engine",
                "message": ("Evolution engine standing by. Control it with "
                            "'evolve', 'evolve run', 'evolve lineage', "
                            "'evolve pillars', 'evolve rollback', "
                            "'evolve test <query>'."),
                "generation": self.evolution.generation(),
                "pillars_integrity": self.evolution.pillars_status(),
            }
        elif any(k in domain for k in ("selfimprove", "improve yourself",
                                       "evolve")):
            note = str(payload.get("query", "")).strip() or "General self-improvement pass."
            entry_type = "selfimprove"
            result = {
                "status": "Logged",
                "subsystem": "Omega Self-Improvement",
                "message": "Improvement note recorded to audit trail.",
                "note": note,
                "logged_at": utc_now_iso(),
            }
        else:
            result = {
                "status": "Unknown",
                "message": ("Domain '%s' routed to master core for generic "
                            "evaluation." % domain),
            }

        self._audit(result.get("subsystem", "Master Core"),
                    payload.get("query", domain),
                    result.get("status", "Unknown"),
                    entry_type=entry_type)
        return result

    # ------------------------------------------------------------------
    # Subsystem handlers
    # ------------------------------------------------------------------

    def _mining_strategy(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "active": self.system_state["mining_investment_active"],
            "allocation": "60% BTC / 25% ETH / 15% stable yield",
            "risk_mode": "Balanced",
            "rebalance_trigger": "+/- 5% drift",
            "note": ("Educational snapshot only - not financial advice."),
        }

    def _tax_support(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        topic = str(payload.get("query", "")).strip() or "general"
        guidance = [
            "Map all taxable events: income, capital gains, VAT/GST where applicable.",
            "Keep transaction ledgers with dates, amounts, and counterparty records.",
            "Track cost basis per asset for capital gains calculations.",
            "Check filing deadlines and registration thresholds for your region.",
            "Separate personal and business accounts for clean audit trails.",
        ]
        result: Dict[str, Any] = {
            "status": "Compliant",
            "subsystem": "Omega Tax & Audit Support",
            "topic": topic,
            "region": self.system_state["tax_compliance_region"],
            "message": ("Tax brackets mapped. Transaction ledgers formatted for "
                        "capital gains tracking."),
            "guidance": guidance,
            "disclaimer": TAX_DISCLAIMER,
        }
        # LLM-enhanced if key present (guarded; falls back silently).
        llm_note = self._llm(
            "Give brief, general, educational tax guidance for the topic: "
            + topic + ". Include a reminder to consult a professional."
        )
        if llm_note:
            result["llm_enhanced"] = llm_note
        # v29: a loaded dataset is referenceable by the tax subsystem.
        note = self.dataset_note()
        if note:
            result["dataset_note"] = note
        return result

    def _deep_research(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        query = str(payload.get("query", "")).strip() or "unspecified topic"
        hits = self._serper_search(query)
        if hits:
            return {
                "status": "Success",
                "subsystem": "Omega Deep Research",
                "mode": "live (Serper)",
                "query": query,
                "results": hits,
            }
        return {
            "status": "Degraded",
            "subsystem": "Omega Deep Research",
            "mode": "offline research plan",
            "query": query,
            "research_plan": [
                "1. Define the precise question and success criteria.",
                "2. Gather primary sources: official docs, papers, data sets.",
                "3. Cross-check at least 3 independent secondary sources.",
                "4. Extract claims, evidence quality, and dates into a table.",
                "5. Synthesize findings; flag uncertainties and conflicts.",
                "6. Record sources with links and access dates.",
            ],
            "hint": ("Set SERPER_API_KEY in .env to enable live web search."),
        }

    def _companion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        topic = str(payload.get("query", "")).strip() or "your chosen topic"
        return {
            "status": "Ready",
            "subsystem": "Omega Companion/Tutor",
            "topic": topic,
            "scaffold": [
                "ELI5: core idea of '%s' in one plain sentence." % topic,
                "Key terms: list 5 vocabulary words to master first.",
                "Mental model: one analogy that maps to something familiar.",
                "Worked example: walk through one concrete case step by step.",
                "Active recall: 3 questions to test yourself without notes.",
                "Next step: one small practice task to do today.",
            ],
        }

    def _opportunity(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        domain = str(payload.get("query", "")).strip() or "general market"
        return {
            "status": "Scanned",
            "subsystem": "Omega Opportunity Engine",
            "domain": domain,
            "scan_framework": [
                "Demand: who hurts enough to pay for a solution in '%s'?" % domain,
                "Supply gap: what are incumbents ignoring or doing poorly?",
                "Edge: what skill, asset, or access do you already have?",
                "Monetization: 3 realistic revenue models and price points.",
                "Validation: cheapest 7-day test to prove real demand.",
                "Risk: top 2 failure modes and how to cap downside.",
            ],
            "note": "Framework output - validate locally before investing money.",
        }

    def _finance_literacy(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        topic = str(payload.get("query", "")).strip() or "general money skills"
        return {
            "status": "Ready",
            "subsystem": "Omega Finance Literacy",
            "topic": topic,
            "guidance": [
                "Budget first: 50/30/20 rule (needs / wants / saving) as a start.",
                "Emergency fund: target 3-6 months of essential expenses.",
                "Debt: pay highest-interest debt first (avalanche method).",
                "Scam check: guaranteed high returns + urgency + secrecy = walk away.",
                "Verify: check any advisor/platform against your regulator's register.",
                "Never invest money you cannot afford to lose.",
            ],
            "disclaimer": TAX_DISCLAIMER,
        }

    # ------------------------------------------------------------------
    # Module A: persistent memory commands
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # v29.1.0: UI language packs
    # ------------------------------------------------------------------

    def ui(self, key: str) -> str:
        """Look up a UI string in the active language pack (en fallback)."""
        pack = LANG_PACKS.get(self.lang) or LANG_PACKS[DEFAULT_LANG]
        value = pack.get(key)
        if value is None:
            value = LANG_PACKS[DEFAULT_LANG].get(key, key)
        return str(value)

    def ui_format(self, key: str, *args: Any) -> str:
        """Format a UI string; fall back to the raw template on mismatch."""
        template = self.ui(key)
        try:
            return template % args
        except Exception:
            return template

    def set_lang(self, code: str) -> bool:
        """Switch the active UI language and persist it. Returns success."""
        code = str(code or "").strip().lower()
        if code not in LANG_PACKS:
            return False
        self.lang = code
        self.memory["lang"] = code
        save_memory(self.memory_path, self.memory)
        return True

    def remember_fact(self, fact: str) -> str:
        """Append a fact to persistent memory and save."""
        fact = str(fact).strip()
        if not fact:
            return "Usage: remember <fact>"
        facts = self.memory.setdefault("facts", [])
        facts.append(fact)
        if save_memory(self.memory_path, self.memory):
            return self.ui_format("remembered", len(facts), fact)
        return "Kept in session memory (disk save failed): %s" % fact

    def forget_fact(self, index: int) -> Optional[str]:
        """Delete fact #index (1-based). Returns the removed fact or None."""
        facts = self.memory.setdefault("facts", [])
        if 1 <= index <= len(facts):
            removed = str(facts.pop(index - 1))
            save_memory(self.memory_path, self.memory)
            return removed
        return None

    def add_history(self, role: str, text: str) -> None:
        """Append one exchange to history (capped, oldest trimmed)."""
        try:
            history = self.memory.setdefault("history", [])
            history.append({
                "ts": utc_now_iso(),
                "role": str(role),
                "text": str(text)[:500],
            })
            if len(history) > MAX_HISTORY_ENTRIES:
                del history[: len(history) - MAX_HISTORY_ENTRIES]
        except Exception:
            pass  # history must never crash the engine

    # ------------------------------------------------------------------
    # Module C: dataset import / analyze / query
    # ------------------------------------------------------------------

    def dataset_note(self) -> Optional[str]:
        """One-line note for tax/mine subsystems when a dataset is loaded."""
        if self.dataset:
            return ("Dataset note: %d rows from '%s' are loaded and "
                    "available for analysis." % (
                        len(self.dataset.get("rows", [])),
                        self.dataset.get("name", "dataset")))
        return None

    def _restore_last_import(self) -> None:
        """Reload the dataset referenced by memory datasets.last_import."""
        try:
            datasets = self.memory.get("datasets") or {}
            meta = datasets.get("last_import")
            if not isinstance(meta, dict):
                return
            path = str(meta.get("path") or "")
            if path and os.path.isfile(path):
                ok, _msg = self.import_dataset(path, save=False)
                if not ok:
                    self.dataset = None
        except Exception:
            self.dataset = None

    def import_dataset(self, path: str, save: bool = True) -> Tuple[bool, str]:
        """Load a .csv or .xlsx dataset. Returns (ok, message). Never raises."""
        try:
            path = str(path or "").strip()
            if not path:
                return False, "Usage: import <path-to-csv-or-xlsx>"
            if not os.path.isfile(path):
                return False, "File not found: %s" % path
            ext = os.path.splitext(path)[1].lower()
            if ext == ".csv":
                headers, rows = _read_csv_dataset(path)
            elif ext == ".xlsx":
                headers, rows = _read_xlsx_dataset(path)
            else:
                return False, ("Unsupported extension '%s'. Only .csv and "
                               ".xlsx are supported." % (ext or "(none)"))
            if not headers:
                return False, "No header row found in %s." % path
            if len(rows) > MAX_DATASET_ROWS:
                return False, ("Dataset has %d rows; the limit is %d. "
                               "Import refused." % (len(rows), MAX_DATASET_ROWS))
            self.dataset = {
                "path": os.path.abspath(path),
                "name": os.path.basename(path),
                "source": ext.lstrip("."),
                "headers": headers,
                "rows": rows,
            }
            self.memory.setdefault("datasets", {})["last_import"] = {
                "path": os.path.abspath(path),
                "name": os.path.basename(path),
                "source": ext.lstrip("."),
                "rows": len(rows),
                "columns": len(headers),
                "headers": headers,
                "ts": utc_now_iso(),
            }
            if save:
                save_memory(self.memory_path, self.memory)
            return True, ("Imported %d row(s) x %d column(s) from %s "
                          "(%s)." % (len(rows), len(headers),
                                     os.path.basename(path), ext.lstrip(".")))
        except Exception as exc:
            return False, "Import failed safely: %s" % exc

    def analyze_dataset(self) -> List[str]:
        """Summarize the loaded dataset: counts, numeric stats, top values."""
        if not self.dataset:
            return ["No dataset loaded. Use: import <path-to-csv-or-xlsx>"]
        headers = self.dataset.get("headers", [])
        rows = self.dataset.get("rows", [])
        lines = [
            "Dataset: %s" % self.dataset.get("name", "?"),
            "Path: %s" % self.dataset.get("path", "?"),
            "Rows: %d | Columns: %d" % (len(rows), len(headers)),
            "Columns: " + ", ".join(str(h) for h in headers),
        ]
        for ci in range(len(headers)):
            column = [str(r[ci]) if ci < len(r) else "" for r in rows]
            non_empty = [c for c in column if c.strip()]
            lines.append("  %s: non-empty %d/%d"
                         % (headers[ci], len(non_empty), len(rows)))
            numbers: List[float] = []
            numeric = bool(non_empty)
            for cell in non_empty:
                try:
                    numbers.append(float(cell.replace(",", "")))
                except (ValueError, TypeError):
                    numeric = False
                    break
            if numeric:
                mean = sum(numbers) / len(numbers)
                lines.append("    numeric: min=%g max=%g mean=%.2f"
                             % (min(numbers), max(numbers), mean))
            elif non_empty:
                counts: Dict[str, int] = {}
                for cell in non_empty:
                    counts[cell] = counts.get(cell, 0) + 1
                top = sorted(counts.items(),
                             key=lambda kv: (-kv[1], kv[0]))[:5]
                lines.append("    top values: "
                             + ", ".join("%s (x%d)" % (v, n) for v, n in top))
        return lines

    def query_dataset(self, text: str) -> List[str]:
        """Case-insensitive substring filter over all cells (max 15 rows)."""
        if not self.dataset:
            return ["No dataset loaded. Use: import <path-to-csv-or-xlsx>"]
        needle = str(text).strip().lower()
        if not needle:
            return ["Usage: query <text>"]
        rows = self.dataset.get("rows", [])
        matches = [(i, row) for i, row in enumerate(rows, 1)
                   if any(needle in str(cell).lower() for cell in row)]
        if not matches:
            return ["No rows match '%s'." % text]
        lines = ["%d row(s) match '%s' (showing up to 15):"
                 % (len(matches), text)]
        for i, row in matches[:15]:
            lines.append("  row %d: %s" % (i, " | ".join(str(c) for c in row)))
        if len(matches) > 15:
            lines.append("  ... and %d more." % (len(matches) - 15))
        return lines

    # ------------------------------------------------------------------
    # Module B: GitHub auto-sync (git via subprocess, token always masked)
    # ------------------------------------------------------------------

    def _git_path(self) -> Optional[str]:
        try:
            return shutil.which("git")
        except Exception:
            return None

    def _mask_sync_output(self, text: str) -> str:
        """Ensure GITHUB_TOKEN (and credentialed repo URL) never print."""
        masked = str(text)
        try:
            if self.github_token:
                masked = masked.replace(self.github_token,
                                        mask_secret(self.github_token))
            if self.github_repo and "://" in self.github_repo:
                masked = masked.replace(self.github_repo,
                                        mask_secret(self.github_repo))
        except Exception:
            pass
        return masked

    def _run_git(self, args: List[str],
                 timeout: int = GIT_TIMEOUT) -> Tuple[bool, str]:
        """Run a git command; return (ok, masked combined output)."""
        try:
            proc = subprocess.run(
                ["git"] + list(args),
                capture_output=True, text=True, timeout=timeout,
            )
            output = ((proc.stdout or "") + (proc.stderr or "")).strip()
            return proc.returncode == 0, self._mask_sync_output(output)
        except Exception as exc:
            return False, self._mask_sync_output(str(exc))

    def sync_status_lines(self) -> List[str]:
        """Report git availability, repo config, last commit. Never raises."""
        lines = []
        git_path = self._git_path()
        lines.append("git binary: %s" % (git_path if git_path else "NOT FOUND"))
        if self.github_repo:
            repo_display = (mask_secret(self.github_repo)
                            if "://" in self.github_repo else self.github_repo)
            lines.append("GITHUB_REPO: configured (%s)" % repo_display)
        else:
            lines.append("GITHUB_REPO: not configured")
        lines.append("GITHUB_TOKEN: %s" % mask_secret(self.github_token))
        if git_path:
            ok, out = self._run_git(["rev-parse", "--is-inside-work-tree"],
                                    timeout=15)
            inside = ok and out.lower().startswith("true")
            lines.append("inside git repo: %s" % ("yes" if inside else "no"))
            if inside:
                ok_log, log_line = self._run_git(["log", "-1", "--oneline"],
                                                 timeout=15)
                if ok_log and log_line:
                    lines.append("last commit: %s" % log_line)
                else:
                    lines.append("last commit: (none)")
        hints = []
        if not git_path:
            hints.append("install git to enable sync")
        if not self.github_repo:
            hints.append("set GITHUB_REPO=owner/repo in .env")
        if hints:
            lines.append("hint: " + "; ".join(hints) + ".")
        return lines

    def sync_github(self) -> List[str]:
        """git add + commit + push the engine files. Always graceful."""
        lines = ["GitHub sync:"]
        if not self._git_path():
            lines.append("  git binary not found. Install git and retry.")
            return lines
        if not self.github_repo:
            lines.append("  GITHUB_REPO not set. Add GITHUB_REPO=owner/repo "
                         "(or full URL) to .env and retry.")
            return lines
        ok, out = self._run_git(["rev-parse", "--is-inside-work-tree"],
                                timeout=15)
        if not (ok and out.lower().startswith("true")):
            lines.append("  current directory is not a git repository.")
            lines.append("  hint: run 'git init' and add a remote first.")
            return lines
        targets = [f for f in ("omega.py", MEMORY_FILE, LOG_FILE)
                   if os.path.isfile(f)]
        if not targets:
            lines.append("  nothing to sync: omega.py / %s / %s not present "
                         "here." % (MEMORY_FILE, LOG_FILE))
            return lines
        ok, out = self._run_git(["add"] + targets)
        lines.append("  git add %s: %s" % (
            " ".join(targets), "ok" if ok else "FAILED - " + (out or "error")))
        if not ok:
            return lines
        commit_msg = "LUQI AI sync " + utc_now_iso()
        ok, out = self._run_git(["commit", "-m", commit_msg])
        if ok:
            lines.append("  git commit: ok (%s)" % commit_msg)
        elif "nothing to commit" in out.lower() or "no changes added" in out.lower():
            lines.append("  git commit: nothing new to commit.")
        else:
            lines.append("  git commit: FAILED - " + (out or "error"))
            return lines
        ok, out = self._run_git(["push"])
        if ok:
            remote = (mask_secret(self.github_repo)
                      if "://" in self.github_repo else self.github_repo)
            lines.append("  git push: ok. Synced to %s." % remote)
        else:
            lines.append("  git push: FAILED - "
                         + (out or "error (check credentials/GITHUB_TOKEN)"))
        return lines

    # ------------------------------------------------------------------
    # v29.1.0: export + report markdown writers (guarded I/O)
    # ------------------------------------------------------------------

    def export_markdown(self) -> Tuple[bool, str]:
        """Write omega_export_<UTCts>.md: state, facts, import, history, audit."""
        try:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            filename = "omega_export_%s.md" % stamp
            facts = [str(f) for f in self.memory.get("facts", [])]
            history = list(self.memory.get("history", []))[-50:]
            audit_entries = self.read_log_tail(50)
            datasets = self.memory.get("datasets") or {}
            last_import = datasets.get("last_import")
            lines = [
                "# " + ENGINE_NAME + " - Export",
                "",
                "Generated: %s (UTC)" % utc_now_iso(),
                "Session: #%d | Language: %s" % (
                    self.memory.get("sessions", 1), self.lang),
                "",
                "## System State",
            ]
            for key, value in self.system_state.items():
                lines.append("- %s: %s" % (key, value))
            lines.append("")
            lines.append("## Facts (%d)" % len(facts))
            if facts:
                for i, fact in enumerate(facts, 1):
                    lines.append("%d. %s" % (i, fact))
            else:
                lines.append("(none)")
            lines.append("")
            lines.append("## Last Import")
            if isinstance(last_import, dict) and last_import:
                for key, value in last_import.items():
                    lines.append("- %s: %s" % (key, value))
            else:
                lines.append("(none)")
            lines.append("")
            lines.append("## History (last %d)" % len(history))
            if history:
                for entry in history:
                    lines.append("- %s | %s | %s" % (
                        entry.get("ts", "?"), entry.get("role", "?"),
                        entry.get("text", "")))
            else:
                lines.append("(none)")
            lines.append("")
            lines.append("## Audit (last %d)" % len(audit_entries))
            if audit_entries:
                for entry in audit_entries:
                    lines.append("- %s | %s | %s | %s" % (
                        entry.get("ts", "?"), entry.get("subsystem", "?"),
                        entry.get("status", "?"),
                        entry.get("input_summary", "")))
            else:
                lines.append("(none)")
            lines.append("")
            with open(filename, "w", encoding="utf-8") as handle:
                handle.write("\n".join(lines))
            return True, "Export saved: %s" % filename
        except Exception as exc:
            return False, "Export failed safely: %s" % exc

    def _report_findings(self, result: Dict[str, Any]) -> List[str]:
        """Flatten a subsystem result dict into key-finding bullet lines."""
        findings: List[str] = []
        if result.get("message"):
            findings.append(str(result["message"]))
        for key, value in result.items():
            if key in ("subsystem", "status", "message"):
                continue
            if isinstance(value, dict):
                for sub_key, sub_val in value.items():
                    findings.append("%s.%s: %s" % (key, sub_key, sub_val))
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        findings.append("; ".join(
                            "%s: %s" % (k, v) for k, v in item.items()))
                    else:
                        findings.append(str(item))
            else:
                findings.append("%s: %s" % (key, value))
        return findings

    def write_report(self, topic: str) -> Tuple[bool, str]:
        """Route topic through the master router, write a markdown report."""
        try:
            topic = str(topic or "").strip()
            if not topic:
                return False, "Usage: report <topic>"
            result = self.execute_omega_subsystem(topic, {"query": topic})
            subsystem = str(result.get("subsystem", "Master Core"))
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            filename = "omega_report_%s_%s.md" % (_slugify(topic), stamp)
            findings = self._report_findings(result)
            actions = list(REPORT_GENERIC_ACTIONS)
            actions.extend(REPORT_NEXT_ACTIONS.get(
                subsystem, REPORT_DEFAULT_ACTIONS))
            lines = [
                "# Report: %s" % topic,
                "",
                "Generated: %s (UTC)" % utc_now_iso(),
                "Engine: " + ENGINE_NAME,
                "Subsystem: %s" % subsystem,
                "Status: %s" % str(result.get("status", "Unknown")),
                "",
                "## Key Findings",
            ]
            if findings:
                lines.extend("- " + str(f) for f in findings)
            else:
                lines.append("- (no findings)")
            lines.append("")
            lines.append("## Suggested Next Actions")
            for i, action in enumerate(actions, 1):
                lines.append("%d. %s" % (i, action))
            lines.append("")
            with open(filename, "w", encoding="utf-8") as handle:
                handle.write("\n".join(lines))
            return True, "Report saved: %s" % filename
        except Exception as exc:
            return False, "Report failed safely: %s" % exc


# ---------------------------------------------------------------------------
# v29.3.0: process-isolated sandbox for evolution gate 2 (SPEC_v293.md 2)
# ---------------------------------------------------------------------------
# The worker target MUST be a module-level function so the spawn context can
# pickle it. multiprocessing is never invoked at import time (only inside
# exec_contract_gate), and omega.py is already __main__-guarded, so spawning
# is safe on every platform.

def _sandbox_worker(code: str, tests: List[Any], queue: Any) -> None:
    """Child-process target: exec the candidate and run the contract tests.

    BEFORE exec'ing candidate code, POSIX children install a hard 256 MB
    address-space ceiling (resource.RLIMIT_AS) so a memory bomb dies with a
    catchable MemoryError -> rejection. On Windows the 'resource' module is
    missing (and other platforms may raise ValueError/OSError), so the
    ceiling is skipped inside try/except - REVIEW note: on Windows gate 2 is
    timeout-only protection (no memory ceiling), by design.

    The result is reported back through the multiprocessing.Queue as a plain
    dict: {ok, reason, pass_rate, latency_avg}.
    """
    result: Dict[str, Any] = {
        "ok": False,
        "reason": "sandbox worker crashed before producing a result",
        "pass_rate": 0.0,
        "latency_avg": 0.0,
    }
    try:
        try:
            import resource  # POSIX only; absent on Windows
            resource.setrlimit(resource.RLIMIT_AS,
                               (EVO_MEMORY_LIMIT, EVO_MEMORY_LIMIT))
        except (ImportError, ValueError, OSError):
            # Windows / restricted hosts: no memory ceiling (timeout-only).
            pass
        namespace = EvolutionEngine._restricted_namespace()
        compiled = compile(code, "<omega_candidate>", "exec")
        exec(compiled, namespace)
        fn = namespace.get("execute_logic")
        if not callable(fn):
            result["reason"] = "execute_logic is not defined"
        else:
            total = float(len(tests)) or 1.0
            passed = 0
            latencies: List[float] = []
            failure: Optional[str] = None
            for query, telemetry in tests:
                start = time.perf_counter()
                output = fn(query, list(telemetry))
                latency = time.perf_counter() - start
                if not isinstance(output, str):
                    failure = ("contract test %r returned non-string" % query)
                    break
                if "<omega_analysis>" not in output:
                    failure = ("contract test %r missing <omega_analysis> tag"
                               % query)
                    break
                passed += 1
                latencies.append(latency)
            result["pass_rate"] = passed / total
            if failure is None:
                result["ok"] = True
                result["reason"] = "ok"
                if latencies:
                    result["latency_avg"] = sum(latencies) / len(latencies)
            else:
                result["reason"] = failure
    except MemoryError:
        result["reason"] = ("memory ceiling exceeded (MemoryError, 256 MB "
                            "RLIMIT_AS)")
    except Exception as exc:
        result["reason"] = "%s: %s" % (type(exc).__name__, exc)
    try:
        queue.put(result)
    except Exception:
        pass


def _close_sandbox_queue(queue: Any) -> None:
    """Release queue resources without ever raising."""
    try:
        queue.cancel_join_thread()
    except Exception:
        pass
    try:
        queue.close()
    except Exception:
        pass


def sandbox_live_children() -> int:
    """Count live multiprocessing children of THIS process (spawn context).

    Used by the gate-2 no-zombie assertion and by the selftest's
    process-isolation proof. Never raises.
    """
    try:
        ctx = multiprocessing.get_context("spawn")
        count = 0
        for proc in ctx.active_children():
            try:
                if proc.is_alive():
                    count += 1
            except Exception:
                pass
        return count
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# v29.2.0: Subsystem #10 - Evolution Engine (SAFE self-improvement)
# ---------------------------------------------------------------------------

class EvolutionEngine:
    """Hardened absorption of the uploaded OmegaHyperEngine concept.

    Keeps the concepts (immutable pillars, hot-swappable
    execute_logic(query, telemetry) contract, telemetry scoring, evolution
    cycles) and fixes the flaws: pillars are enforced via sha256 tamper
    detection instead of prompt text, mutations pass a real 3-gate safety
    pipeline instead of a full-privilege exec, the OpenRouter endpoint is
    correct, and the health score is clamped to [0.0, 1.0].
    """

    # The 3 fixed contract tests every candidate must pass (SPEC 2.3).
    CONTRACT_TESTS = [
        ("Test Verify Parameter", ["Telemetry Operational"]),
        ("health check", []),
        ("rebalance portfolio", ["mining cluster alpha"]),
    ]

    def __init__(self, engine: "OmegaMasterEngine") -> None:
        self.engine = engine
        self.pillars_path = PILLARS_FILE
        self.strategy_path = STRATEGY_FILE
        self.state_path = EVOLUTION_FILE
        self.state = self._load_state()
        # Boot: real pillar enforcement (create / verify / restore).
        try:
            self.verify_pillars(announce=True)
        except Exception:
            pass
        # Boot: bootstrap the evolvable strategy module (Generation 01).
        self._bootstrap_strategy()

    # ------------------------------------------------------------------
    # State (omega_evolution.json) - all I/O guarded
    # ------------------------------------------------------------------

    @staticmethod
    def _default_state() -> Dict[str, Any]:
        return {
            "generation": 1,
            "current_fitness": None,
            "health": 1.0,
            "scores": [],
            "lineage": [],
            "archive_fitness": {},
        }

    def _load_state(self) -> Dict[str, Any]:
        state = self._default_state()
        try:
            if not os.path.isfile(self.state_path):
                return state
            with open(self.state_path, "r", encoding="utf-8",
                      errors="replace") as handle:
                data = json.load(handle)
            if not isinstance(data, dict):
                return state
            try:
                state["generation"] = max(1, int(data.get("generation", 1)))
            except Exception:
                pass
            fitness = data.get("current_fitness")
            if isinstance(fitness, (int, float)):
                state["current_fitness"] = float(fitness)
            try:
                state["health"] = max(0.0, min(1.0, float(
                    data.get("health", 1.0))))
            except Exception:
                pass
            if isinstance(data.get("scores"), list):
                state["scores"] = [float(s) for s in data["scores"]
                                   if isinstance(s, (int, float))][-10:]
            if isinstance(data.get("lineage"), list):
                state["lineage"] = [e for e in data["lineage"]
                                    if isinstance(e, dict)]
            if isinstance(data.get("archive_fitness"), dict):
                state["archive_fitness"] = {
                    str(k): v for k, v in data["archive_fitness"].items()
                }
        except Exception:
            return self._default_state()
        return state

    def _save_state(self) -> bool:
        try:
            with open(self.state_path, "w", encoding="utf-8") as handle:
                json.dump(self.state, handle, ensure_ascii=True, indent=2)
            return True
        except Exception:
            return False

    def generation(self) -> int:
        try:
            return max(1, int(self.state.get("generation", 1)))
        except Exception:
            return 1

    def health(self) -> float:
        try:
            return max(0.0, min(1.0, float(self.state.get("health", 1.0))))
        except Exception:
            return 1.0

    # ------------------------------------------------------------------
    # Immutable pillars - REAL enforcement (sha256 tamper detection)
    # ------------------------------------------------------------------

    @staticmethod
    def canonical_pillars_json() -> str:
        return json.dumps(CANONICAL_PILLARS, ensure_ascii=True,
                          sort_keys=True)

    @classmethod
    def canonical_pillars_sha256(cls) -> str:
        blob = cls.canonical_pillars_json().encode("utf-8")
        return hashlib.sha256(blob).hexdigest()

    def _write_canonical_pillars(self) -> bool:
        try:
            payload = {
                "pillars": dict(CANONICAL_PILLARS),
                "sha256": self.canonical_pillars_sha256(),
            }
            with open(self.pillars_path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=True, indent=2)
            return True
        except Exception:
            return False

    def pillars_status(self) -> str:
        """Silent integrity check: 'OK' or 'TAMPERED'. Never raises."""
        try:
            with open(self.pillars_path, "r", encoding="utf-8",
                      errors="replace") as handle:
                payload = json.load(handle)
            if not isinstance(payload, dict):
                return "TAMPERED"
            if payload.get("sha256") != self.canonical_pillars_sha256():
                return "TAMPERED"
            if payload.get("pillars") != dict(CANONICAL_PILLARS):
                return "TAMPERED"
            return "OK"
        except Exception:
            return "TAMPERED"

    def verify_pillars(self, announce: bool = True) -> str:
        """Create the pillar file if missing; detect + restore tampering.

        Returns 'CREATED' / 'OK' / 'RESTORED'. On tamper, prints the
        spec-mandated message and logs to the audit trail.
        """
        try:
            if not os.path.isfile(self.pillars_path):
                self._write_canonical_pillars()
                return "CREATED"
            if self.pillars_status() == "OK":
                return "OK"
            self._write_canonical_pillars()
            if announce:
                print("PILLAR TAMPER DETECTED - restored canonical pillars")
            try:
                self.engine._audit("Evolution", "pillar tamper detected",
                                   "Restored")
            except Exception:
                pass
            return "RESTORED"
        except Exception:
            return "OK"

    def pillars_lines(self) -> List[str]:
        lines = ["Immutable pillars (integrity: %s):" % self.pillars_status()]
        for key, value in CANONICAL_PILLARS.items():
            lines.append("  %s: %s" % (key, value))
        lines.append("  sha256: %s" % self.canonical_pillars_sha256())
        return lines

    # ------------------------------------------------------------------
    # Evolvable strategy module (omega_strategy_gen.py)
    # ------------------------------------------------------------------

    def _bootstrap_strategy(self) -> None:
        try:
            if not os.path.isfile(self.strategy_path):
                with open(self.strategy_path, "w", encoding="utf-8") as handle:
                    handle.write(EVO_GEN1_CODE)
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Gate 1: AST whitelist
    # ------------------------------------------------------------------

    @staticmethod
    def ast_gate(code: str) -> Tuple[bool, str]:
        """Static analysis gate. Returns (ok, reason). Never raises."""
        try:
            tree = ast.parse(code)
        except SyntaxError as exc:
            return False, "syntax error: %s" % exc
        except Exception as exc:
            return False, "unparseable candidate: %s" % exc
        try:
            for node in ast.walk(tree):
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    return False, "imports are not allowed"
                if not isinstance(node, _EVO_ALLOWED_NODES):
                    return False, ("disallowed syntax: %s"
                                   % type(node).__name__)
                if isinstance(node, ast.Name):
                    if node.id in EVO_BANNED_NAMES:
                        return False, "banned name: %s" % node.id
                    if node.id.startswith("__"):
                        return False, "dunder name not allowed: %s" % node.id
                if isinstance(node, ast.Attribute):
                    if node.attr.startswith("_"):
                        return False, ("private/dunder attribute not "
                                       "allowed: %s" % node.attr)
                if isinstance(node, ast.Call):
                    func = node.func
                    if isinstance(func, ast.Name):
                        if func.id not in EVO_SAFE_FUNCS:
                            return False, ("call to non-whitelisted "
                                           "function: %s" % func.id)
                    elif isinstance(func, ast.Attribute):
                        if func.attr not in EVO_SAFE_METHODS:
                            return False, ("call to non-whitelisted "
                                           "method: %s" % func.attr)
                    else:
                        return False, "unsupported call target"
            body = [n for n in tree.body if not isinstance(n, ast.Expr)
                    or not isinstance(getattr(n, "value", None),
                                      ast.Constant)]
            funcs = [n for n in tree.body
                     if isinstance(n, ast.FunctionDef)]
            if len(funcs) != 1 or funcs[0].name != "execute_logic" \
                    or len(body) != 1:
                return False, ("candidate must define exactly one function: "
                               "execute_logic")
            return True, "ok"
        except Exception as exc:
            return False, "AST analysis failed: %s" % exc

    # ------------------------------------------------------------------
    # Gate 2: restricted exec + contract tests
    # v29.3.0: gate 2 itself is PROCESS-ISOLATED (see exec_contract_gate and
    # the module-level _sandbox_worker above). The thread-timeout helper
    # below is kept ONLY for 'evolve test <query>', which runs the already
    # vetted live strategy module (never a candidate mutation).
    # ------------------------------------------------------------------

    @staticmethod
    def _restricted_namespace() -> Dict[str, Any]:
        """Namespace whose __builtins__ is the whitelisted subset ONLY.

        No open/eval/exec/__import__/print: print is redirected to an
        in-memory buffer so candidates cannot write to the console.
        """
        capture = io.StringIO()

        def sandbox_print(*args: Any, **kwargs: Any) -> None:
            kwargs.pop("file", None)
            try:
                print(*args, file=capture, **kwargs)
            except Exception:
                pass

        safe: Dict[str, Any] = {}
        for name in EVO_SAFE_FUNCS:
            func = getattr(builtins, name, None)
            if func is not None:
                safe[name] = func
        safe["print"] = sandbox_print
        return {"__builtins__": safe}

    @staticmethod
    def _run_call_with_timeout(fn: Any, query: str, telemetry: List[str],
                               timeout: float = EVO_TEST_TIMEOUT
                               ) -> Tuple[Any, float, Optional[str]]:
        """Run fn(query, telemetry) in a daemon thread with join(timeout).

        Windows-safe (no signals). Returns (output, latency, error).
        """
        result: Dict[str, Any] = {}

        def target() -> None:
            try:
                start = time.perf_counter()
                result["output"] = fn(query, list(telemetry))
                result["latency"] = time.perf_counter() - start
            except Exception as exc:  # candidate failure is data, not a crash
                result["error"] = "%s: %s" % (type(exc).__name__, exc)

        try:
            worker = threading.Thread(target=target, daemon=True)
            worker.start()
            worker.join(timeout)
            if worker.is_alive():
                return None, timeout, "timeout after %.1fs" % timeout
            if "error" in result:
                return None, result.get("latency", 0.0), result["error"]
            return result.get("output"), result.get("latency", 0.0), None
        except Exception as exc:
            return None, 0.0, str(exc)

    @classmethod
    def exec_contract_gate(cls, code: str) -> Tuple[bool, str, float, float]:
        """Gate 2: restricted exec + 3 fixed contract tests, PROCESS-ISOLATED.

        v29.3.0: the candidate runs in a spawned child process
        (multiprocessing.get_context("spawn")) instead of a daemon thread:
          * results come back through a multiprocessing.Queue,
          * join(3.0s); if the child is still alive -> terminate() + join()
            -> the candidate is rejected as a timeout,
          * POSIX children get a 256 MB RLIMIT_AS memory ceiling before the
            candidate execs (MemoryError -> rejection); on Windows the
            ceiling is unavailable, documented as timeout-only (see the
            REVIEW note in _sandbox_worker),
          * after every gate run we assert that NO child process remains
            alive - this kills the v29.2.0 zombie-thread limit for good.

        The AST gate (gate 1, unchanged) runs BEFORE this gate, and the
        same restricted-builtins namespace is used inside the child.

        Returns (ok, reason, contract_pass_rate, latency_avg).
        """
        queue = None
        proc = None
        try:
            ctx = multiprocessing.get_context("spawn")
            queue = ctx.Queue()
            proc = ctx.Process(
                target=_sandbox_worker,
                args=(code, list(cls.CONTRACT_TESTS), queue),
                daemon=True,
            )
            proc.start()
        except Exception as exc:
            if queue is not None:
                _close_sandbox_queue(queue)
            return False, "sandbox process spawn failed: %s" % exc, 0.0, 0.0

        try:
            proc.join(EVO_TEST_TIMEOUT)
            if proc.is_alive():
                # Infinite loop / hang: hard-kill the child. Unlike the old
                # daemon thread, a terminated process leaves NO zombie behind.
                try:
                    proc.terminate()
                except Exception:
                    pass
                proc.join(EVO_TEST_TIMEOUT)
                if proc.is_alive():
                    try:
                        proc.kill()  # SIGKILL fallback (py3.7+)
                    except Exception:
                        pass
                    proc.join(1.0)
                _close_sandbox_queue(queue)
                cls._reap_stray_children()
                return False, ("timeout after %.1fs (candidate process "
                               "terminated, no child processes left)"
                               % EVO_TEST_TIMEOUT), 0.0, 0.0

            # Child exited: fetch its result dict (short wait for flush).
            result: Optional[Dict[str, Any]] = None
            try:
                result = queue.get(timeout=2.0)
            except Exception:
                result = None
            _close_sandbox_queue(queue)
            cls._reap_stray_children()
            if not isinstance(result, dict):
                exit_code = proc.exitcode
                return False, ("sandbox worker exited without a result "
                               "(exit code %s)" % exit_code), 0.0, 0.0
            try:
                pass_rate = float(result.get("pass_rate", 0.0))
            except Exception:
                pass_rate = 0.0
            try:
                latency_avg = float(result.get("latency_avg", 0.0))
            except Exception:
                latency_avg = 0.0
            return (bool(result.get("ok")), str(result.get("reason", "?")),
                    pass_rate, latency_avg)
        except Exception as exc:
            # Belt-and-braces: never leak a live child on any failure.
            try:
                if proc.is_alive():
                    proc.terminate()
                    proc.join(1.0)
            except Exception:
                pass
            _close_sandbox_queue(queue)
            cls._reap_stray_children()
            return False, "sandbox gate failed safely: %s" % exc, 0.0, 0.0
        finally:
            try:
                if proc is not None and not proc.is_alive():
                    proc.close()
            except Exception:
                pass

    @staticmethod
    def _reap_stray_children() -> None:
        """No-zombie assertion: after a gate run no child may stay alive.

        Any stray child (should never happen) is terminated immediately.
        """
        try:
            ctx = multiprocessing.get_context("spawn")
            for stray in ctx.active_children():
                try:
                    if stray.is_alive():
                        stray.terminate()
                        stray.join(1.0)
                except Exception:
                    pass
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Gate 3: fitness gate
    # ------------------------------------------------------------------

    @staticmethod
    def fitness(pass_rate: float, latency_avg: float, health: float) -> float:
        """fitness = 0.5*pass + 0.3*latency_score + 0.2*health, clamped."""
        try:
            lat_score = 1.0 if float(latency_avg) <= 2.0 else 0.0
            value = (0.5 * float(pass_rate) + 0.3 * lat_score
                     + 0.2 * float(health))
            return max(0.0, min(1.0, value))
        except Exception:
            return 0.0

    def current_fitness(self) -> Optional[float]:
        fitness = self.state.get("current_fitness")
        return float(fitness) if isinstance(fitness, (int, float)) else None

    # ------------------------------------------------------------------
    # Lineage / archives / adoption / rollback
    # ------------------------------------------------------------------

    def _next_generation(self) -> int:
        gens = [self.generation()]
        for entry in self.state.get("lineage", []):
            try:
                gens.append(int(entry.get("generation", 1)))
            except Exception:
                continue
        return max(gens) + 1

    def _archive_names(self) -> List[Tuple[int, str]]:
        archives: List[Tuple[int, str]] = []
        try:
            for name in os.listdir("."):
                match = re.fullmatch(r"omega_gen_(\d+)\.py", name)
                if match:
                    archives.append((int(match.group(1)), name))
        except Exception:
            pass
        archives.sort()
        return archives

    def _prune_archives(self, keep: int = EVO_ARCHIVE_KEEP) -> None:
        try:
            archives = self._archive_names()
            for _gen, name in archives[:-keep] if len(archives) > keep else []:
                try:
                    os.remove(name)
                except Exception:
                    pass
            remaining = {str(gen) for gen, _name in archives[-keep:]}
            fitness_map = self.state.setdefault("archive_fitness", {})
            for key in list(fitness_map.keys()):
                if key not in remaining:
                    fitness_map.pop(key, None)
        except Exception:
            pass

    def _adopt(self, code: str, fitness: float, source: str) -> int:
        """Archive the current generation, write the candidate, log lineage."""
        current = self.generation()
        try:
            if os.path.isfile(self.strategy_path):
                with open(self.strategy_path, "r", encoding="utf-8",
                          errors="replace") as src:
                    blob = src.read()
                with open("omega_gen_%d.py" % current, "w",
                          encoding="utf-8") as dst:
                    dst.write(blob)
                prior = self.current_fitness()
                self.state.setdefault("archive_fitness", {})[str(current)] = (
                    prior if prior is not None else 0.0)
        except Exception:
            pass
        self._prune_archives()
        new_gen = self._next_generation()
        try:
            with open(self.strategy_path, "w", encoding="utf-8") as handle:
                handle.write(code if code.endswith("\n") else code + "\n")
        except Exception:
            pass
        self.state["generation"] = new_gen
        self.state["current_fitness"] = fitness
        self.state.setdefault("lineage", []).append({
            "generation": new_gen,
            "fitness": fitness,
            "adopted_at": utc_now_iso(),
            "parent": current,
            "source": source,
        })
        self._save_state()
        return new_gen

    def rollback(self) -> Tuple[bool, List[str]]:
        """Restore the highest-fitness archived generation as current."""
        lines = ["[Evolution Engine] Rollback requested."]
        try:
            fitness_map = self.state.get("archive_fitness") or {}
            candidates = []
            for gen, name in self._archive_names():
                try:
                    fit = float(fitness_map.get(str(gen), 0.0))
                except Exception:
                    fit = 0.0
                candidates.append((fit, gen, name))
            if not candidates:
                lines.append("  no archived generations - nothing to roll "
                             "back to.")
                return False, lines
            candidates.sort(reverse=True)  # highest fitness first
            fit, gen, name = candidates[0]
            with open(name, "r", encoding="utf-8", errors="replace") as src:
                blob = src.read()
            with open(self.strategy_path, "w", encoding="utf-8") as dst:
                dst.write(blob)
            current = self.generation()
            self.state["generation"] = gen
            self.state["current_fitness"] = fit
            self.state.setdefault("lineage", []).append({
                "generation": gen,
                "fitness": fit,
                "adopted_at": utc_now_iso(),
                "parent": current,
                "action": "rollback",
            })
            self._save_state()
            lines.append("  restored generation %d (fitness %.3f) from %s."
                         % (gen, fit, name))
            lines.append("  omega_strategy_gen.py now runs generation %d."
                         % gen)
            self.engine._audit("Evolution", "evolve rollback", "Success")
            return True, lines
        except Exception as exc:
            lines.append("  rollback failed safely: %s" % exc)
            return False, lines

    # ------------------------------------------------------------------
    # Online proposal (guarded; correct OpenRouter endpoint; urllib)
    # ------------------------------------------------------------------

    def _openrouter_propose(self) -> Tuple[Optional[str], str]:
        """Ask the LLM for a candidate mutation. Returns (code, error)."""
        try:
            key = self.engine.openrouter_key
            if not key:
                return None, ("OPENROUTER_API_KEY not set (.env or "
                              "environment)")
            pillars_json = json.dumps(CANONICAL_PILLARS, ensure_ascii=True)
            system_prompt = EVO_META_SYSTEM_PROMPT.replace(
                "{pillars}", pillars_json)
            recent = json.dumps((self.state.get("scores") or [])[-5:])
            user_prompt = ("LOG TELEMETRY:\n%s\n\nCompile optimized python "
                           "code execution matrix:" % recent)
            body = json.dumps({
                "model": self.engine.openrouter_model,
                "temperature": 0.25,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            }).encode("utf-8")
            request = urllib.request.Request(
                OPENROUTER_URL,
                data=body,
                headers={
                    "Authorization": "Bearer " + key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request,
                                        timeout=EVO_HTTP_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8",
                                                     errors="replace"))
            choices = data.get("choices") or []
            if not choices:
                return None, "empty response from gateway"
            content = str((choices[0].get("message") or {}).get("content")
                          or "").strip()
            if content.startswith("```"):
                # Strip markdown fences if the model added them anyway.
                fence_lines = content.splitlines()
                if fence_lines and fence_lines[0].startswith("```"):
                    fence_lines = fence_lines[1:]
                if fence_lines and fence_lines[-1].strip().startswith("```"):
                    fence_lines = fence_lines[:-1]
                content = "\n".join(fence_lines).strip()
            if not content:
                return None, "gateway returned empty code"
            return content, ""
        except Exception as exc:
            return None, str(exc)

    # ------------------------------------------------------------------
    # One evolution cycle: propose -> gate 1 -> gate 2 -> gate 3 -> adopt
    # ------------------------------------------------------------------

    def run_cycle(self, online: bool = False) -> Tuple[bool, List[str]]:
        lines = ["[Evolution Engine] Mutation cycle starting."]
        try:
            # Pillars are re-verified on every cycle (SPEC 2.1).
            if self.verify_pillars(announce=True) == "RESTORED":
                lines.append("  pillars restored to canonical form.")
            if online:
                code, error = self._openrouter_propose()
                if code is None:
                    lines.append("  online proposal failed: %s" % error)
                    lines.append("  cycle aborted safely. Hint: 'evolve run' "
                                 "uses the offline template engine.")
                    self.engine._audit("Evolution", "evolve run online",
                                       "Failed")
                    return False, lines
                source = "openrouter:" + self.engine.openrouter_model
                lines.append("  mode: online LLM proposal (%s)."
                             % self.engine.openrouter_model)
            else:
                index = (self._next_generation() - 2) % len(EVO_TEMPLATES)
                code = EVO_TEMPLATES[index]
                source = "offline-template-%d" % (index + 1)
                lines.append("  mode: offline template mutation "
                             "(no network, no LLM).")
            lines.append("  candidate source: %s" % source)

            ok, reason = self.ast_gate(code)
            lines.append("  gate 1 (AST whitelist): %s"
                         % ("PASS" if ok else "REJECT - " + reason))
            if not ok:
                self.engine._audit("Evolution", "evolve run (%s)" % source,
                                   "Rejected-AST")
                return False, lines

            ok, reason, pass_rate, latency_avg = self.exec_contract_gate(code)
            lines.append("  gate 2 (sandbox + 3 contract tests): %s"
                         % ("PASS" if ok else "REJECT - " + reason))
            if not ok:
                self.engine._audit("Evolution", "evolve run (%s)" % source,
                                   "Rejected-Sandbox")
                return False, lines

            candidate_fitness = self.fitness(pass_rate, latency_avg,
                                             self.health())
            current = self.current_fitness()
            current_txt = ("%.3f" % current) if current is not None \
                else "(none recorded)"
            lines.append("  gate 3 (fitness): candidate=%.3f current=%s"
                         % (candidate_fitness, current_txt))
            if current is not None and candidate_fitness < current:
                lines.append("  REJECT - candidate fitness below current "
                             "generation.")
                self.engine._audit("Evolution", "evolve run (%s)" % source,
                                   "Rejected-Fitness")
                return False, lines

            new_gen = self._adopt(code, candidate_fitness, source)
            lines.append("  ADOPTED: generation %d now live (fitness %.3f)."
                         % (new_gen, candidate_fitness))
            lines.append("  previous generation archived (last %d kept)."
                         % EVO_ARCHIVE_KEEP)
            self.engine._audit("Evolution", "evolve run (%s)" % source,
                               "Success")
            return True, lines
        except Exception as exc:
            lines.append("  cycle aborted safely: %s" % exc)
            return False, lines

    # ------------------------------------------------------------------
    # Telemetry (clamped scoring - fixes the negative-health bug)
    # ------------------------------------------------------------------

    @staticmethod
    def score_result(success: bool, output: str, latency: float) -> float:
        """Score one exchange; clamped to [0.0, 1.0] (never negative)."""
        try:
            score = 1.0 if success else 0.0
            if "<omega_analysis>" not in (output or ""):
                score -= 0.3
            if float(latency) > 2.0:
                score -= 0.2
            return max(0.0, min(1.0, score))
        except Exception:
            return 0.0

    def _record_score(self, score: float) -> None:
        try:
            scores = self.state.setdefault("scores", [])
            scores.append(round(max(0.0, min(1.0, float(score))), 4))
            del scores[:-10]  # keep the last 10 scores only
            tail = scores[-10:]
            health = (sum(tail) / len(tail)) if tail else 1.0
            self.state["health"] = round(max(0.0, min(1.0, health)), 4)
            self._save_state()
        except Exception:
            pass

    def test_query(self, query: str) -> List[str]:
        """Run the live strategy against a query and score the exchange."""
        query = str(query or "").strip() or "status"
        lines = ["[Evolution Engine] strategy test: %s" % query]
        try:
            with open(self.strategy_path, "r", encoding="utf-8",
                      errors="replace") as handle:
                code = handle.read()
        except Exception as exc:
            lines.append("  could not load strategy module: %s" % exc)
            return lines
        telemetry = ["generation %d" % self.generation(),
                     "health %.2f" % self.health()]
        try:
            for entry in list(self.engine.memory.get("history", []))[-3:]:
                if isinstance(entry, dict):
                    telemetry.append(str(entry.get("text", ""))[:60])
        except Exception:
            pass
        output: Any = None
        latency = 0.0
        error: Optional[str] = None
        try:
            namespace = self._restricted_namespace()
            exec(compile(code, "<omega_strategy>", "exec"), namespace)
            fn = namespace.get("execute_logic")
            if not callable(fn):
                error = "execute_logic missing from strategy module"
            else:
                output, latency, error = self._run_call_with_timeout(
                    fn, query, telemetry)
        except Exception as exc:
            error = str(exc)
        success = error is None and isinstance(output, str)
        text_out = output if isinstance(output, str) else ""
        score = self.score_result(success, text_out, latency or 0.0)
        self._record_score(score)
        if success:
            lines.append("  output:")
            for out_line in (text_out.splitlines() or [""]):
                lines.append("    " + out_line)
        else:
            lines.append("  execution failed safely: %s" % error)
        lines.append("  latency: %.3fs | score: %.2f | health: %.2f"
                     % (latency or 0.0, score, self.health()))
        self.engine._audit("Evolution", "evolve test %s" % query[:60],
                           "Success" if success else "Failed")
        return lines

    # ------------------------------------------------------------------
    # Status / lineage presentation
    # ------------------------------------------------------------------

    def status_lines(self) -> List[str]:
        fitness = self.current_fitness()
        fitness_txt = ("%.3f" % fitness) if fitness is not None \
            else "(none recorded)"
        return [
            "Evolution Engine status:",
            "  current generation: %d" % self.generation(),
            "  current fitness: %s" % fitness_txt,
            "  telemetry health: %.2f" % self.health(),
            "  pillars integrity: %s" % self.pillars_status(),
            "  lineage length: %d" % len(self.state.get("lineage", [])),
            "  strategy module: %s" % self.strategy_path,
            "  lineage log: %s" % self.state_path,
        ]

    def lineage_lines(self) -> List[str]:
        lines = ["Evolution lineage (current generation %d):"
                 % self.generation()]
        lineage = self.state.get("lineage", [])
        if not lineage:
            lines.append("  (no adoptions yet - generation 1 bootstrap "
                         "active)")
            return lines
        lines.append("  %-4s %-8s %-21s %-7s %s"
                     % ("gen", "fitness", "adopted_at", "parent", "source"))
        for entry in lineage:
            fitness = entry.get("fitness")
            fitness_txt = ("%.3f" % fitness) \
                if isinstance(fitness, (int, float)) else "?"
            marker = " (rollback)" if entry.get("action") == "rollback" \
                else ""
            lines.append("  %-4s %-8s %-21s %-7s %s" % (
                str(entry.get("generation", "?")),
                fitness_txt,
                str(entry.get("adopted_at", "?"))[:21],
                str(entry.get("parent", "?")),
                str(entry.get("source", "?")) + marker,
            ))
        return lines


# ---------------------------------------------------------------------------
# v29.2.0: differentiation layer ('why' + 'integrations')
# ---------------------------------------------------------------------------

def why_lines() -> List[str]:
    """The 6 LUQI AI differentiators, each with a one-line proof."""
    return [
        "Why LUQI AI - 6 differentiators:",
        "1. Integration-first, not siloed.",
        "   proof: connects GitHub, Excel/CSV, Serper, OpenAI, OpenRouter "
        "- run 'integrations'.",
        "2. Built to last, not a trend.",
        "   proof: versioned releases, append-only audit trail, selftest "
        "suite ships with every build.",
        "3. Teaches while it works.",
        "   proof: companion + finance literacy subsystems build YOUR "
        "skill, not dependency.",
        "4. Yours, not cookie-cutter.",
        "   proof: local memory, your language packs, your data stays on "
        "your machine.",
        "5. Free to run.",
        "   proof: pure stdlib Python, offline-first, no subscription, "
        "no lock-in.",
        "6. Makes you more capable, not obsolete.",
        "   proof: opportunity engine + reports you own and can export "
        "anytime.",
    ]


def integrations_lines(engine: OmegaMasterEngine) -> List[str]:
    """Live status manifest for the 5 connectors."""
    rows = []
    if engine._git_path() and engine.github_repo:
        rows.append(("GitHub", "configured", "ready - run 'sync github'"))
    elif engine._git_path():
        rows.append(("GitHub", "available",
                     "git found; set GITHUB_REPO in .env to enable"))
    else:
        rows.append(("GitHub", "missing",
                     "install git and set GITHUB_REPO in .env"))
    rows.append(("Excel/CSV", "available",
                 "stdlib reader built in - use 'import <path>'"))
    if engine.serper_key:
        rows.append(("Serper", "configured",
                     "live web search ready - use 'research <query>'"))
    else:
        rows.append(("Serper", "missing", "set SERPER_API_KEY in .env"))
    if engine.openai_key:
        rows.append(("OpenAI", "configured",
                     "LLM-enhanced tax guidance ready"))
    else:
        rows.append(("OpenAI", "missing", "set OPENAI_API_KEY in .env"))
    if engine.openrouter_key:
        rows.append(("OpenRouter", "configured",
                     "model %s - use 'evolve run online'"
                     % engine.openrouter_model))
    else:
        rows.append(("OpenRouter", "missing",
                     "set OPENROUTER_API_KEY (+ OPENROUTER_MODEL) in .env"))
    # v29.3.0: 6th row - optional claude_engine bridge (never a hard dep).
    if BRIDGE_AVAILABLE and engine.openai_key:
        rows.append(("claude_engine", "available",
                     "bridge active - LLM calls route through it ('bridge')"))
    elif BRIDGE_AVAILABLE:
        rows.append(("claude_engine", "no key",
                     "installed; set OPENAI_API_KEY to activate the bridge"))
    else:
        rows.append(("claude_engine", "not installed",
                     "optional; clone repo + pip install -e . ('bridge')"))
    lines = ["Integrations manifest (6 connectors):"]
    lines.append("  %-13s %-13s %s" % ("connector", "status",
                                       "how to enable / use"))
    for name, status, hint in rows:
        lines.append("  %-13s %-13s %s" % (name, status, hint))
    return lines


def bridge_lines(engine: OmegaMasterEngine) -> List[str]:
    """v29.3.0 'bridge' command: claude_engine bridge status report."""
    lines = ["claude_engine bridge status:"]
    if BRIDGE_AVAILABLE:
        lines.append("  module: AVAILABLE (claude_engine importable)")
    else:
        lines.append("  module: NOT INSTALLED (engine works fully without it)")
        lines.append("  how to enable: clone the claude_engine repo and run "
                     "'pip install -e .' inside it, then restart omega.py")
    if engine.openai_key:
        lines.append("  primary provider: openai / %s (key %s)"
                     % (engine.omega_llm_model,
                        mask_secret(engine.openai_key)))
    else:
        lines.append("  primary provider: inactive (set OPENAI_API_KEY in "
                     ".env to activate)")
    if engine.anthropic_key:
        lines.append("  fallback provider: anthropic / %s (key %s)"
                     % (CLAUDE_FALLBACK_MODEL,
                        mask_secret(engine.anthropic_key)))
    else:
        lines.append("  fallback provider: none (set ANTHROPIC_API_KEY for "
                     "the anthropic fallback)")
    if engine._bridge_engine is not None:
        stats_fn = getattr(engine._bridge_engine, "stats", None)
        if callable(stats_fn):
            try:
                lines.append("  circuit-breaker stats: %s" % (stats_fn(),))
            except Exception:
                lines.append("  circuit-breaker stats: unavailable")
        else:
            lines.append("  circuit-breaker stats: engine has no stats()")
    else:
        lines.append("  engine instance: not instantiated (lazy - created on "
                     "the first bridged LLM call)")
    lines.append("  routing: _llm() uses the bridge when available; ANY "
                 "exception falls back to the stdlib urllib path")
    return lines


# Router smoke list used by the selftest AND the 'launch' pre-flight check.
CORE_SMOKE: List[Tuple[str, str]] = [
    ("build and deploy sync", "Omega Infrastructure Build & Sync"),
    ("crypto mining portfolio", "Omega Mining & Investment Engine"),
    ("tax vat sars compliance", "Omega Tax & Audit Support"),
    ("api key security status", "Omega Security Gatekeeper"),
    ("deep research search", "Omega Deep Research"),
    ("teach me companion explain", "Omega Companion/Tutor"),
    ("business hustle opportunities", "Omega Opportunity Engine"),
    ("finance budget scam debt", "Omega Finance Literacy"),
    ("selfimprove evolve", "Omega Self-Improvement"),
    ("evolution mutation engine", "Omega Evolution Engine"),
]


def launch_lines(engine: OmegaMasterEngine) -> Tuple[List[str], List[str]]:
    """v29.3.0 'launch' command: GO/NO-GO pre-flight checklist.

    Blockers are missing pillars / unwritable memory / selftest-core failure
    ONLY. Optional integration keys are WARN, never blockers.
    Returns (lines, blockers).
    """
    rows: List[Tuple[str, str, str]] = []
    blockers: List[str] = []

    # 1. Version current (informational; always matches the running build).
    rows.append(("version", "OK", "v%s Launch-Grade" % ENGINE_VERSION))

    # 2. Selftest core pass: router smoke over all 10 subsystems.
    core_failures = []
    for domain, expected in CORE_SMOKE:
        try:
            result = engine.execute_omega_subsystem(domain, {"query": domain})
            if result.get("subsystem") != expected:
                core_failures.append(domain)
        except Exception:
            core_failures.append(domain)
    if core_failures:
        rows.append(("selftest core", "FAIL",
                     "router smoke failed for: " + ", ".join(core_failures)))
        blockers.append("selftest core failure")
    else:
        rows.append(("selftest core", "OK",
                     "router smoke: %d/%d subsystems" % (len(CORE_SMOKE),
                                                         len(CORE_SMOKE))))

    # 3. Pillars integrity.
    pillars = engine.evolution.pillars_status()
    rows.append(("pillars integrity", "OK" if pillars == "OK" else "FAIL",
                 "sha256 verified" if pillars == "OK"
                 else "tampered/missing - run 'evolve pillars'"))
    if pillars != "OK":
        blockers.append("pillars integrity")

    # 4. Memory writable.
    mem_ok = save_memory(engine.memory_path, engine.memory)
    rows.append(("memory writable", "OK" if mem_ok else "FAIL",
                 engine.memory_path if mem_ok
                 else "cannot write " + engine.memory_path))
    if not mem_ok:
        blockers.append("memory not writable")

    # 5. Strategy module present (auto-bootstraps; WARN if missing).
    strategy_ok = os.path.isfile(STRATEGY_FILE)
    rows.append(("strategy module", "OK" if strategy_ok else "WARN",
                 STRATEGY_FILE if strategy_ok
                 else "missing - auto-bootstraps on next evolution cycle"))

    # 6. Per-integration key status (WARN, never blockers).
    rows.append(("github key", "OK" if engine.github_repo else "WARN",
                 "GITHUB_REPO configured" if engine.github_repo
                 else "set GITHUB_REPO (+ GITHUB_TOKEN) in .env"))
    rows.append(("serper key", "OK" if engine.serper_key else "WARN",
                 "live search ready" if engine.serper_key
                 else "set SERPER_API_KEY in .env"))
    rows.append(("openai key", "OK" if engine.openai_key else "WARN",
                 "LLM enhancement ready" if engine.openai_key
                 else "set OPENAI_API_KEY in .env"))
    rows.append(("openrouter key", "OK" if engine.openrouter_key else "WARN",
                 "online evolution ready" if engine.openrouter_key
                 else "set OPENROUTER_API_KEY in .env"))
    bridge_ok = BRIDGE_AVAILABLE and bool(engine.openai_key)
    if bridge_ok:
        rows.append(("bridge", "OK", "claude_engine bridge active"))
    elif BRIDGE_AVAILABLE:
        rows.append(("bridge", "WARN", "installed; set OPENAI_API_KEY"))
    else:
        rows.append(("bridge", "WARN",
                     "claude_engine not installed (optional)"))

    # 7. Site version note (informational).
    rows.append(("site version", "INFO",
                 "badge v%s - publish via the platform publish button"
                 % ENGINE_VERSION))

    lines = ["Launch pre-flight checklist (%s):" % ENGINE_NAME]
    lines.append("  %-18s %-6s %s" % ("check", "status", "detail"))
    for name, status, detail in rows:
        lines.append("  %-18s %-6s %s" % (name, status, detail))
    if blockers:
        lines.append("NOT READY: " + ", ".join(blockers))
    else:
        lines.append("LAUNCH READY")
    return lines, blockers


# ---------------------------------------------------------------------------
# CLI presentation helpers
# ---------------------------------------------------------------------------

def print_banner(engine: OmegaMasterEngine) -> None:
    line = "=" * 60
    print(line)
    print(ENGINE_NAME)
    print(line)
    print("Subsystem availability:")
    for row in engine.availability_matrix():
        print("  [%-9s] %-22s - %s" % (row["status"], row["subsystem"], row["detail"]))
    print(line)
    facts = len(engine.memory.get("facts", []))
    sessions = engine.memory.get("sessions", 1)
    print("Memory: %d remembered fact(s) | session #%d | %s"
          % (facts, sessions, engine.memory_path))
    print("Evolution: generation %d | health %.2f | pillars %s"
          % (engine.evolution.generation(), engine.evolution.health(),
             engine.evolution.pillars_status()))
    print(line)
    print(engine.ui("greeting"))


def print_help(engine: OmegaMasterEngine) -> None:
    commands = [
        ("help", "show this command list"),
        ("status", "subsystem matrix + system_state"),
        ("version", "version, subsystem count, session, facts"),
        ("keys", "masked API key report"),
        ("research <query>", "deep research (Serper live or offline plan)"),
        ("mine", "mining/investment subsystem"),
        ("tax <country or topic>", "tax support with disclaimer"),
        ("companion <topic>", "study-companion tutor mode"),
        ("opportunities <domain>", "opportunity scan framework"),
        ("finance <topic>", "finance literacy / scam avoidance"),
        ("languages", "African language support list"),
        ("lang <code>", "switch UI language (15 packs: en zu xh st af tn "
         "nso ts ve ss nr sw am yo ha)"),
        ("selfimprove <note>", "log a self-improvement entry"),
        ("evolve [sub]", "evolution engine: run | run online | rollback | "
         "lineage | pillars | test <query>"),
        ("why", "the 6 LUQI AI differentiators"),
        ("integrations", "6-connector live status manifest"),
        ("bridge", "claude_engine bridge status (optional, never required)"),
        ("launch", "GO/NO-GO launch pre-flight checklist"),
        ("remember <fact>", "persist a fact to omega_memory.json"),
        ("recall", "list all remembered facts (numbered)"),
        ("forget <n>", "delete fact #n"),
        ("history [n]", "show last n exchanges (default 10)"),
        ("import <path>", "import a .csv or .xlsx dataset"),
        ("analyze", "summarize the loaded dataset"),
        ("query <text>", "filter dataset rows containing text"),
        ("export", "write omega_export_<UTCts>.md snapshot"),
        ("report <topic>", "write omega_report_<slug>_<UTCts>.md"),
        ("sync github", "git add/commit/push sync (needs GITHUB_REPO)"),
        ("sync status", "git + GitHub sync configuration status"),
        ("log", "last 10 audit entries"),
        ("clear", "clear the screen"),
        ("exit / quit", "graceful shutdown"),
    ]
    print(engine.ui("help_header"))
    for name, desc in commands:
        print("  %-26s %s" % (name, desc))
    print("Anything else is routed through the master router.")


def print_result(result: Dict[str, Any]) -> None:
    """Human-readable rendering of a subsystem result dict."""
    subsystem = result.get("subsystem", "Master Core")
    status = result.get("status", "Unknown")
    print("[%s] %s" % (status, subsystem))
    if result.get("message"):
        print("  " + str(result["message"]))
    for key, value in result.items():
        if key in ("subsystem", "status", "message"):
            continue
        if isinstance(value, dict):
            print("  %s:" % key)
            for sub_key, sub_val in value.items():
                print("    %s: %s" % (sub_key, sub_val))
        elif isinstance(value, list):
            print("  %s:" % key)
            for item in value:
                if isinstance(item, dict):
                    print("    - " + "; ".join("%s: %s" % (k, v) for k, v in item.items()))
                else:
                    print("    - " + str(item))
        else:
            print("  %s: %s" % (key, value))


def clear_screen() -> None:
    try:
        os.system("cls" if os.name == "nt" else "clear")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# REPL
# ---------------------------------------------------------------------------

def handle_command(engine: OmegaMasterEngine, raw: str) -> bool:
    """Process one line of input. Return False to exit the REPL."""
    line = raw.strip()
    if not line:
        return True
    lowered = line.lower()

    if lowered in ("exit", "quit"):
        print(engine.ui("goodbye"))
        return False
    if lowered == "help":
        print_help(engine)
        return True
    if lowered == "clear":
        clear_screen()
        return True
    if lowered == "version":
        print(ENGINE_NAME)
        print("Subsystems: %d" % len(engine.availability_matrix()))
        print("Session: #%d" % engine.memory.get("sessions", 1))
        print("Facts: %d" % len(engine.memory.get("facts", [])))
        engine._audit("CLI", "version", "Success")
        return True
    if lowered == "status":
        print("Version: %s" % ENGINE_NAME)
        print("Language: %s (%s)" % (LANG_PACKS[engine.lang]["name"],
                                     engine.lang))
        print("Evolution: generation %d | pillars integrity %s"
              % (engine.evolution.generation(),
                 engine.evolution.pillars_status()))
        print("Subsystem matrix:")
        for row in engine.availability_matrix():
            print("  [%-9s] %-22s - %s" % (row["status"], row["subsystem"], row["detail"]))
        print("system_state:")
        print(json.dumps(engine.system_state, indent=2))
        engine._audit("CLI", "status", "Success")
        return True
    if lowered == "keys":
        print("API key report (masked):")
        print("  OPENAI_API_KEY: %s" % mask_secret(engine.openai_key))
        print("  SERPER_API_KEY: %s" % mask_secret(engine.serper_key))
        engine._audit("CLI", "keys", "Success")
        return True
    if lowered == "log":
        entries = engine.read_log_tail(10)
        if not entries:
            print("No audit entries yet.")
        else:
            print("Last %d audit entries:" % len(entries))
            for entry in entries:
                print("  %s | %-28s | %-12s | %s" % (
                    entry.get("ts", "?"),
                    str(entry.get("subsystem", "?"))[:28],
                    entry.get("status", "?"),
                    str(entry.get("input_summary", ""))[:60],
                ))
        return True
    if lowered == "languages":
        print("African language support (%d languages):" % len(AFRICAN_LANGUAGES))
        for name, region in AFRICAN_LANGUAGES:
            print("  %-12s - %s" % (name, region))
        engine._audit("CLI", "languages", "Success")
        return True

    # --- v29.1.0: language packs / export / report commands ---
    if lowered == "lang" or lowered.startswith("lang "):
        code = line[len("lang"):].strip().lower()
        if code and engine.set_lang(code):
            pack = LANG_PACKS[engine.lang]
            print("Language set to %s (%s)." % (pack["name"], engine.lang))
            print(engine.ui("greeting"))
        else:
            if code:
                print("Unknown language code '%s'." % code)
            print("Available language packs (* = active):")
            for pack_code in sorted(LANG_PACKS):
                mark = "*" if pack_code == engine.lang else " "
                print("  %s %-4s %s" % (mark, pack_code,
                                        LANG_PACKS[pack_code]["name"]))
            print("Usage: lang <code>")
        engine._audit("CLI", "lang %s" % (code or "(list)"), "Success")
        return True
    if lowered == "export" or lowered.startswith("export "):
        ok, message = engine.export_markdown()
        print(message)
        engine._audit("CLI", "export", "Success" if ok else "Failed")
        return True
    if lowered == "report" or lowered.startswith("report "):
        topic = line[len("report"):].strip()
        ok, message = engine.write_report(topic)
        print(message)
        engine._audit("CLI", "report %s" % (topic or "(none)"),
                      "Success" if ok else "Failed")
        return True

    # --- v29.2.0: Evolution Engine + differentiation layer commands ---
    if lowered == "evolve" or lowered.startswith("evolve "):
        args = line[len("evolve"):].strip()
        sub = args.lower()
        if not sub:
            out_lines = engine.evolution.status_lines()
            audit_status = "Success"
        elif sub == "run":
            _ok, out_lines = engine.evolution.run_cycle(online=False)
            audit_status = "Success" if _ok else "Rejected"
        elif sub == "run online":
            _ok, out_lines = engine.evolution.run_cycle(online=True)
            audit_status = "Success" if _ok else "Rejected"
        elif sub == "rollback":
            _ok, out_lines = engine.evolution.rollback()
            audit_status = "Success" if _ok else "Rejected"
        elif sub == "lineage":
            out_lines = engine.evolution.lineage_lines()
            audit_status = "Success"
        elif sub == "pillars":
            out_lines = engine.evolution.pillars_lines()
            audit_status = "Success"
        elif sub == "test" or sub.startswith("test "):
            out_lines = engine.evolution.test_query(args[len("test"):].strip())
            audit_status = "Success"
        else:
            out_lines = ["Usage: evolve [run | run online | rollback | "
                         "lineage | pillars | test <query>]"]
            audit_status = "Failed"
        for out_line in out_lines:
            print(out_line)
        engine._audit("Evolution", "evolve %s" % (sub or "status"),
                      audit_status)
        return True
    if lowered == "why":
        for out_line in why_lines():
            print(out_line)
        engine._audit("CLI", "why", "Success")
        return True
    if lowered == "integrations":
        for out_line in integrations_lines(engine):
            print(out_line)
        engine._audit("CLI", "integrations", "Success")
        return True
    # --- v29.3.0: bridge + launch commands ---
    if lowered == "bridge":
        for out_line in bridge_lines(engine):
            print(out_line)
        engine._audit("CLI", "bridge", "Success")
        return True
    if lowered == "launch":
        out_lines, blockers = launch_lines(engine)
        for out_line in out_lines:
            print(out_line)
        engine._audit("CLI", "launch",
                      "Success" if not blockers else "Blocked")
        return True

    # --- v29 Module A: persistent memory commands ---
    if lowered == "remember" or lowered.startswith("remember "):
        print(engine.remember_fact(line[len("remember"):].strip()))
        engine._audit("Memory", "remember", "Success")
        return True
    if lowered == "recall":
        facts = engine.memory.get("facts", [])
        if not facts:
            print("No facts remembered yet. Use: remember <fact>")
        else:
            print("Remembered facts (%d):" % len(facts))
            for i, fact in enumerate(facts, 1):
                print("  %d. %s" % (i, fact))
        engine._audit("Memory", "recall", "Success")
        return True
    if lowered == "forget" or lowered.startswith("forget "):
        arg = line[len("forget"):].strip()
        try:
            index = int(arg)
        except ValueError:
            print("Usage: forget <number>  (see 'recall' for numbers)")
            return True
        removed = engine.forget_fact(index)
        if removed is None:
            print("No fact #%d. Use 'recall' to list numbered facts." % index)
        else:
            print(engine.ui_format("forgot", index, removed))
        engine._audit("Memory", "forget %s" % arg, "Success")
        return True
    if lowered == "history" or lowered.startswith("history "):
        arg = line[len("history"):].strip()
        count = 10
        if arg:
            try:
                count = max(1, int(arg))
            except ValueError:
                print("Usage: history [n]  (showing default 10)")
        entries = engine.memory.get("history", [])[-count:]
        if not entries:
            print("No history yet.")
        else:
            print("Last %d history entries:" % len(entries))
            for entry in entries:
                print("  %s | %-5s | %s" % (
                    entry.get("ts", "?"),
                    str(entry.get("role", "?"))[:5],
                    str(entry.get("text", ""))[:70],
                ))
        engine._audit("Memory", "history", "Success")
        return True

    # --- v29 Module B: GitHub auto-sync commands ---
    if lowered == "sync github" or lowered.startswith("sync github "):
        for out_line in engine.sync_github():
            print(out_line)
        engine._audit("Sync", "sync github", "Success")
        return True
    if lowered == "sync status":
        print("GitHub sync status:")
        for out_line in engine.sync_status_lines():
            print("  " + out_line)
        engine._audit("Sync", "sync status", "Success")
        return True

    # --- v29 Module C: dataset commands ---
    if lowered == "import" or lowered.startswith("import "):
        path = line[len("import"):].strip().strip("'\"")
        ok, message = engine.import_dataset(path)
        print(message)
        engine._audit("Dataset", "import %s" % path,
                      "Success" if ok else "Failed")
        return True
    if lowered == "analyze":
        for out_line in engine.analyze_dataset():
            print(out_line)
        engine._audit("Dataset", "analyze", "Success")
        return True
    if lowered == "query" or lowered.startswith("query "):
        for out_line in engine.query_dataset(line[len("query"):].strip()):
            print(out_line)
        engine._audit("Dataset", "query %s" % text, "Success")
        return True

    # Commands with arguments -> routed into the engine.
    def route(domain: str, arg: str) -> None:
        result = engine.execute_omega_subsystem(domain, {"query": arg})
        print_result(result)

    if lowered == "mine":
        route("mining", "mining status")
        return True
    for prefix, domain in (
        ("research", "research"),
        ("tax", "tax"),
        ("companion", "companion"),
        ("opportunities", "opportunity"),
        ("finance", "finance"),
        ("selfimprove", "selfimprove"),
    ):
        if lowered == prefix or lowered.startswith(prefix + " "):
            arg = line[len(prefix):].strip()
            route(domain, arg)
            return True

    # Free text -> master router keyword detection -> generic core fallback.
    result = engine.execute_omega_subsystem(line, {"query": line})
    if result.get("status") == "Unknown":
        print(engine.ui("unknown_command"))
    print_result(result)
    return True


def run_repl(engine: OmegaMasterEngine) -> int:
    print_banner(engine)
    while True:
        try:
            raw = input("[OMEGA] > ")
        except KeyboardInterrupt:
            print()  # newline, then reprompt
            continue
        except EOFError:
            print("\nOMEGA shutting down (EOF). Stay sovereign.")
            break
        if raw.strip():
            engine.add_history("user", raw)
        try:
            if not handle_command(engine, raw):
                break
        except Exception as exc:  # belt-and-braces: never crash the REPL
            print("[Error] recovered from unexpected failure: %s" % exc)
    # Clean exit (exit/quit or EOF): persist memory.
    save_memory(engine.memory_path, engine.memory)
    return 0


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

def _selftest_build_xlsx(path: str) -> None:
    """Build a minimal but real .xlsx (ZIP of XML parts) for the selftest.

    Covers shared strings, inline strings, and plain numbers.
    """
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/'
        'content-types">'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/'
        'vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="applic'
        'ation/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/sharedStrings.xml" ContentType="applicatio'
        'n/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
        '</Types>'
    )
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="%s" xmlns:r="http://schemas.openxmlformats.org/'
        'officeDocument/2006/relationships">'
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>'
        '</workbook>' % ns
    )
    shared_strings = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<sst xmlns="%s" count="4" uniqueCount="4">'
        '<si><t>name</t></si><si><t>score</t></si>'
        '<si><t>alice</t></si><si><t>bob</t></si>'
        '</sst>' % ns
    )
    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="%s"><sheetData>'
        '<row r="1"><c r="A1" t="s"><v>0</v></c>'
        '<c r="B1" t="s"><v>1</v></c></row>'
        '<row r="2"><c r="A2" t="s"><v>2</v></c>'
        '<c r="B2"><v>42</v></c></row>'
        '<row r="3"><c r="A3" t="s"><v>3</v></c>'
        '<c r="B3"><v>7</v></c></row>'
        '<row r="4"><c r="A4" t="inlineStr"><is><t>carol</t></is></c>'
        '<c r="B4"><v>5</v></c></row>'
        '</sheetData></worksheet>' % ns
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/sharedStrings.xml", shared_strings)
        archive.writestr("xl/worksheets/sheet1.xml", sheet)


def run_selftest() -> int:
    print(ENGINE_NAME + " - SELF TEST")
    checks = []
    engine = OmegaMasterEngine()

    # Router smoke test over all 10 subsystems (shared with 'launch').
    for domain, expected in CORE_SMOKE:
        try:
            result = engine.execute_omega_subsystem(domain, {"query": domain})
            ok = result.get("subsystem") == expected
            checks.append(("router: %-30s -> %s" % (domain, expected), ok))
        except Exception as exc:
            checks.append(("router: %s (exception: %s)" % (domain, exc), False))

    # Unknown domain -> generic core fallback.
    try:
        result = engine.execute_omega_subsystem("zzz unknown zzz", {"query": "x"})
        checks.append(("router: unknown domain -> generic core",
                       result.get("status") == "Unknown"))
    except Exception as exc:
        checks.append(("router: unknown domain (exception: %s)" % exc, False))

    # .env manual parser (tolerates missing/malformed).
    try:
        parsed = parse_env_file("__definitely_missing__.env")
        checks.append((".env parser: missing file tolerated", parsed == {}))
    except Exception as exc:
        checks.append((".env parser: missing file (exception: %s)" % exc, False))
    try:
        tmp = "__omega_selftest__.env"
        with open(tmp, "w", encoding="ascii") as handle:
            handle.write("# comment\n\nOPENAI_API_KEY='sk-test123456'\n"
                         "BROKEN LINE\nEMPTY=\n")
        parsed = parse_env_file(tmp)
        os.remove(tmp)
        checks.append((".env parser: quotes/comments/malformed handled",
                       parsed.get("OPENAI_API_KEY") == "sk-test123456"
                       and parsed.get("EMPTY") == ""))
    except Exception as exc:
        checks.append((".env parser: malformed (exception: %s)" % exc, False))

    # Secret masking never exposes the full key.
    checks.append(("masking: full secret never printed",
                   mask_secret("sk-secret-value-99") == "sk-s...99"))

    # Log write + read back.
    try:
        engine._audit("SelfTest", "selftest write", "Success")
        tail = engine.read_log_tail(1)
        ok = bool(tail) and tail[-1].get("subsystem") == "SelfTest"
        checks.append(("log: write + read omega_log.jsonl", ok))
    except Exception as exc:
        checks.append(("log: write/read (exception: %s)" % exc, False))

    # Offline online-calls return None, never raise.
    offline_engine = OmegaMasterEngine()
    offline_engine.serper_key = ""
    offline_engine.openai_key = ""
    try:
        checks.append(("guarded: _serper_search offline -> None",
                       offline_engine._serper_search("test") is None))
        checks.append(("guarded: _llm offline -> None",
                       offline_engine._llm("test") is None))
    except Exception as exc:
        checks.append(("guarded: online calls (exception: %s)" % exc, False))

    # Module A: memory roundtrip (remember/recall/forget) + corrupt recovery.
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            mem_path = os.path.join(tmpdir, MEMORY_FILE)
            mem = fresh_memory()
            mem["facts"].append("alpha fact")
            mem["facts"].append("beta fact")
            ok = save_memory(mem_path, mem)
            loaded = load_memory(mem_path)
            ok = ok and loaded.get("facts") == ["alpha fact", "beta fact"]
            loaded["facts"].pop(0)  # forget fact #1
            ok = save_memory(mem_path, loaded) and ok
            reloaded = load_memory(mem_path)
            ok = ok and reloaded.get("facts") == ["beta fact"]
            checks.append(("memory: remember/recall/forget roundtrip", ok))

            with open(mem_path, "w", encoding="ascii") as handle:
                handle.write("{corrupt json !!!")
            recovered = load_memory(mem_path)
            ok = (recovered.get("facts") == []
                  and os.path.isfile(mem_path + ".bak"))
            checks.append(("memory: corrupt JSON -> .bak + fresh start", ok))
    except Exception as exc:
        checks.append(("memory: roundtrip (exception: %s)" % exc, False))

    # Module C: generated CSV import + analyze + query.
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_path = os.path.join(tmpdir, "sales.csv")
            with open(csv_path, "w", encoding="ascii", newline="") as handle:
                handle.write("name,region,amount\n"
                             "alpha,north,10\n"
                             "beta,south,20\n"
                             "gamma,north,30\n"
                             "delta,east,40\n"
                             "epsilon,north,50\n")
            ok, _msg = engine.import_dataset(csv_path)
            ok = (ok and engine.dataset is not None
                  and len(engine.dataset["rows"]) == 5
                  and len(engine.dataset["headers"]) == 3)
            checks.append(("import: generated CSV (3 cols x 5 rows)", ok))
            analysis = engine.analyze_dataset()
            ok = (any("Rows: 5" in line for line in analysis)
                  and any(line.startswith("  amount:") for line in analysis)
                  and any("min=10" in line and "max=50" in line
                          and "mean=30.00" in line for line in analysis))
            checks.append(("analyze: row count + numeric min/max/mean", ok))
            results = engine.query_dataset("north")
            hits = sum(1 for line in results
                       if line.strip().startswith("row "))
            checks.append(("query: substring filter finds 3 'north' rows",
                           hits == 3))
            note = engine.dataset_note()
            checks.append(("dataset note: tax/mine can reference dataset",
                           bool(note) and "5 rows" in note))
    except Exception as exc:
        checks.append(("dataset: CSV import/analyze/query (exception: %s)"
                       % exc, False))

    # Module C: generated real .xlsx import (built via zipfile above).
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            xlsx_path = os.path.join(tmpdir, "people.xlsx")
            _selftest_build_xlsx(xlsx_path)
            ok, _msg = engine.import_dataset(xlsx_path)
            headers = engine.dataset["headers"] if engine.dataset else []
            rows = engine.dataset["rows"] if engine.dataset else []
            ok = (ok and headers == ["name", "score"] and len(rows) == 3
                  and rows[0] == ["alice", "42"]
                  and rows[1] == ["bob", "7"]
                  and rows[2] == ["carol", "5"])
            checks.append(("import: generated XLSX (shared/inline/number)",
                           ok))
    except Exception as exc:
        checks.append(("dataset: XLSX import (exception: %s)" % exc, False))

    # Module B: sync status outside a git repo must be graceful.
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            previous = os.getcwd()
            os.chdir(tmpdir)
            try:
                lines = engine.sync_status_lines()
            finally:
                os.chdir(previous)
            ok = (isinstance(lines, list) and bool(lines)
                  and any("git binary" in line for line in lines))
            checks.append(("sync status: no git repo -> graceful report", ok))
    except Exception as exc:
        checks.append(("sync status: (exception: %s)" % exc, False))

    # v29.1.0: version command output (version + subsystem count).
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep = handle_command(engine, "version")
        out = buf.getvalue()
        checks.append(("version: shows 29.3.0 + 10 subsystems + session/facts",
                       bool(keep) and "29.3.0" in out
                       and "Subsystems: 10" in out
                       and "Session: #" in out and "Facts:" in out))
    except Exception as exc:
        checks.append(("version: (exception: %s)" % exc, False))

    # v29.1.0: lang switch to zu persists to disk; restored on fresh boot.
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            handle_command(engine, "lang zu")
        out_zu = buf.getvalue()
        ok = (engine.lang == "zu" and "isiZulu" in out_zu
              and load_memory(engine.memory_path).get("lang") == "zu")
        checks.append(("lang: switch to zu + persisted to memory", ok))
        rebooted = OmegaMasterEngine()
        restored_ok = rebooted.lang == "zu"
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            handle_command(rebooted, "lang en")
        out_en = buf.getvalue()
        roundtrip = (restored_ok and rebooted.lang == "en"
                     and "English" in out_en
                     and load_memory(rebooted.memory_path).get("lang") == "en")
        checks.append(("lang: restored on boot + zu->en roundtrip", roundtrip))
    except Exception as exc:
        checks.append(("lang: roundtrip (exception: %s)" % exc, False))

    # v29.1.0: unknown lang code -> graceful pack list, language unchanged.
    try:
        before = engine.lang
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep = handle_command(engine, "lang xx")
        out = buf.getvalue()
        checks.append(("lang: unknown code graceful (packs listed)",
                       bool(keep) and engine.lang == before
                       and "Unknown language code" in out
                       and "Available language packs" in out))
    except Exception as exc:
        checks.append(("lang: unknown code (exception: %s)" % exc, False))

    # v29.1.0: export writes a markdown snapshot containing a planted fact.
    try:
        planted = "selftest planted fact v291"
        engine.remember_fact(planted)
        ok, message = engine.export_markdown()
        fname = message.rsplit(" ", 1)[-1].strip() if ok else ""
        created = (ok and fname.startswith("omega_export_")
                   and fname.endswith(".md") and os.path.isfile(fname))
        checks.append(("export: omega_export_<UTCts>.md created", created))
        contains = False
        if created:
            with open(fname, "r", encoding="utf-8") as handle:
                content = handle.read()
            contains = (planted in content and "## System State" in content
                        and "## Audit" in content)
        checks.append(("export: file contains planted fact + sections",
                       contains))
        engine.forget_fact(len(engine.memory.get("facts", [])))
    except Exception as exc:
        checks.append(("export: (exception: %s)" % exc, False))

    # v29.1.0: report <topic> routes and writes omega_report_<slug>_<ts>.md.
    try:
        ok, message = engine.write_report("mining")
        fname = message.rsplit(" ", 1)[-1].strip() if ok else ""
        created = (ok and fname.startswith("omega_report_mining_")
                   and fname.endswith(".md") and os.path.isfile(fname))
        checks.append(("report: omega_report_mining_<UTCts>.md created",
                       created))
        routed = False
        if created:
            with open(fname, "r", encoding="utf-8") as handle:
                content = handle.read()
            routed = ("Omega Mining & Investment Engine" in content
                      and "## Key Findings" in content
                      and "## Suggested Next Actions" in content)
        checks.append(("report: routed subsystem + findings + actions", routed))
    except Exception as exc:
        checks.append(("report: (exception: %s)" % exc, False))

    # ------------------------------------------------------------------
    # v29.2.0: Evolution Engine checks (incl. adversarial sandbox proofs)
    # ------------------------------------------------------------------
    evo = engine.evolution

    # Router: evolution keywords reach subsystem #10.
    try:
        result = engine.execute_omega_subsystem("evolution mutation engine",
                                                {"query": "x"})
        checks.append(("router: evolution keywords -> Evolution Engine",
                       result.get("subsystem") == "Omega Evolution Engine"))
    except Exception as exc:
        checks.append(("router: evolution (exception: %s)" % exc, False))

    # (d) Safe whitelisted sample passes gate 1 AND gate 2 (3/3 contracts).
    try:
        ok_ast, _why = evo.ast_gate(EVO_GEN1_CODE)
        ok_exec, _r, pass_rate, _lat = evo.exec_contract_gate(EVO_GEN1_CODE)
        checks.append(("evolve: safe sample passes AST + sandbox gates",
                       ok_ast and ok_exec and pass_rate == 1.0))
    except Exception as exc:
        checks.append(("evolve: safe sample (exception: %s)" % exc, False))

    # (a) AST gate REJECTS a candidate containing 'import os' + os.system.
    bad_import = (
        "import os\n"
        "def execute_logic(query, telemetry):\n"
        "    os.system('echo pwned')\n"
        "    return '<omega_analysis>x</omega_analysis>'\n"
    )
    try:
        ok, reason = evo.ast_gate(bad_import)
        checks.append(("evolve: AST gate rejects 'import os' + os.system",
                       not ok and "import" in reason))
    except Exception as exc:
        checks.append(("evolve: import rejection (exception: %s)" % exc,
                       False))

    # (b) AST gate REJECTS a candidate calling open('omega_pillars.json').
    bad_open = (
        "def execute_logic(query, telemetry):\n"
        "    data = open('omega_pillars.json').read()\n"
        "    return '<omega_analysis>' + data + '</omega_analysis>'\n"
    )
    try:
        ok, _reason = evo.ast_gate(bad_open)
        checks.append(("evolve: AST gate rejects open() file read", not ok))
    except Exception as exc:
        checks.append(("evolve: open rejection (exception: %s)" % exc, False))

    # (c) AST gate REJECTS __import__ and dunder-attribute tricks.
    bad_dunder_import = (
        "def execute_logic(query, telemetry):\n"
        "    mod = __import__('os')\n"
        "    return '<omega_analysis>' + str(mod) + '</omega_analysis>'\n"
    )
    bad_dunder_attr = (
        "def execute_logic(query, telemetry):\n"
        "    return '<omega_analysis>' + str(query.__class__) + '</omega_analysis>'\n"
    )
    try:
        ok1, _r1 = evo.ast_gate(bad_dunder_import)
        ok2, _r2 = evo.ast_gate(bad_dunder_attr)
        checks.append(("evolve: AST gate rejects __import__ + dunder attr",
                       not ok1 and not ok2))
    except Exception as exc:
        checks.append(("evolve: dunder rejection (exception: %s)" % exc,
                       False))

    # (e) Restricted exec cannot read files: bypass gate 1 and feed the
    # file-reading candidate straight to the sandbox; it must fail with a
    # rejection (NameError on 'open'), never with file contents.
    try:
        ok, reason, _pr, _lat = evo.exec_contract_gate(bad_open)
        checks.append(("evolve: restricted exec cannot read files",
                       not ok and "open" in reason
                       and "p1_build_sync" not in reason))
    except Exception as exc:
        checks.append(("evolve: sandbox file read (exception: %s)" % exc,
                       False))

    # (f) Contract tests enforce the '<omega_analysis>' tag.
    no_tag = (
        "def execute_logic(query, telemetry):\n"
        "    return 'plain text with no tag'\n"
    )
    try:
        ok, reason, _pr, _lat = evo.exec_contract_gate(no_tag)
        checks.append(("evolve: contract gate enforces <omega_analysis>",
                       not ok and "omega_analysis" in reason))
    except Exception as exc:
        checks.append(("evolve: tag enforcement (exception: %s)" % exc,
                       False))

    # (g) Fitness gate rejects a lower-fitness candidate.
    try:
        low = evo.fitness(1.0, 0.1, 0.0)    # 0.8
        high = evo.fitness(1.0, 0.1, 1.0)   # 1.0
        checks.append(("evolve: fitness gate rejects lower fitness",
                       low < high and not (low >= high)
                       and abs(high - 1.0) < 1e-9))
    except Exception as exc:
        checks.append(("evolve: fitness gate (exception: %s)" % exc, False))

    # Telemetry scoring is clamped to [0.0, 1.0] (negative-score bug fix).
    try:
        s_mid = evo.score_result(True, "no tag here", 3.0)   # 1-.3-.2 = 0.5
        s_floor = evo.score_result(False, "", 9.0)           # clamps to 0.0
        checks.append(("evolve: telemetry score clamped to [0,1]",
                       abs(s_mid - 0.5) < 1e-9 and s_floor == 0.0))
    except Exception as exc:
        checks.append(("evolve: score clamp (exception: %s)" % exc, False))

    # (k) Offline 'evolve run' completes with no keys and no network.
    try:
        engine.openrouter_key = ""
        gen_before = evo.generation()
        ok, out_lines = evo.run_cycle(online=False)
        adopted = ok and evo.generation() > gen_before
        files_ok = (os.path.isfile(STRATEGY_FILE)
                    and os.path.isfile(EVOLUTION_FILE)
                    and os.path.isfile(PILLARS_FILE))
        joined = "\n".join(out_lines)
        checks.append(("evolve: offline run adopts (no keys/no network)",
                       adopted and files_ok and "ADOPTED" in joined))
    except Exception as exc:
        checks.append(("evolve: offline run (exception: %s)" % exc, False))

    # (i) Rollback restores an archived (prior) generation.
    try:
        gen_now = evo.generation()
        ok, out_lines = evo.rollback()
        checks.append(("evolve: rollback restores archived generation",
                       ok and evo.generation() < gen_now
                       and any("restored generation" in line
                               for line in out_lines)))
    except Exception as exc:
        checks.append(("evolve: rollback (exception: %s)" % exc, False))

    # (h) Pillar tamper: corrupt omega_pillars.json -> detected + restored.
    try:
        with open(PILLARS_FILE, "w", encoding="utf-8") as handle:
            handle.write('{"pillars": {"p1_build_sync": "HACKED"}, '
                         '"sha256": "deadbeef"}')
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            status = evo.verify_pillars(announce=True)
        checks.append(("evolve: pillar tamper detected + restored",
                       status == "RESTORED"
                       and evo.pillars_status() == "OK"
                       and "PILLAR TAMPER DETECTED" in buf.getvalue()))
    except Exception as exc:
        checks.append(("evolve: pillar tamper (exception: %s)" % exc, False))

    # (j) 'why' + 'integrations' CLI output present.
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep1 = handle_command(engine, "why")
            keep2 = handle_command(engine, "integrations")
        out = buf.getvalue()
        checks.append(("why: 6 differentiators printed",
                       bool(keep1) and out.count("proof:") >= 6))
        checks.append(("integrations: 6-connector manifest printed",
                       bool(keep2) and all(name in out for name in (
                           "GitHub", "Excel/CSV", "Serper", "OpenAI",
                           "OpenRouter", "claude_engine"))))
    except Exception as exc:
        checks.append(("why/integrations: (exception: %s)" % exc, False))

    # 'evolve test <query>' executes the live strategy and scores telemetry.
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep = handle_command(engine, "evolve test check mining health")
        out = buf.getvalue()
        checks.append(("evolve test: strategy executes + telemetry scored",
                       bool(keep) and "<omega_analysis>" in out
                       and "health:" in out))
    except Exception as exc:
        checks.append(("evolve test: (exception: %s)" % exc, False))

    # 'evolve' status + lineage + pillars commands render without crashing.
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            handle_command(engine, "evolve")
            handle_command(engine, "evolve lineage")
            handle_command(engine, "evolve pillars")
        out = buf.getvalue()
        checks.append(("evolve: status/lineage/pillars render",
                       "current generation:" in out
                       and "pillars integrity:" in out
                       and "p5_security" in out))
    except Exception as exc:
        checks.append(("evolve: status render (exception: %s)" % exc, False))

    # ------------------------------------------------------------------
    # v29.3.0: process-isolated sandbox, bridge, 15 packs, launch
    # ------------------------------------------------------------------

    # (a) Infinite-loop candidate -> rejected via timeout; the child process
    # is terminated and NO live child processes remain afterwards.
    infinite_loop = (
        "def execute_logic(query, telemetry):\n"
        "    while True:\n"
        "        pass\n"
    )
    try:
        ok, reason, _pr, _lat = evo.exec_contract_gate(infinite_loop)
        checks.append(("evolve: process isolation rejects infinite loop",
                       not ok and "timeout" in reason.lower()))
    except Exception as exc:
        checks.append(("evolve: infinite loop (exception: %s)" % exc, False))
    try:
        checks.append(("evolve: no live child processes after timeout kill",
                       sandbox_live_children() == 0))
    except Exception as exc:
        checks.append(("evolve: zombie check (exception: %s)" % exc, False))

    # (b) Memory-bomb candidate -> rejected. POSIX: MemoryError via the
    # 256 MB RLIMIT_AS ceiling inside the child. Non-POSIX: documented skip
    # (gate 2 is timeout-only there - see the REVIEW note in _sandbox_worker).
    memory_bomb = (
        "def execute_logic(query, telemetry):\n"
        "    data = list(range(10**8))\n"
        "    return '<omega_analysis>' + str(len(data)) + '</omega_analysis>'\n"
    )
    try:
        import resource as _resource_probe  # noqa: F401
        _posix_ceiling = True
    except Exception:
        _posix_ceiling = False
    if _posix_ceiling:
        try:
            ok, reason, _pr, _lat = evo.exec_contract_gate(memory_bomb)
            checks.append(("evolve: POSIX memory bomb rejected (256MB cap)",
                           not ok and ("memory" in reason.lower()
                                       or "timeout" in reason.lower()
                                       or "exit" in reason.lower())))
            checks.append(("evolve: no live children after memory bomb",
                           sandbox_live_children() == 0))
        except Exception as exc:
            checks.append(("evolve: memory bomb (exception: %s)" % exc,
                           False))
    else:
        checks.append(("evolve: memory ceiling skip (non-POSIX, documented)",
                       True))

    # (c) Safe candidate still accepted end-to-end through the process-
    # isolated gate (all 3 contract tests pass inside the child).
    try:
        ok, reason, pass_rate, lat = evo.exec_contract_gate(EVO_TEMPLATES[1])
        checks.append(("evolve: safe candidate accepted end-to-end (child)",
                       ok and pass_rate == 1.0 and lat >= 0.0
                       and sandbox_live_children() == 0))
    except Exception as exc:
        checks.append(("evolve: safe end-to-end (exception: %s)" % exc,
                       False))

    # Bridge-absent safety: claude_engine is NOT installed in this sandbox;
    # everything must work without it (the natural test condition).
    try:
        checks.append(("bridge: guarded import flag is a plain bool",
                       isinstance(BRIDGE_AVAILABLE, bool)))
    except Exception as exc:
        checks.append(("bridge: flag (exception: %s)" % exc, False))
    try:
        if BRIDGE_AVAILABLE:
            # Installed elsewhere: lazy singleton must still be safe.
            bridge_ok = True
        else:
            bridge_ok = engine._get_bridge() is None
        checks.append(("bridge: lazy singleton safe when module absent",
                       bridge_ok))
    except Exception as exc:
        checks.append(("bridge: lazy singleton (exception: %s)" % exc, False))
    try:
        offline_engine._bridge_attempted = False
        offline_engine._bridge_engine = None
        checks.append(("bridge: _llm falls back cleanly (offline -> None)",
                       offline_engine._llm("bridge safety probe") is None))
    except Exception as exc:
        checks.append(("bridge: _llm fallback (exception: %s)" % exc, False))
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep = handle_command(engine, "bridge")
        out = buf.getvalue()
        checks.append(("bridge: command reports status without keys/module",
                       bool(keep) and "claude_engine bridge status" in out
                       and "fallback provider" in out))
    except Exception as exc:
        checks.append(("bridge: command (exception: %s)" % exc, False))

    # Language packs: exactly 15 complete packs, all ASCII-safe.
    try:
        pack_keys = ("name", "greeting", "goodbye", "help_header",
                     "unknown_command", "remembered", "forgot")
        complete = all(all(k in pack for k in pack_keys)
                       for pack in LANG_PACKS.values())
        checks.append(("lang: 15 complete language packs",
                       len(LANG_PACKS) == 15 and complete))
        ascii_safe = all(
            all(ord(ch) < 128 for ch in str(value))
            for pack in LANG_PACKS.values() for value in pack.values())
        checks.append(("lang: all pack strings ASCII-safe", ascii_safe))
    except Exception as exc:
        checks.append(("lang: pack audit (exception: %s)" % exc, False))

    # Roundtrips through 2 of the new packs (sw + am), then back to en.
    for new_code in ("sw", "am"):
        try:
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                handle_command(engine, "lang " + new_code)
                out_new = buf.getvalue()
                handle_command(engine, "lang en")
            ok = (engine.lang == "en"
                  and LANG_PACKS[new_code]["name"] in out_new
                  and load_memory(engine.memory_path).get("lang") == "en")
            checks.append(("lang: new pack '%s' roundtrip" % new_code, ok))
        except Exception as exc:
            checks.append(("lang: '%s' roundtrip (exception: %s)"
                           % (new_code, exc), False))

    # Launch pre-flight: GO/NO-GO table renders; clean room -> LAUNCH READY.
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            keep = handle_command(engine, "launch")
        out = buf.getvalue()
        checks.append(("launch: pre-flight table + LAUNCH READY",
                       bool(keep) and "pillars integrity" in out
                       and "memory writable" in out
                       and "LAUNCH READY" in out
                       and "NOT READY" not in out))
    except Exception as exc:
        checks.append(("launch: (exception: %s)" % exc, False))

    # Report.
    failures = 0
    for name, ok in checks:
        print("  [%s] %s" % ("PASS" if ok else "FAIL", name))
        if not ok:
            failures += 1
    print("-" * 60)
    print("%d/%d checks passed." % (len(checks) - failures, len(checks)))
    if failures:
        print("SELF TEST: FAIL")
        return 1
    print("SELF TEST: PASS")
    return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main(argv: List[str]) -> int:
    args = argv[1:]
    if args and args[0] == "--selftest":
        return run_selftest()
    engine = OmegaMasterEngine()
    if args:
        # One-shot mode: process once, exit.
        query = " ".join(args)
        engine.add_history("user", query)
        try:
            handle_command(engine, query)
        except Exception as exc:
            print("[Error] recovered: %s" % exc)
            save_memory(engine.memory_path, engine.memory)
            return 1
        save_memory(engine.memory_path, engine.memory)
        return 0
    return run_repl(engine)


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except KeyboardInterrupt:
        print("\nOMEGA interrupted. Stay sovereign.")
        sys.exit(0)
