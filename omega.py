#!/usr/bin/env python3
"""
LUQI AI v29.1.0 - Unified Master Engine (omega.py)

Single-file, stdlib-only CLI engine unifying 9 subsystems behind the
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

- Python 3.11, standard library only, ASCII-only source.
- Boots with no .env, no network, no third-party packages.
- Windows/macOS/Linux compatible:  py -3.11 omega.py
- Modes:
    py -3.11 omega.py                -> interactive REPL
    py -3.11 omega.py "question"     -> one-shot mode
    py -3.11 omega.py --selftest     -> non-interactive self test
"""

import contextlib
import csv
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ENGINE_VERSION = "29.1.0"
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

    def _llm(self, prompt: str) -> Optional[str]:
        """POST to OpenAI chat completions; return text or None on failure."""
        if not self.openai_key:
            return None
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
        ("lang <code>", "switch UI language (en/zu/xh/st/af)"),
        ("selfimprove <note>", "log a self-improvement entry"),
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
        engine._audit("Dataset", "query", "Success")
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

    # Router smoke test over all 9 subsystems.
    smoke = [
        ("build and deploy sync", "Omega Infrastructure Build & Sync"),
        ("crypto mining portfolio", "Omega Mining & Investment Engine"),
        ("tax vat sars compliance", "Omega Tax & Audit Support"),
        ("api key security status", "Omega Security Gatekeeper"),
        ("deep research search", "Omega Deep Research"),
        ("teach me companion explain", "Omega Companion/Tutor"),
        ("business hustle opportunities", "Omega Opportunity Engine"),
        ("finance budget scam debt", "Omega Finance Literacy"),
        ("selfimprove evolve", "Omega Self-Improvement"),
    ]
    for domain, expected in smoke:
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
        checks.append(("version: shows 29.1.0 + 9 subsystems + session/facts",
                       bool(keep) and "29.1.0" in out
                       and "Subsystems: 9" in out
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
