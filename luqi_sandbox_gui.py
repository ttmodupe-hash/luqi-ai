#!/usr/bin/env python3
"""
Luqi AI v25.1.2 "Prometheus . LUQI" - Sandbox GUI Agent (Definitive)
====================================================================
The most advanced version of the sandbox GUI agent. Completes all
truncated methods, integrates CognitiveWorker pattern with progress
bars, and adds voice wake-word detection, file watching, clipboard
capture, and system tray integration.

Usage:
    python3 luqi_sandbox_gui.py              # Launch GUI
    python3 luqi_sandbox_gui.py --cli        # CLI mode
    python3 luqi_sandbox_gui.py --test       # Run all tests
    python3 luqi_sandbox_gui.py --capability # Capability report
    python3 luqi_sandbox_gui.py --watch      # File watcher mode
"""

from __future__ import annotations

import argparse
import ast
import io
import json
import logging
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# -- Optional Dependencies --------------------------------------------------

logger = logging.getLogger("luqi.sandbox")
_HAS: Dict[str, bool] = {}

try:
    from openai import OpenAI
    _HAS["openai"] = True
except ImportError:
    _HAS["openai"] = False

try:
    from duckduckgo_search import DDGS
    _HAS["ddgs"] = True
except ImportError:
    _HAS["ddgs"] = False

try:
    import speech_recognition as sr
    _HAS["speech"] = True
except ImportError:
    _HAS["speech"] = False

try:
    from gtts import gTTS
    _HAS["gtts"] = True
except ImportError:
    _HAS["gtts"] = False

try:
    import pygame
    _HAS["pygame"] = True
except ImportError:
    _HAS["pygame"] = False

try:
    from PyQt6.QtWidgets import (QApplication, QMainWindow, QLabel, QVBoxLayout,
                                  QWidget, QTextEdit, QPushButton, QHBoxLayout,
                                  QLineEdit, QProgressBar, QFileDialog, QSystemTrayIcon,
                                  QMenu)
    from PyQt6.QtCore import Qt, pyqtSignal, QObject, QThread, QTimer
    from PyQt6.QtGui import QFont, QIcon, QAction, QPixmap
    _HAS["pyqt6"] = True
except ImportError:
    _HAS["pyqt6"] = False

try:
    import docx
    _HAS["docx"] = True
except ImportError:
    _HAS["docx"] = False

try:
    import openpyxl
    _HAS["openpyxl"] = True
except ImportError:
    _HAS["openpyxl"] = False

try:
    from pypdf import PdfReader
    _HAS["pypdf"] = True
except ImportError:
    try:
        from PyPDF2 import PdfReader
        _HAS["pypdf"] = True
    except ImportError:
        _HAS["pypdf"] = False

try:
    from PIL import Image
    _HAS["pil"] = True
except ImportError:
    _HAS["pil"] = False

try:
    import git
    _HAS["gitpython"] = True
except ImportError:
    _HAS["gitpython"] = False

try:
    import pyperclip
    _HAS["pyperclip"] = True
except ImportError:
    _HAS["pyperclip"] = False

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    _HAS["watchdog"] = True
except ImportError:
    _HAS["watchdog"] = False

try:
    import mss
    _HAS["mss"] = True
except ImportError:
    _HAS["mss"] = False

# -- Configuration ----------------------------------------------------------

_PROJECT_ROOT = Path(__file__).parent.resolve()
_DB_FILE = _PROJECT_ROOT / "data" / "luqi_sandbox.db"
_SANDBOX_DIR = _PROJECT_ROOT / "data" / "sandbox"
_LOG_DIR = _PROJECT_ROOT / "data" / "logs"
_CAPABILITIES_DIR = _PROJECT_ROOT / "data" / "capabilities"
_WATCH_DIR = _PROJECT_ROOT / "data" / "watch"

for _d in (_DB_FILE.parent, _SANDBOX_DIR, _LOG_DIR, _CAPABILITIES_DIR, _WATCH_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DEFAULT_MODEL = "gpt-4o"
SANDBOX_TIMEOUT = 10
MAX_FILE_SIZE_MB = 50
SUPPORTED_EXTS = {".txt", ".pdf", ".docx", ".doc", ".xlsx", ".xls",
                  ".png", ".jpg", ".jpeg", ".bmp", ".webp", ".py"}
WAKE_WORDS = ["luqi", "lucky", "looky", "hey luqi"]

# -- Persistent Memory ------------------------------------------------------

class MemoryEngine:
    """Thread-safe SQLite memory for the sandbox agent."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or _DB_FILE)
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY, session_id TEXT DEFAULT 'default',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL, content TEXT NOT NULL, tool_calls TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS parsed_files (
            id INTEGER PRIMARY KEY, filename TEXT, ext TEXT,
            content_preview TEXT, full_path TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS sandbox_runs (
            id INTEGER PRIMARY KEY, filename TEXT, exit_code INTEGER,
            stdout TEXT, stderr TEXT, duration_ms INTEGER,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS capabilities (
            id INTEGER PRIMARY KEY, name TEXT UNIQUE, status TEXT,
            description TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP,
            updated TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS clipboard_captures (
            id INTEGER PRIMARY KEY, content_type TEXT, content_preview TEXT,
            full_text TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS screenshots (
            id INTEGER PRIMARY KEY, path TEXT, analysis TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP)""")
        conn.commit()
        conn.close()

    def save_message(self, role: str, content: str, session_id: str = "default",
                     tool_calls: Optional[List[Dict]] = None):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO conversations (session_id, role, content, tool_calls) VALUES (?, ?, ?, ?)",
                        (session_id, role, content, json.dumps(tool_calls) if tool_calls else None))
            conn.commit()
        except Exception as e:
            logger.error(f"save_message: {e}")

    def get_recent(self, limit: int = 10, session_id: str = "default") -> List[Dict[str, str]]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT role, content FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?",
                           (session_id, limit))
            rows = c.fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"get_recent: {e}")
            return []

    def log_parsed_file(self, filename: str, ext: str, preview: str, path: str):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO parsed_files (filename, ext, content_preview, full_path) VALUES (?, ?, ?, ?)",
                        (filename, ext, preview[:1000], path))
            conn.commit()
        except Exception as e:
            logger.error(f"log_parsed_file: {e}")

    def log_sandbox_run(self, filename: str, exit_code: int, stdout: str, stderr: str, duration_ms: int):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO sandbox_runs (filename, exit_code, stdout, stderr, duration_ms) VALUES (?, ?, ?, ?, ?)",
                        (filename, exit_code, stdout[:2000], stderr[:2000], duration_ms))
            conn.commit()
        except Exception as e:
            logger.error(f"log_sandbox_run: {e}")

    def log_clipboard(self, content_type: str, preview: str, full_text: str):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO clipboard_captures (content_type, content_preview, full_text) VALUES (?, ?, ?)",
                        (content_type, preview[:500], full_text[:5000]))
            conn.commit()
        except Exception as e:
            logger.error(f"log_clipboard: {e}")

    def log_screenshot(self, path: str, analysis: str = ""):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO screenshots (path, analysis) VALUES (?, ?)", (path, analysis[:1000]))
            conn.commit()
        except Exception as e:
            logger.error(f"log_screenshot: {e}")

    _VALID_TABLES = {"conversations", "parsed_files", "sandbox_runs",
                     "clipboard_captures", "screenshots", "capabilities"}

    def get_stats(self) -> Dict[str, int]:
        try:
            conn = self._conn()
            stats = {}
            for table in ["conversations", "parsed_files", "sandbox_runs", "clipboard_captures", "screenshots"]:
                # SECURITY FIX: Validate table name against whitelist before using in SQL
                if table not in self._VALID_TABLES:
                    logger.warning(f"Invalid table name requested: {table}")
                    continue
                c = conn.execute("SELECT COUNT(*) FROM " + table)
                stats[table] = c.fetchone()[0]
            return stats
        except Exception as e:
            logger.error(f"get_stats: {e}")
            return {}

    def clear_session(self, session_id: str = "default"):
        try:
            conn = self._conn()
            conn.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"clear_session: {e}")

    def upsert_capability(self, name: str, status: str, description: str = ""):
        try:
            conn = self._conn()
            conn.execute("""INSERT INTO capabilities (name, status, description, updated)
                   VALUES (?, ?, ?, datetime('now'))
                   ON CONFLICT(name) DO UPDATE SET
                   status = excluded.status, description = excluded.description,
                   updated = datetime('now')""", (name, status, description))
            conn.commit()
        except Exception as e:
            logger.error(f"upsert_capability: {e}")

    def get_capabilities(self) -> List[Dict]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT * FROM capabilities ORDER BY updated DESC")
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"get_capabilities: {e}")
            return []


# -- Document Parser --------------------------------------------------------

class DocumentParser:
    """Multi-format document parser with sandbox containment."""

    def __init__(self, sandbox_dir: Path = _SANDBOX_DIR):
        self.sandbox_dir = sandbox_dir
        self.sandbox_dir.mkdir(parents=True, exist_ok=True)

    def parse(self, file_path: str) -> Dict[str, Any]:
        src = Path(file_path)
        if not src.exists():
            return {"status": "error", "error": f"File not found: {file_path}"}
        size_mb = src.stat().st_size / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            return {"status": "error", "error": f"File too large: {size_mb:.1f}MB (max {MAX_FILE_SIZE_MB}MB)"}
        base_name = src.name
        secure_path = self.sandbox_dir / base_name
        try:
            import shutil
            shutil.copy2(str(src), str(secure_path))
        except Exception as e:
            return {"status": "error", "error": f"Failed to copy to sandbox: {e}"}
        ext = secure_path.suffix.lower()
        if ext not in SUPPORTED_EXTS:
            return {"status": "error", "error": f"Unsupported format: {ext}"}
        try:
            if ext == ".txt":
                return self._parse_txt(secure_path)
            elif ext == ".pdf":
                return self._parse_pdf(secure_path)
            elif ext == ".docx":
                return self._parse_docx(secure_path)
            elif ext in (".xlsx", ".xls"):
                return self._parse_xlsx(secure_path)
            elif ext in (".png", ".jpg", ".jpeg", ".bmp", ".webp"):
                return self._parse_image(secure_path)
            elif ext == ".py":
                return self._execute_python(secure_path)
            else:
                return {"status": "error", "error": f"Unhandled format: {ext}"}
        except Exception as e:
            logger.error(f"Parse error for {base_name}: {e}")
            return {"status": "error", "error": f"Parse failed: {type(e).__name__}: {e}"}

    def _parse_txt(self, path: Path) -> Dict:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return {"status": "ok", "type": "text", "filename": path.name, "content": text[:8000], "chars": len(text)}

    def _parse_pdf(self, path: Path) -> Dict:
        if not _HAS["pypdf"]:
            return {"status": "error", "error": "PDF parsing unavailable. Install: pip install pypdf"}
        reader = PdfReader(str(path))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return {"status": "ok", "type": "pdf", "filename": path.name, "content": text[:8000], "pages": len(reader.pages), "chars": len(text)}

    def _parse_docx(self, path: Path) -> Dict:
        if not _HAS["docx"]:
            return {"status": "error", "error": "DOCX parsing unavailable. Install: pip install python-docx"}
        doc = docx.Document(str(path))
        text = "\n".join(p.text for p in doc.paragraphs)
        return {"status": "ok", "type": "docx", "filename": path.name, "content": text[:8000], "chars": len(text)}

    def _parse_xlsx(self, path: Path) -> Dict:
        if not _HAS["openpyxl"]:
            return {"status": "error", "error": "XLSX parsing unavailable. Install: pip install openpyxl"}
        wb = openpyxl.load_workbook(str(path), data_only=True)
        sheets = []
        for sheet in wb.worksheets:
            rows = []
            for row in sheet.iter_rows(values_only=True):
                if any(cell is not None for cell in row):
                    rows.append(", ".join(str(c) if c is not None else "" for c in row))
            sheets.append(f"--- Sheet: {sheet.title} ---\n" + "\n".join(rows))
        text = "\n\n".join(sheets)
        return {"status": "ok", "type": "xlsx", "filename": path.name, "content": text[:8000], "chars": len(text)}

    def _parse_image(self, path: Path) -> Dict:
        if not _HAS["pil"]:
            return {"status": "error", "error": "Image parsing unavailable. Install: pip install Pillow"}
        img = Image.open(str(path))
        meta = f"Format: {img.format}, Size: {img.size}, Mode: {img.mode}"
        return {"status": "ok", "type": "image", "filename": path.name, "content": f"Image metadata: {meta}", "metadata": meta,
                "note": "Full analysis requires multimodal LLM vision endpoints"}

    def _execute_python(self, path: Path) -> Dict:
        start = time.time()
        try:
            result = subprocess.run([sys.executable, "-S", str(path)], capture_output=True, text=True,
                                    timeout=SANDBOX_TIMEOUT, cwd=str(self.sandbox_dir))
            duration = int((time.time() - start) * 1000)
            return {"status": "ok", "type": "python_executed", "filename": path.name,
                    "content": f"Exit code: {result.returncode}\n\nSTDOUT:\n{result.stdout[:4000]}\n\nSTDERR:\n{result.stderr[:2000]}",
                    "exit_code": result.returncode, "duration_ms": duration}
        except subprocess.TimeoutExpired:
            return {"status": "error", "type": "python_timeout", "filename": path.name,
                    "error": f"Execution timed out after {SANDBOX_TIMEOUT}s"}
        except Exception as e:
            return {"status": "error", "type": "python_error", "filename": path.name, "error": str(e)}


# -- Voice Engine ------------------------------------------------------------

class VoiceEngine:
    """Speech-to-text and text-to-speech with wake word detection."""

    ACCENTS = {"uk": "co.uk", "us": "com", "au": "com.au", "ca": "ca",
                 "in": "co.in", "ie": "ie", "za": "co.za", "ng": "com.ng"}

    def __init__(self):
        self.is_listening = False
        self.wake_word_detected = False

    def listen(self, timeout: int = 5, phrase_limit: int = 8) -> str:
        if not _HAS.get("speech"):
            return ""
        recognizer = sr.Recognizer()
        try:
            with sr.Microphone() as source:
                logger.info(f"Listening (timeout={timeout}s)...")
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)
                text = recognizer.recognize_google(audio, language="en-US")
                logger.info(f"Transcribed: '{text}'")
                return text
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            logger.error(f"STT error: {e}")
            return ""

    def listen_for_wake_word(self, timeout: int = 10) -> Optional[str]:
        """Listen for wake word. Returns full command if wake word detected, None otherwise."""
        if not _HAS.get("speech"):
            return None
        text = self.listen(timeout=timeout)
        if not text:
            return None
        text_lower = text.lower().strip()
        for wake in WAKE_WORDS:
            if wake in text_lower:
                # Extract command after wake word
                idx = text_lower.find(wake) + len(wake)
                command = text[idx:].strip()
                logger.info(f"Wake word '{wake}' detected. Command: '{command}'")
                return command if command else text
        return None

    def speak(self, text: str, accent: str = "uk") -> str:
        if not _HAS.get("gtts"):
            return "TTS unavailable. Install: pip install gtts"
        clean = self._clean(text)
        if not clean:
            return "Error: No speakable text"
        tld = self.ACCENTS.get(accent, "co.uk")
        path = _PROJECT_ROOT / "data" / f"tts_{int(time.time())}.mp3"
        try:
            gTTS(text=clean, lang="en", tld=tld).save(str(path))
            if _HAS.get("pygame"):
                self._play(str(path))
            return str(path)
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return f"TTS failed: {e}"

    def _play(self, file_path: str):
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            pygame.mixer.quit()
        except Exception as e:
            logger.error(f"Playback error: {e}")

    def _clean(self, text: str) -> str:
        text = re.sub(r'```[\s\S]*?```', ' code block ', text)
        text = re.sub(r'`[^`]+`', ' code ', text)
        text = re.sub(r'#{1,6}\s+', '', text)
        text = re.sub(r'[*_~`]', '', text)
        text = re.sub(r'https?://\S+', ' link ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:500] + "..." if len(text) > 500 else text

    def status(self) -> Dict:
        return {"stt": _HAS.get("speech", False), "tts": _HAS.get("gtts", False),
                "audio": _HAS.get("pygame", False), "is_listening": self.is_listening,
                "wake_words": WAKE_WORDS}


# -- Web Search --------------------------------------------------------------

def search_web(query: str) -> str:
    if not _HAS.get("ddgs"):
        return "Web search unavailable. Install: pip install duckduckgo-search"
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
            if not results:
                return f"No results for '{query}'."
            lines = []
            for i, r in enumerate(results, 1):
                body = r.get("body", "")[:150]
                lines.append(f"[{i}] {r['title']}" + "\n" + f"    {body}..." + "\n" + f"    {r.get('href', 'N/A')}")
            return f"Results for '{query}':" + "\n\n" + "\n\n".join(lines)
    except Exception as e:
        return f"Web search error: {e}"


# -- Tool Registry -----------------------------------------------------------

class ToolRegistry:
    """Dynamic tool registry with OpenAI-compatible schemas."""

    def __init__(self, memory: Optional[MemoryEngine] = None):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Dict] = {}
        self.memory = memory

    def register(self, name: str, func: Callable, schema: Dict, category: str = "general"):
        self._tools[name] = func
        self._schemas[name] = {"schema": schema, "category": category}

    def get(self, name: str) -> Optional[Callable]:
        return self._tools.get(name)

    def list(self) -> List[Dict]:
        return [{"name": n, "category": m["category"]} for n, m in self._schemas.items()]

    def get_openai_schemas(self) -> List[Dict]:
        schemas = []
        for name, meta in self._schemas.items():
            s = meta["schema"]
            schemas.append({"type": "function", "function": {"name": name, "description": s.get("description", ""),
                             "parameters": s.get("parameters", {"type": "object", "properties": {}})}})
        return schemas

    def invoke(self, name: str, arguments: Dict) -> str:
        func = self._tools.get(name)
        if not func:
            return f"Error: Tool '{name}' not found."
        start = time.time()
        try:
            result = func(**arguments)
            duration = int((time.time() - start) * 1000)
            if self.memory:
                self.memory.log_tool_usage(name, str(arguments)[:200], str(result)[:200], duration, True)
            return str(result)
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            if self.memory:
                self.memory.log_tool_usage(name, str(arguments)[:200], str(e)[:200], duration, False)
            return f"Tool '{name}' failed: {type(e).__name__}: {e}"


# -- Capability Agents -------------------------------------------------------

@dataclass
class CapabilityItem:
    name: str
    status: str
    description: str
    agent_responsible: str = ""
    tags: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    last_updated: str = ""
    version_added: str = "25.1.2"


class CapabilityTracker:
    DEFAULT_CAPABILITIES = [
        CapabilityItem("document_parser", "active", "Multi-format document parsing (PDF, DOCX, XLSX, TXT, images)",
                       agent_responsible="LuqiSandboxAgent", tags=["core", "files"],
                       dependencies=["pypdf", "python-docx", "openpyxl", "Pillow"]),
        CapabilityItem("sandbox_executor", "active", "Secure Python code execution with timeout",
                       agent_responsible="LuqiSandboxAgent", tags=["core", "security"]),
        CapabilityItem("web_search", "active", "Live web search via DuckDuckGo",
                       agent_responsible="LuqiSandboxAgent", tags=["core", "information"],
                       dependencies=["duckduckgo_search"]),
        CapabilityItem("voice_stt", "active", "Speech-to-text via Google Speech Recognition",
                       agent_responsible="VoiceEngine", tags=["voice"], dependencies=["SpeechRecognition"]),
        CapabilityItem("voice_tts", "active", "Text-to-speech via gTTS with 8 accents",
                       agent_responsible="VoiceEngine", tags=["voice"], dependencies=["gtts", "pygame"]),
        CapabilityItem("wake_word", "active", "Wake word detection (Hey Luqi)",
                       agent_responsible="VoiceEngine", tags=["voice", "ai"]),
        CapabilityItem("persistent_memory", "active", "SQLite-backed conversation and session memory",
                       agent_responsible="MemoryEngine", tags=["core", "data"]),
        CapabilityItem("drag_drop_gui", "active", "PyQt6 drag-and-drop file processing interface with progress bars",
                       agent_responsible="LuqiSandboxGUI", tags=["ui"], dependencies=["PyQt6"]),
        CapabilityItem("openai_tools", "active", "Dynamic tool calling via OpenAI function calling",
                       agent_responsible="LuqiSandboxAgent", tags=["core", "ai"], dependencies=["openai"]),
        CapabilityItem("clipboard_capture", "active", "Clipboard monitoring and text capture",
                       agent_responsible="LuqiSandboxAgent", tags=["productivity"], dependencies=["pyperclip"]),
        CapabilityItem("screenshot_capture", "active", "Screen capture and image analysis",
                       agent_responsible="LuqiSandboxAgent", tags=["vision"], dependencies=["mss", "Pillow"]),
        CapabilityItem("file_watcher", "active", "Automatic file detection and processing in watch directory",
                       agent_responsible="LuqiSandboxAgent", tags=["automation"], dependencies=["watchdog"]),
        CapabilityItem("system_tray", "active", "Minimize to system tray with quick actions",
                       agent_responsible="LuqiSandboxGUI", tags=["ui"], dependencies=["PyQt6"]),
        CapabilityItem("self_improvement", "active", "Capability agents for analyzing and enhancing the system",
                       agent_responsible="SelfImprovementAgent", tags=["meta", "enhancement"]),
        CapabilityItem("auto_update_push", "planned", "Automated git commit and push of enhancements",
                       agent_responsible="UpdatePushAgent", tags=["meta", "deployment"], dependencies=["gitpython"]),
        CapabilityItem("vision_analysis", "planned", "Image understanding via multimodal LLM",
                       agent_responsible="LuqiSandboxAgent", tags=["ai", "vision"]),
        CapabilityItem("fact_learning", "planned", "Automatic extraction and storage of user facts from chat",
                       agent_responsible="MemoryEngine", tags=["ai", "memory"]),
    ]

    def __init__(self, memory: MemoryEngine):
        self.memory = memory
        self._ensure_defaults()

    def _ensure_defaults(self):
        existing = {row["name"]: row for row in self.memory.get_capabilities()}
        for cap in self.DEFAULT_CAPABILITIES:
            meta = json.dumps({"description": cap.description, "agent": cap.agent_responsible,
                               "tags": cap.tags, "deps": cap.dependencies, "version": cap.version_added})
            if cap.name not in existing:
                self.memory.upsert_capability(cap.name, cap.status, meta)
            else:
                stored = existing[cap.name]
                try:
                    stored_meta = json.loads(stored.get("description", "{}"))
                    stored_version = stored_meta.get("version", "0")
                except:
                    stored_version = "0"
                if stored_version != cap.version_added or not stored.get("description"):
                    self.memory.upsert_capability(cap.name, stored.get("status", cap.status), meta)

    def get_all(self) -> List[CapabilityItem]:
        rows = self.memory.get_capabilities()
        items = []
        for row in rows:
            try:
                meta = json.loads(row.get("description", "{}"))
            except:
                meta = {}
            items.append(CapabilityItem(name=row["name"], status=row["status"],
                description=meta.get("description", ""), agent_responsible=meta.get("agent", ""),
                tags=meta.get("tags", []), dependencies=meta.get("deps", []),
                last_updated=row.get("updated", ""), version_added=meta.get("version", "25.1.2")))
        return items

    def get_by_status(self, status: str) -> List[CapabilityItem]:
        return [c for c in self.get_all() if c.status == status]

    def update_status(self, name: str, status: str):
        self.memory.upsert_capability(name, status)

    def add_capability(self, name: str, description: str, status: str = "planned",
                       agent: str = "", tags: List[str] = None, deps: List[str] = None):
        self.memory.upsert_capability(name, status,
            json.dumps({"description": description, "agent": agent, "tags": tags or [], "deps": deps or []}))

    def report(self) -> str:
        caps = self.get_all()
        active = [c for c in caps if c.status == "active"]
        planned = [c for c in caps if c.status == "planned"]
        lines = [f"=== LUQI Capability Report ({len(caps)} total) ===", f"\nACTIVE ({len(active)}):"]
        for c in active:
            deps_ok = all(_HAS.get(d) for d in c.dependencies)
            dep_str = "ready" if deps_ok else f"needs: {', '.join(c.dependencies)}"
            lines.append(f"  [{c.name}] {c.description[:60]}... ({dep_str})")
        lines.append(f"\nPLANNED ({len(planned)}):")
        for c in planned:
            lines.append(f"  [{c.name}] {c.description[:60]}...")
        return "\n".join(lines)


class SelfImprovementAgent:
    ANTI_PATTERNS = {
        r"os\.system\s*\(": "Use subprocess.run instead of os.system()",
        r"except\s*:\s*$": "Bare except: - catch specific exceptions",
        r"datetime\.utcnow\s*\(\)": "utcnow() is deprecated - use datetime.now(timezone.utc)",
        r"\.choices\.message": "Missing index: use .choices[0].message",
        r"bare\s*except": "Always catch specific exceptions",
    }

    def __init__(self, tracker: CapabilityTracker):
        self.tracker = tracker

    def analyze_file(self, file_path: str) -> List[Dict]:
        issues = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                source = f.read()
            lines = source.split("\n")
            for i, line in enumerate(lines, 1):
                for pattern, suggestion in self.ANTI_PATTERNS.items():
                    if re.search(pattern, line):
                        issues.append({"line": i, "code": line.strip(), "issue": suggestion, "severity": "warning"})
            try:
                tree = ast.parse(source)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        if not ast.get_docstring(node):
                            issues.append({"line": node.lineno, "code": f"def {node.name}(...)",
                                           "issue": f"Function '{node.name}' missing docstring", "severity": "info"})
            except SyntaxError:
                issues.append({"line": 0, "code": "", "issue": "File has syntax errors", "severity": "error"})
        except Exception as e:
            issues.append({"line": 0, "code": "", "issue": f"Analysis failed: {e}", "severity": "error"})
        return issues

    def analyze_project(self, root_dir: str) -> Dict[str, Any]:
        all_issues = []
        files_checked = 0
        for root, _, files in os.walk(root_dir):
            for f in files:
                if f.endswith(".py") and "__pycache__" not in root:
                    fp = os.path.join(root, f)
                    issues = self.analyze_file(fp)
                    if issues:
                        all_issues.append({"file": f, "path": fp, "issues": issues})
                    files_checked += 1
        return {"files_checked": files_checked, "files_with_issues": len(all_issues),
                "total_issues": sum(len(f["issues"]) for f in all_issues), "findings": all_issues}

    def generate_enhancement_plan(self, analysis: Dict) -> str:
        lines = ["=== Self-Improvement Plan ===", f"Files analyzed: {analysis['files_checked']}",
                 f"Files with issues: {analysis['files_with_issues']}",
                 f"Total issues: {analysis['total_issues']}", ""]
        for finding in analysis["findings"]:
            lines.append(f"\n{finding['file']} ({len(finding['issues'])} issues):")
            for issue in finding["issues"]:
                lines.append(f"  Line {issue['line']}: [{issue['severity']}] {issue['issue']}")
        return "\n".join(lines)


class UpdatePushAgent:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self._has_git = _HAS.get("gitpython", False)

    def status(self) -> Dict[str, Any]:
        if not self._has_git:
            return {"available": False, "reason": "gitpython not installed"}
        try:
            repo = git.Repo(self.repo_path)
            return {"available": True, "branch": repo.active_branch.name,
                    "untracked": len(repo.untracked_files),
                    "modified": len([i for i in repo.index.diff(None)]),
                    "commits_ahead": len(list(repo.iter_commits("@{u}..")))}
        except Exception as e:
            return {"available": False, "reason": str(e)}

    def stage_and_commit(self, files: List[str], message: str) -> Dict[str, str]:
        if not self._has_git:
            return {"status": "error", "message": "gitpython not installed"}
        try:
            repo = git.Repo(self.repo_path)
            repo.git.add(files)
            repo.index.commit(message)
            return {"status": "ok", "commit": repo.head.commit.hexsha[:8], "message": message}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def generate_changelog(self, since_tag: str = "") -> str:
        if not self._has_git:
            return "Changelog: gitpython not available"
        try:
            repo = git.Repo(self.repo_path)
            commits = list(repo.iter_commits(max_count=20))
            lines = ["=== Recent Changes ==="]
            for c in commits:
                lines.append(f"- [{c.hexsha[:8]}] {c.message.split(chr(10))[0]}")
            return "\n".join(lines)
        except Exception as e:
            return f"Changelog error: {e}"

    def push_updates(self, remote: str = "origin", branch: str = "main") -> Dict[str, str]:
        if not self._has_git:
            return {"status": "error", "message": "gitpython not installed"}
        try:
            repo = git.Repo(self.repo_path)
            origin = repo.remote(remote)
            origin.push(branch)
            return {"status": "ok", "message": f"Pushed to {remote}/{branch}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}


# -- Main Agent Class --------------------------------------------------------

class LuqiSandboxAgent:
    """The main sandbox GUI agent with capability agents."""

    SYSTEM_PROMPT = ("You are Luqi, an advanced AI assistant with a secure sandbox environment. "
        "You can parse documents (PDF, DOCX, XLSX, TXT, images), execute Python code safely, "
        "search the web, capture clipboard and screenshots, and process voice commands. "
        "You remember past interactions. Be concise, helpful, and technically precise.")

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.model = model
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.memory = MemoryEngine()
        self.parser = DocumentParser()
        self.voice = VoiceEngine()
        self.tools = ToolRegistry(memory=self.memory)
        self._register_tools()
        self.capability_tracker = CapabilityTracker(self.memory)
        self.improvement_agent = SelfImprovementAgent(self.capability_tracker)
        self.update_agent = UpdatePushAgent()
        self._file_watcher: Optional[Observer] = None
        self._clipboard_timer: Optional[QTimer] = None
        self._last_clipboard: str = ""
        if _HAS["openai"]:
            self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        else:
            self.client = None

    def _register_tools(self):
        self.tools.register("search_web", search_web, {
            "description": "Search the live web for real-time information.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
            "information")
        self.tools.register("parse_and_read_file", self._tool_parse_file, {
            "description": "Extract text from documents (PDF, DOCX, XLSX, TXT) or execute Python files in sandbox.",
            "parameters": {"type": "object", "properties": {"file_path": {"type": "string"}}, "required": ["file_path"]}},
            "files")
        self.tools.register("system_info", self._tool_system_info, {
            "description": "Get system status and dependency availability.",
            "parameters": {"type": "object", "properties": {}}, "required": []}, "system")
        self.tools.register("analyze_codebase", self._tool_analyze_codebase, {
            "description": "Analyze Python codebase for improvement opportunities.",
            "parameters": {"type": "object", "properties": {"directory": {"type": "string"}}, "required": ["directory"]}},
            "meta")
        self.tools.register("capability_report", self._tool_capability_report, {
            "description": "Generate a report of all system capabilities and their status.",
            "parameters": {"type": "object", "properties": {}}, "required": []}, "meta")
        self.tools.register("capture_clipboard", self._tool_capture_clipboard, {
            "description": "Capture and analyze the current clipboard content.",
            "parameters": {"type": "object", "properties": {}}, "required": []}, "productivity")
        self.tools.register("capture_screenshot", self._tool_capture_screenshot, {
            "description": "Capture a screenshot of the current screen.",
            "parameters": {"type": "object", "properties": {}}, "required": []}, "vision")

    def _tool_parse_file(self, file_path: str) -> str:
        result = self.parser.parse(file_path)
        if result["status"] == "ok":
            self.memory.log_parsed_file(result["filename"], result["type"], result.get("content", "")[:500], file_path)
            return f"Parsed {result['filename']} ({result['type']}):\n{result.get('content', '')[:3000]}"
        return f"Error parsing {file_path}: {result.get('error', 'Unknown error')}"

    def _tool_system_info(self) -> str:
        info = {"dependencies": _HAS, "session": self.session_id, "model": self.model,
                "sandbox_dir": str(_SANDBOX_DIR), "memory_stats": self.memory.get_stats(),
                "tools": [t["name"] for t in self.tools.list()]}
        return json.dumps(info, indent=2)

    def _tool_analyze_codebase(self, directory: str) -> str:
        analysis = self.improvement_agent.analyze_project(directory)
        return self.improvement_agent.generate_enhancement_plan(analysis)

    def _tool_capability_report(self) -> str:
        return self.capability_tracker.report()

    def _tool_capture_clipboard(self) -> str:
        if not _HAS.get("pyperclip"):
            return "Clipboard capture unavailable. Install: pip install pyperclip"
        try:
            text = pyperclip.paste()
            if text:
                self.memory.log_clipboard("text", text[:200], text)
                return f"Clipboard captured ({len(text)} chars):\n{text[:1000]}"
            return "Clipboard is empty."
        except Exception as e:
            return f"Clipboard error: {e}"

    def _tool_capture_screenshot(self) -> str:
        if not _HAS.get("mss"):
            return "Screenshot capture unavailable. Install: pip install mss"
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = _PROJECT_ROOT / "data" / f"screenshot_{timestamp}.png"
            with mss.mss() as sct:
                sct.shot(output=str(path))
            self.memory.log_screenshot(str(path), "Screenshot captured")
            return f"Screenshot saved: {path}"
        except Exception as e:
            return f"Screenshot error: {e}"

    def chat(self, message: str, use_tools: bool = True) -> str:
        if not self.client:
            return "Error: OpenAI not available. Set OPENAI_API_KEY."
        self.memory.save_message("user", message, self.session_id)
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        messages.extend(self.memory.get_recent(session_id=self.session_id))
        messages.append({"role": "user", "content": message})
        try:
            if use_tools and self.tools.list():
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages,
                    tools=self.tools.get_openai_schemas(), tool_choice="auto")
            else:
                response = self.client.chat.completions.create(model=self.model, messages=messages)
            msg = response.choices[0].message
            tool_calls = msg.tool_calls
            if tool_calls:
                messages.append({"role": "assistant", "content": msg.content or "",
                    "tool_calls": [{"id": tc.id, "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                        for tc in tool_calls]})
                for tc in tool_calls:
                    name = tc.function.name
                    args = json.loads(tc.function.arguments)
                    logger.info(f"Tool: {name}({args})")
                    output = self.tools.invoke(name, args)
                    messages.append({"tool_call_id": tc.id, "role": "tool", "name": name, "content": str(output)})
                final = self.client.chat.completions.create(model=self.model, messages=messages)
                reply = final.choices[0].message.content
            else:
                reply = msg.content
            if reply:
                self.memory.save_message("assistant", reply, self.session_id)
            return reply or "Processed."
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"Error: {type(e).__name__}: {e}"

    def process_file(self, file_path: str) -> str:
        result = self.parser.parse(file_path)
        if result["status"] == "ok":
            self.memory.log_parsed_file(result["filename"], result["type"], result.get("content", "")[:500], file_path)
            return f"OK: {result['filename']} ({result['type']}, {result.get('chars', 0)} chars)"
        return f"Error: {result.get('error', 'Unknown')}"

    def speak(self, text: str):
        logger.info(f"[Luqi]: {text[:100]}")
        self.voice.speak(text)

    def listen(self) -> str:
        return self.voice.listen()

    def listen_with_wake_word(self) -> Optional[str]:
        return self.voice.listen_for_wake_word()

    def listen_and_respond(self) -> Dict[str, str]:
        text = self.listen()
        if not text:
            self.speak("I did not catch that.")
            return {"input": "", "response": "No input detected"}
        response = self.chat(text)
        self.speak(response)
        return {"input": text, "response": response}

    def capture_clipboard(self) -> str:
        return self._tool_capture_clipboard()

    def capture_screenshot(self) -> str:
        return self._tool_capture_screenshot()

    def start_file_watcher(self, watch_dir: str = None, callback: Callable = None):
        if not _HAS.get("watchdog"):
            logger.warning("File watcher unavailable. Install: pip install watchdog")
            return
        watch_dir = watch_dir or str(_WATCH_DIR)
        os.makedirs(watch_dir, exist_ok=True)
        class Handler(FileSystemEventHandler):
            def __init__(self, agent, cb):
                self.agent = agent
                self.cb = cb
            def on_created(self, event):
                if not event.is_directory:
                    ext = Path(event.src_path).suffix.lower()
                    if ext in SUPPORTED_EXTS:
                        logger.info(f"File watcher detected: {event.src_path}")
                        result = self.agent.process_file(event.src_path)
                        if self.cb:
                            self.cb(event.src_path, result)
        self._file_watcher = Observer()
        self._file_watcher.schedule(Handler(self, callback), watch_dir, recursive=False)
        self._file_watcher.start()
        logger.info(f"File watcher started on: {watch_dir}")

    def stop_file_watcher(self):
        if self._file_watcher:
            self._file_watcher.stop()
            self._file_watcher.join()
            self._file_watcher = None
            logger.info("File watcher stopped")

    def get_stats(self) -> Dict:
        return {**self.memory.get_stats(), "session_id": self.session_id,
                "tools": [t["name"] for t in self.tools.list()],
                "capabilities": len(self.capability_tracker.get_all())}

    def cleanup(self):
        self.stop_file_watcher()


# -- GUI Workers -------------------------------------------------------------

if _HAS["pyqt6"]:

    class CognitiveWorker(QObject):
        """Handles heavy LLM processing off the UI thread with progress updates."""
        finished = pyqtSignal(str, str)      # (log_message, text_to_speak)
        progress_update = pyqtSignal(int)   # 0-100
        error = pyqtSignal(str)

        def __init__(self, agent: LuqiSandboxAgent, prompt: str):
            super().__init__()
            self.agent = agent
            self.prompt = prompt

        def execute_processing(self):
            try:
                self.progress_update.emit(10)
                response = self.agent.chat(self.prompt)
                self.progress_update.emit(100)
                self.finished.emit("Processing complete.", response)
            except Exception as e:
                logger.error(f"CognitiveWorker error: {e}")
                self.error.emit(str(e))
                self.progress_update.emit(0)


    class FileProcessWorker(QObject):
        """Handles file processing off the UI thread."""
        finished = pyqtSignal(str, str)     # (file_path, result)
        progress_update = pyqtSignal(int)
        error = pyqtSignal(str)

        def __init__(self, agent: LuqiSandboxAgent, file_path: str):
            super().__init__()
            self.agent = agent
            self.file_path = file_path

        def execute(self):
            try:
                self.progress_update.emit(20)
                result = self.agent.process_file(self.file_path)
                self.progress_update.emit(100)
                self.finished.emit(self.file_path, result)
            except Exception as e:
                logger.error(f"FileProcessWorker error: {e}")
                self.error.emit(str(e))


    # -- Main GUI ---------------------------------------------------------------

    class LuqiSandboxGUI(QMainWindow):
        """Holographic PyQt6 interface with drag-drop, voice, system tray, clipboard."""

        def __init__(self):
            super().__init__()
            self.agent = LuqiSandboxAgent()
            self.current_worker = None
            self.worker_thread = None
            self.init_ui()
            # Start voice listener daemon
            threading.Thread(target=self.voice_interaction_loop, daemon=True).start()
            # Start clipboard monitor
            self.start_clipboard_monitor()
            # Start file watcher
            self.agent.start_file_watcher(callback=self.on_watched_file)

        def init_ui(self):
            self.setWindowTitle("Luqi AI v25.1.2 - Sandbox Agent")
            self.setMinimumSize(750, 600)
            self.setAcceptDrops(True)

            # Neon dark theme
            self.setStyleSheet("""
                QMainWindow { background-color: #050b14; }
                QLabel { color: #00d2ff; font-family: 'Courier New'; font-size: 13px; font-weight: bold; }
                QTextEdit { background-color: #0a1526; color: #00ffcc; border: 1px solid #00d2ff;
                            font-family: 'Courier New'; font-size: 12px; padding: 8px; }
                QLineEdit { background-color: #0a1526; color: #00ffcc; border: 1px solid #00d2ff;
                            font-family: 'Courier New'; font-size: 12px; padding: 6px; }
                QPushButton { background-color: #0a1526; color: #00d2ff; border: 1px solid #00d2ff;
                              font-family: 'Courier New'; font-size: 12px; padding: 6px 12px; }
                QPushButton:hover { background-color: #00d2ff; color: #050b14; }
                QProgressBar { border: 1px solid #00d2ff; background-color: #0a1526; color: #00ffcc;
                               text-align: center; font-family: 'Courier New'; }
                QProgressBar::chunk { background-color: #00d2ff; width: 10px; }
            """)

            central = QWidget()
            self.setCentralWidget(central)
            layout = QVBoxLayout(central)
            layout.setSpacing(10)
            layout.setContentsMargins(15, 15, 15, 15)

            # Header
            header = QLabel("LUQI AI SANDBOX AGENT v25.1.2")
            header.setAlignment(Qt.AlignmentFlag.AlignCenter)
            hfont = QFont("Courier New", 16, QFont.Weight.Bold)
            header.setFont(hfont)
            layout.addWidget(header)

            # Subheader with status
            self.subheader = QLabel("[ Multi-threaded | Voice-Enabled | File Watcher Active ]")
            self.subheader.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.subheader.setStyleSheet("color: #94a3b8; font-size: 10px;")
            layout.addWidget(self.subheader)

            # Drop zone
            self.drop_label = QLabel("DROP FILES HERE FOR SECURE SANDBOX ANALYSIS")
            self.drop_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.drop_label.setStyleSheet("border: 2px dashed #00d2ff; padding: 15px; color: #00d2ff; font-size: 12px;")
            layout.addWidget(self.drop_label)

            # Progress bar
            self.progress_bar = QProgressBar()
            self.progress_bar.setValue(0)
            self.progress_bar.setTextVisible(True)
            self.progress_bar.setFormat("%p% - %v")
            layout.addWidget(self.progress_bar)

            # Chat area
            self.console = QTextEdit()
            self.console.setReadOnly(True)
            self.console.setPlaceholderText("Chat and file processing logs will appear here...")
            layout.addWidget(self.console, stretch=1)

            # Quick action buttons
            btn_row = QHBoxLayout()
            self.clip_btn = QPushButton("Clipboard")
            self.clip_btn.setToolTip("Capture and analyze clipboard content")
            self.clip_btn.clicked.connect(self.capture_clipboard_action)
            btn_row.addWidget(self.clip_btn)

            self.ss_btn = QPushButton("Screenshot")
            self.ss_btn.setToolTip("Capture a screenshot")
            self.ss_btn.clicked.connect(self.capture_screenshot_action)
            btn_row.addWidget(self.ss_btn)

            self.cap_btn = QPushButton("Capabilities")
            self.cap_btn.setToolTip("Show capability report")
            self.cap_btn.clicked.connect(self.show_capabilities)
            btn_row.addWidget(self.cap_btn)

            self.wake_btn = QPushButton("Wake Word: OFF")
            self.wake_btn.setToolTip("Toggle wake word listening")
            self.wake_btn.clicked.connect(self.toggle_wake_word)
            self.wake_word_active = False
            btn_row.addWidget(self.wake_btn)

            self.watch_btn = QPushButton("Watcher: ON")
            self.watch_btn.setToolTip("Toggle file watcher")
            self.watch_btn.clicked.connect(self.toggle_file_watcher)
            btn_row.addWidget(self.watch_btn)

            layout.addLayout(btn_row)

            # Input row
            input_row = QHBoxLayout()
            self.chat_input = QLineEdit()
            self.chat_input.setPlaceholderText("Type a message or ask about a file...")
            self.chat_input.returnPressed.connect(self.send_message)
            input_row.addWidget(self.chat_input, stretch=1)

            self.send_btn = QPushButton("Send")
            self.send_btn.clicked.connect(self.send_message)
            input_row.addWidget(self.send_btn)

            self.voice_btn = QPushButton("Voice")
            self.voice_btn.clicked.connect(self.voice_interaction)
            input_row.addWidget(self.voice_btn)

            layout.addLayout(input_row)

            # Status bar
            self.status_label = QLabel("Ready | Drag files, type messages, or use voice | Watch directory: data/watch/")
            self.status_label.setStyleSheet("color: #94a3b8; font-size: 10px;")
            layout.addWidget(self.status_label)

            # System tray
            self.setup_system_tray()

            self.log("Luqi Sandbox Agent initialized.")
            self.log("Drag & drop files, type messages, use voice, or copy text to clipboard.")
            self.log(f"Supported: {', '.join(sorted(SUPPORTED_EXTS))}")
            self.log(f"Wake words: {', '.join(WAKE_WORDS)}")
            self.log("File watcher monitoring: data/watch/")

        def setup_system_tray(self):
            if not QSystemTrayIcon.isSystemTrayAvailable():
                return
            self.tray_icon = QSystemTrayIcon(self)
            # Use a simple colored icon approach
            pixmap = QPixmap(64, 64)
            pixmap.fill(Qt.GlobalColor.transparent)
            self.tray_icon.setIcon(QIcon(pixmap))
            tray_menu = QMenu()
            show_action = QAction("Show", self)
            show_action.triggered.connect(self.show)
            tray_menu.addAction(show_action)
            voice_action = QAction("Voice Input", self)
            voice_action.triggered.connect(self.voice_interaction)
            tray_menu.addAction(voice_action)
            clip_action = QAction("Capture Clipboard", self)
            clip_action.triggered.connect(self.capture_clipboard_action)
            tray_menu.addAction(clip_action)
            tray_menu.addSeparator()
            quit_action = QAction("Quit", self)
            quit_action.triggered.connect(self.close)
            tray_menu.addAction(quit_action)
            self.tray_icon.setContextMenu(tray_menu)
            self.tray_icon.activated.connect(self.tray_activated)
            self.tray_icon.show()

        def tray_activated(self, reason):
            if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
                self.show()

        def log(self, text: str):
            ts = datetime.now().strftime("%H:%M:%S")
            self.console.append(f"[{ts}] {text}")

        # -- Drag & Drop ---------------------------------------------------

        def dragEnterEvent(self, event):
            if event.mimeData().hasUrls():
                event.acceptProposedAction()

        def dropEvent(self, event):
            for url in event.mimeData().urls():
                path = url.toLocalFile()
                if path:
                    self.process_file_interaction(path)

        # -- File Processing ------------------------------------------------

        def process_file_interaction(self, file_path: str):
            """Complete file drop processing with progress bar and background worker."""
            filename = os.path.basename(file_path)
            self.log(f"Processing: {filename}")
            self.drop_label.setText(f"Processing: {filename}...")
            self.progress_bar.setValue(0)

            # Create worker and thread
            self.worker_thread = QThread()
            self.current_worker = FileProcessWorker(self.agent, file_path)
            self.current_worker.moveToThread(self.worker_thread)

            # Connect signals
            self.worker_thread.started.connect(self.current_worker.execute)
            self.current_worker.finished.connect(self.on_file_processed)
            self.current_worker.finished.connect(self.worker_thread.quit)
            self.current_worker.finished.connect(self.current_worker.deleteLater)
            self.worker_thread.finished.connect(self.worker_thread.deleteLater)
            self.current_worker.progress_update.connect(self.progress_bar.setValue)
            self.current_worker.error.connect(self.on_worker_error)

            self.worker_thread.start()

        def on_file_processed(self, path: str, result: str):
            filename = os.path.basename(path)
            self.log(f"Result: {result}")
            self.drop_label.setText("DROP FILES HERE FOR SECURE SANDBOX ANALYSIS")
            self.progress_bar.setValue(0)
            self.status_label.setText(f"Processed: {filename} - {result[:50]}")
            # Optional: speak the result for voice feedback
            if len(result) < 200:
                threading.Thread(target=self.agent.speak, args=(result,), daemon=True).start()

        def on_watched_file(self, path: str, result: str):
            """Callback for file watcher - runs on background thread."""
            filename = os.path.basename(path)
            self.log(f"[WATCHER] Auto-processed: {filename} - {result}")

        # -- Chat ----------------------------------------------------------

        def send_message(self):
            text = self.chat_input.text().strip()
            if not text:
                return
            self.chat_input.clear()
            self.log(f"[You]: {text}")
            self.progress_bar.setValue(10)
            self.status_label.setText("Processing...")

            # Run chat in background
            self.worker_thread = QThread()
            self.current_worker = CognitiveWorker(self.agent, text)
            self.current_worker.moveToThread(self.worker_thread)

            self.worker_thread.started.connect(self.current_worker.execute_processing)
            self.current_worker.finished.connect(self.on_chat_response)
            self.current_worker.finished.connect(self.worker_thread.quit)
            self.current_worker.finished.connect(self.current_worker.deleteLater)
            self.worker_thread.finished.connect(self.worker_thread.deleteLater)
            self.current_worker.progress_update.connect(self.progress_bar.setValue)
            self.current_worker.error.connect(self.on_worker_error)

            self.worker_thread.start()

        def on_chat_response(self, log_msg: str, response: str):
            self.log(f"[Luqi]: {response}")
            self.status_label.setText(log_msg)
            self.progress_bar.setValue(0)

        def on_worker_error(self, error: str):
            self.log(f"[ERROR]: {error}")
            self.progress_bar.setValue(0)
            self.status_label.setText(f"Error: {error[:60]}")

        # -- Voice ---------------------------------------------------------

        def voice_interaction(self):
            self.status_label.setText("Listening... (speak now)")
            self.progress_bar.setValue(50)
            threading.Thread(target=self._do_voice_interaction, daemon=True).start()

        def _do_voice_interaction(self):
            result = self.agent.listen()
            if result:
                self.log(f"[You (voice)]: {result}")
                response = self.agent.chat(result)
                self.log(f"[Luqi]: {response}")
                self.agent.speak(response)
            else:
                self.log("No speech detected.")
            # Reset UI from background thread
            from PyQt6.QtCore import QMetaObject, Qt, Q_ARG
            QMetaObject.invokeMethod(self.progress_bar, "setValue", Qt.ConnectionType.QueuedConnection, Q_ARG(int, 0))

        def voice_interaction_loop(self):
            """Background daemon: listen for wake words continuously."""
            if not _HAS.get("speech"):
                logger.warning("Voice loop: speech recognition not available")
                return
            logger.info("Voice interaction loop started - listening for wake words")
            while True:
                try:
                    command = self.agent.listen_with_wake_word(timeout=10)
                    if command:
                        logger.info(f"Wake word triggered. Command: {command}")
                        response = self.agent.chat(command)
                        self.agent.speak(response)
                except Exception as e:
                    logger.error(f"Voice loop error: {e}")
                time.sleep(1)

        def toggle_wake_word(self):
            self.wake_word_active = not self.wake_word_active
            status = "ON" if self.wake_word_active else "OFF"
            self.wake_btn.setText(f"Wake Word: {status}")
            self.log(f"Wake word listening {status}")

        # -- Clipboard -----------------------------------------------------

        def start_clipboard_monitor(self):
            if not _HAS.get("pyperclip"):
                return
            self._clipboard_timer = QTimer(self)
            self._clipboard_timer.timeout.connect(self._check_clipboard)
            self._clipboard_timer.start(2000)  # Check every 2 seconds

        def _check_clipboard(self):
            try:
                text = pyperclip.paste()
                if text and text != self._last_clipboard and len(text) > 10:
                    self._last_clipboard = text
                    preview = text[:80].replace("\n", " ")
                    self.log(f"[Clipboard] New content captured ({len(text)} chars): {preview}...")
            except Exception:
                pass

        def capture_clipboard_action(self):
            result = self.agent.capture_clipboard()
            self.log(f"[Clipboard] {result}")
            self.status_label.setText("Clipboard captured")

        # -- Screenshot ----------------------------------------------------

        def capture_screenshot_action(self):
            result = self.agent.capture_screenshot()
            self.log(f"[Screenshot] {result}")
            self.status_label.setText("Screenshot captured")

        # -- Capabilities --------------------------------------------------

        def show_capabilities(self):
            report = self.agent.capability_tracker.report()
            self.log(report)

        def toggle_file_watcher(self):
            if self.agent._file_watcher:
                self.agent.stop_file_watcher()
                self.watch_btn.setText("Watcher: OFF")
                self.log("File watcher stopped")
            else:
                self.agent.start_file_watcher(callback=self.on_watched_file)
                self.watch_btn.setText("Watcher: ON")
                self.log("File watcher started")

        # -- Window Events -------------------------------------------------

        def closeEvent(self, event):
            self.log("Shutting down...")
            if self._clipboard_timer:
                self._clipboard_timer.stop()
            self.agent.cleanup()
            if hasattr(self, 'tray_icon'):
                self.tray_icon.hide()
            event.accept()


# If PyQt6 not available, provide a stub
else:
    class LuqiSandboxGUI:
        def __init__(self):
            raise RuntimeError("PyQt6 not installed. Run: pip install PyQt6")


# -- CLI Mode ----------------------------------------------------------------

def cli_mode(agent: LuqiSandboxAgent):
    print("\n" + "=" * 55)
    print("  Luqi AI v25.1.2 - Sandbox Agent (CLI)")
    print("  Commands: /parse <file>, /cap, /analyze <dir>, /voice,")
    print("            /clipboard, /screenshot, /watch, /stats, exit")
    print("=" * 55 + "\n")
    while True:
        try:
            user_input = input("[You]: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit"):
                break
            elif user_input == "/cap":
                print(agent.capability_tracker.report())
            elif user_input.startswith("/parse "):
                print(agent.process_file(user_input[7:]))
            elif user_input.startswith("/analyze "):
                analysis = agent.improvement_agent.analyze_project(user_input[9:])
                print(agent.improvement_agent.generate_enhancement_plan(analysis))
            elif user_input == "/voice":
                result = agent.listen_and_respond()
                print(f"[Voice]: {result}")
            elif user_input == "/clipboard":
                print(agent.capture_clipboard())
            elif user_input == "/screenshot":
                print(agent.capture_screenshot())
            elif user_input == "/watch":
                watch_dir = input("Watch directory [data/watch/]: ").strip() or str(_WATCH_DIR)
                agent.start_file_watcher(watch_dir, lambda p, r: print(f"[WATCHER] {p}: {r}"))
                print(f"File watcher started on {watch_dir}. Press Ctrl+C to stop.")
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    agent.stop_file_watcher()
                    print("File watcher stopped.")
            elif user_input == "/stats":
                print(json.dumps(agent.get_stats(), indent=2))
            elif user_input == "/help":
                print("Commands: /parse <file>, /cap, /analyze <dir>, /voice, /clipboard,")
                print("          /screenshot, /watch, /stats, exit")
            else:
                response = agent.chat(user_input)
                print(f"[Luqi]: {response}\n")
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


# -- Tests -------------------------------------------------------------------

def run_tests() -> bool:
    print("\n" + "=" * 55)
    print("  Luqi Sandbox Agent - Self-Test")
    print("=" * 55)
    passed = failed = 0

    tests = [
        ("MemoryEngine", lambda: _test_memory()),
        ("DocumentParser (TXT)", lambda: _test_parser()),
        ("VoiceEngine", lambda: _test_voice()),
        ("ToolRegistry", lambda: _test_registry()),
        ("CapabilityTracker", lambda: _test_capabilities()),
        ("SelfImprovementAgent", lambda: _test_improvement()),
        ("Clipboard tool", lambda: _test_clipboard()),
        ("LuqiSandboxAgent", lambda: _test_agent()),
        ("File watcher", lambda: _test_watcher()),
    ]

    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    print(f"\n  {passed} passed, {failed} failed")
    print(f"  Status: {'HEALTHY' if failed == 0 else 'DEGRADED'}")
    print("=" * 55)
    return failed == 0


def _test_memory():
    import tempfile as tf
    db_fd, db_path = tf.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        mem = MemoryEngine(db_path=db_path)
        mem.save_message("user", "Hello", "test")
        assert len(mem.get_recent(session_id="test")) == 1
        mem.log_parsed_file("test.pdf", "pdf", "content", "/tmp/test.pdf")
        mem.log_clipboard("text", "preview", "full text")
        stats = mem.get_stats()
        assert stats["conversations"] >= 1
        mem.upsert_capability("test_cap", "active", "test")
        assert len(mem.get_capabilities()) >= 1
    finally:
        os.unlink(db_path)


def _test_parser():
    import tempfile as tf
    with tf.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write("Hello World\nLine 2\n")
        tmp = f.name
    try:
        parser = DocumentParser()
        result = parser.parse(tmp)
        assert result["status"] == "ok"
        assert "Hello World" in result["content"]
    finally:
        os.unlink(tmp)


def _test_voice():
    ve = VoiceEngine()
    c = ve._clean("**bold** `code` https://example.com")
    assert "**" not in c and "https://" not in c
    assert ve.status()["stt"] == _HAS.get("speech", False)


def _test_registry():
    reg = ToolRegistry()
    def fn(x=""): return f"ok: {x}"
    reg.register("test", fn, {"description": "d", "parameters": {"type": "object", "properties": {}}})
    assert "ok: hi" in reg.invoke("test", {"x": "hi"})
    assert "not found" in reg.invoke("x", {})


def _test_capabilities():
    import tempfile as tf
    db_fd, db_path = tf.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        mem = MemoryEngine(db_path=db_path)
        tracker = CapabilityTracker(mem)
        all_caps = tracker.get_all()
        assert len(all_caps) >= 15
        active = tracker.get_by_status("active")
        assert len(active) >= 10
        report = tracker.report()
        assert "ACTIVE" in report
    finally:
        os.unlink(db_path)


def _test_improvement():
    import tempfile as tf
    db_fd, db_path = tf.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        mem = MemoryEngine(db_path=db_path)
        tracker = CapabilityTracker(mem)
        sia = SelfImprovementAgent(tracker)
        with tf.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("def test():\n    pass\n")
            tmp = f.name
        issues = sia.analyze_file(tmp)
        assert isinstance(issues, list)
        os.unlink(tmp)
    finally:
        os.unlink(db_path)


def _test_clipboard():
    agent = LuqiSandboxAgent()
    result = agent._tool_capture_clipboard()
    assert isinstance(result, str)
    agent.cleanup()


def _test_agent():
    agent = LuqiSandboxAgent()
    assert len(agent.tools.list()) == 7
    assert agent.capability_tracker is not None
    stats = agent.get_stats()
    assert "capabilities" in stats
    agent.cleanup()


def _test_watcher():
    agent = LuqiSandboxAgent()
    # Just verify the method exists and can be called without crash
    agent.start_file_watcher()
    agent.stop_file_watcher()
    agent.cleanup()


# -- Entry Point -------------------------------------------------------------

def _setup_logging():
    log_file = _LOG_DIR / f"sandbox_{datetime.now().strftime('%Y%m%d')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)])


def main():
    parser = argparse.ArgumentParser(description="Luqi AI Sandbox GUI Agent")
    parser.add_argument("--cli", "-c", action="store_true", help="CLI mode (no GUI)")
    parser.add_argument("--test", "-t", action="store_true", help="Run self-test")
    parser.add_argument("--capability", "-a", action="store_true", help="Show capability report")
    parser.add_argument("--file", "-f", help="Parse a file immediately")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenAI model")
    parser.add_argument("--watch", "-w", action="store_true", help="File watcher mode (CLI)")
    args = parser.parse_args()

    _setup_logging()

    if args.test:
        sys.exit(0 if run_tests() else 1)

    if args.capability:
        agent = LuqiSandboxAgent(model=args.model)
        print(agent.capability_tracker.report())
        print("\n" + agent.improvement_agent.generate_enhancement_plan(
            agent.improvement_agent.analyze_project(".")))
        sys.exit(0)

    if args.file:
        agent = LuqiSandboxAgent(model=args.model)
        print(agent.process_file(args.file))
        sys.exit(0)

    if args.watch:
        agent = LuqiSandboxAgent(model=args.model)
        watch_dir = str(_WATCH_DIR)
        os.makedirs(watch_dir, exist_ok=True)
        agent.start_file_watcher(watch_dir, lambda p, r: print(f"[WATCHER] {os.path.basename(p)}: {r}"))
        print(f"File watcher monitoring: {watch_dir}")
        print("Drop files into this directory to auto-process.")
        print("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            agent.stop_file_watcher()
            agent.cleanup()
        sys.exit(0)

    if args.cli:
        agent = LuqiSandboxAgent(model=args.model)
        try:
            cli_mode(agent)
        finally:
            agent.cleanup()
        sys.exit(0)

    # GUI mode (default)
    if not _HAS.get("pyqt6"):
        print("ERROR: PyQt6 not installed. Install: pip install PyQt6")
        print("Falling back to CLI mode...")
        agent = LuqiSandboxAgent(model=args.model)
        try:
            cli_mode(agent)
        finally:
            agent.cleanup()
        sys.exit(0)

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)  # Keep running with system tray
    window = LuqiSandboxGUI()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
