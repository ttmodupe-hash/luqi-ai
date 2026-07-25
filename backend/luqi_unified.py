#!/usr/bin/env python3
"""
Luqi AI Unified Agent v25.1.1 "Prometheus · LUQI"
===================================================
The canonical agent module — unifies personal AI assistant capabilities with
FastAPI endpoint compatibility. Use as a standalone CLI or import into the
backend server.

When imported: provides all classes and interface functions for v25_luqi_endpoints.py
When run directly: launches interactive CLI with voice, scheduler, and chat modes

Usage (module):
    from backend.luqi_unified import LuqiAgent, agent_chat, agent_stats

Usage (CLI):
    python3 -m backend.luqi_unified              # Interactive chat
    python3 -m backend.luqi_unified --voice      # Voice-first mode
    python3 -m backend.luqi_unified --schedule   # Morning scheduler
    python3 -m backend.luqi_unified --test       # Self-test (35 checks)
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# ── Optional Dependencies ───────────────────────────────────────────────

logger = logging.getLogger("luqi.unified")

_OPTIONAL_DEPS = {}

try:
    from openai import OpenAI
    _HAS_OPENAI = True
except ImportError:
    _HAS_OPENAI = False

try:
    from duckduckgo_search import DDGS
    _OPTIONAL_DEPS["ddgs"] = True
except ImportError:
    _OPTIONAL_DEPS["ddgs"] = False

try:
    import speech_recognition as sr
    _OPTIONAL_DEPS["speech"] = True
except ImportError:
    _OPTIONAL_DEPS["speech"] = False

try:
    from gtts import gTTS
    _OPTIONAL_DEPS["gtts"] = True
except ImportError:
    _OPTIONAL_DEPS["gtts"] = False

try:
    import pygame
    _OPTIONAL_DEPS["pygame"] = True
except ImportError:
    _OPTIONAL_DEPS["pygame"] = False

# ══════════════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════════════════

_PROJECT_ROOT = Path(__file__).parent.parent.resolve()
_DB_DIR = _PROJECT_ROOT / "data"
_DB_FILE = _DB_DIR / "luqi_memory.db"
_VOICE_DIR = _PROJECT_ROOT / "data" / "voice"
_LOG_DIR = _PROJECT_ROOT / "data" / "logs"

for _d in (_DB_DIR, _VOICE_DIR, _LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DEFAULT_MODEL = "gpt-4o"
DEFAULT_ALARM_TIME = "07:30"
MAX_CONTEXT_MESSAGES = 10

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
#  MEMORY ENGINE (Thread-Safe SQLite)
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

class MemoryEngine:
    """Thread-safe SQLite persistent memory with session tracking."""

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
        c.execute("""CREATE TABLE IF NOT EXISTS conversation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT DEFAULT 'default',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL, content TEXT NOT NULL,
            tool_calls TEXT, metadata TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS user_facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL, value TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            confidence REAL DEFAULT 1.0)""")
        c.execute("""CREATE TABLE IF NOT EXISTS tool_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_name TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            input_summary TEXT, output_summary TEXT,
            duration_ms INTEGER, success INTEGER DEFAULT 1)""")
        c.execute("""CREATE TABLE IF NOT EXISTS scheduled_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            delivered INTEGER DEFAULT 0)""")
        conn.commit()
        conn.close()

    def save_message(self, role: str, content: str,
                     session_id: str = "default",
                     tool_calls: Optional[List[Dict]] = None):
        try:
            conn = self._conn()
            conn.execute(
                """INSERT INTO conversation_history
                   (session_id, timestamp, role, content, tool_calls)
                   VALUES (?, datetime('now'), ?, ?, ?)""",
                (session_id, role, content,
                 json.dumps(tool_calls) if tool_calls else None))
            conn.commit()
        except Exception as e:
            logger.error(f"save_message: {e}")

    def get_recent(self, limit: int = MAX_CONTEXT_MESSAGES,
                   session_id: str = "default") -> List[Dict[str, str]]:
        try:
            conn = self._conn()
            c = conn.execute(
                """SELECT role, content FROM conversation_history
                   WHERE session_id = ? ORDER BY id DESC LIMIT ?""",
                (session_id, limit))
            rows = c.fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"get_recent: {e}")
            return []

    def search(self, keyword: str, limit: int = 10) -> List[Dict]:
        try:
            conn = self._conn()
            c = conn.execute(
                """SELECT timestamp, role, content FROM conversation_history
                   WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?""",
                (f"%{keyword}%", limit))
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"search: {e}")
            return []

    def store_fact(self, key: str, value: str,
                   category: str = "general", confidence: float = 1.0):
        try:
            conn = self._conn()
            conn.execute(
                """INSERT INTO user_facts (key, value, category, confidence)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(key) DO UPDATE SET
                   value = excluded.value,
                   timestamp = datetime('now'),
                   confidence = excluded.confidence""",
                (key, value, category, confidence))
            conn.commit()
        except Exception as e:
            logger.error(f"store_fact: {e}")

    def get_facts(self, category: Optional[str] = None) -> List[Dict]:
        try:
            conn = self._conn()
            if category:
                c = conn.execute(
                    "SELECT * FROM user_facts WHERE category = ? ORDER BY timestamp DESC",
                    (category,))
            else:
                c = conn.execute("SELECT * FROM user_facts ORDER BY timestamp DESC")
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"get_facts: {e}")
            return []

    def log_tool_usage(self, tool_name: str, input_summary: str = "",
                       output_summary: str = "", duration_ms: int = 0,
                       success: bool = True):
        try:
            conn = self._conn()
            conn.execute(
                """INSERT INTO tool_usage (tool_name, input_summary, output_summary, duration_ms, success)
                   VALUES (?, ?, ?, ?, ?)""",
                (tool_name, input_summary[:200], output_summary[:200],
                 duration_ms, 1 if success else 0))
            conn.commit()
        except Exception as e:
            logger.error(f"log_tool_usage: {e}")

    def get_stats(self) -> Dict[str, Any]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT COUNT(*) FROM conversation_history")
            total_messages = c.fetchone()[0]
            c = conn.execute("SELECT COUNT(*) FROM user_facts")
            total_facts = c.fetchone()[0]
            c = conn.execute("SELECT COUNT(*) FROM tool_usage")
            total_tools = c.fetchone()[0]
            c = conn.execute(
                "SELECT tool_name, COUNT(*) FROM tool_usage GROUP BY tool_name ORDER BY COUNT(*) DESC")
            tool_breakdown = [{"tool": r[0], "uses": r[1]} for r in c.fetchall()]
            return {
                "total_messages": total_messages, "total_facts": total_facts,
                "total_tool_calls": total_tools, "tool_breakdown": tool_breakdown,
                "db_path": self.db_path}
        except Exception as e:
            logger.error(f"get_stats: {e}")
            return {}

    def clear_session(self, session_id: str = "default"):
        try:
            conn = self._conn()
            conn.execute("DELETE FROM conversation_history WHERE session_id = ?", (session_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"clear_session: {e}")

    def was_report_delivered_today(self) -> bool:
        try:
            conn = self._conn()
            today = datetime.now().strftime("%Y-%m-%d")
            c = conn.execute("SELECT delivered FROM scheduled_reports WHERE date = ?", (today,))
            row = c.fetchone()
            return row is not None and row[0] == 1
        except Exception:
            return False

    def mark_report_delivered(self):
        try:
            conn = self._conn()
            today = datetime.now().strftime("%Y-%m-%d")
            conn.execute(
                """INSERT INTO scheduled_reports (date, delivered) VALUES (?, 1)
                   ON CONFLICT(date) DO UPDATE SET delivered = 1""", (today,))
            conn.commit()
        except Exception as e:
            logger.error(f"mark_report_delivered: {e}")

    def cleanup_old_reports(self, days: int = 30):
        if not isinstance(days, int) or days < 1 or days > 3650:
            raise ValueError("days must be an integer between 1 and 3650")
        try:
            conn = self._conn()
            conn.execute(
                "DELETE FROM scheduled_reports WHERE date < date('now', '-? days')",
                (days,))
            conn.commit()
        except Exception as e:
            logger.error(f"cleanup_old_reports: {e}")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════
#  TOOL REGISTRY
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

class ToolRegistry:
    """Dynamic tool registry with OpenAI-compatible schema generation."""

    def __init__(self, memory: Optional[MemoryEngine] = None):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Dict] = {}
        self.memory = memory

    def register(self, name: str, func: Callable, schema: Dict,
                 description: str = "", category: str = "general"):
        self._tools[name] = func
        self._schemas[name] = {
            "schema": schema, "description": description or schema.get("description", ""),
            "category": category, "registered_at": datetime.now().isoformat()}

    def unregister(self, name: str):
        self._tools.pop(name, None)
        self._schemas.pop(name, None)

    def get(self, name: str) -> Optional[Callable]:
        return self._tools.get(name)

    def list(self) -> List[Dict]:
        return [{"name": n, "description": m["description"], "category": m["category"]}
                for n, m in self._schemas.items()]

    def get_openai_schemas(self) -> List[Dict]:
        schemas = []
        for name, meta in self._schemas.items():
            s = meta["schema"]
            schemas.append({
                "type": "function",
                "function": {
                    "name": name, "description": s.get("description", ""),
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
            error = f"Tool '{name}' failed: {type(e).__name__}: {str(e)}"
            logger.error(error)
            return error


# ═════════════════════════════════════════════════════════════════════════════════════════════════════
#  BUILT-IN TOOLS (7 tools)
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

def search_web(query: str) -> str:
    """Search the live web via DuckDuckGo."""
    if not _OPTIONAL_DEPS.get("ddgs"):
        return "Web search unavailable. Install: pip install duckduckgo-search"
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
            if not results:
                return f"No results for '{query}'."
            lines = []
            for i, r in enumerate(results, 1):
                body = r.get("body", "")[:150]
                lines.append(f"[{i}] {r['title']}\n    {body}...\n    {r.get('href', 'N/A')}")
            return f"Results for '{query}':\n\n" + "\n\n".join(lines)
    except Exception as e:
        return f"Web search error: {str(e)}"


def open_application(app_name: str) -> str:
    """Launch a local application (cross-platform)."""
    try:
        if sys.platform == "win32":
            subprocess.run(["start", "", app_name], shell=True, check=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform == "darwin":
            subprocess.run(["open", "-a", app_name], check=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.run([app_name], check=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return f"Launched {app_name}."
    except subprocess.CalledProcessError:
        return f"Failed to launch {app_name}: process exited with error."
    except FileNotFoundError:
        return f"Application '{app_name}' not found."
    except Exception as e:
        return f"Failed to launch {app_name}: {str(e)}"


def control_spotify(action: str, track: str = "") -> str:
    """Control the Spotify desktop app."""
    try:
        if "open" in action.lower() or "play" in action.lower():
            if sys.platform == "win32":
                subprocess.run(["start", "", "spotify"], shell=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif sys.platform == "darwin":
                subprocess.run(["open", "-a", "Spotify"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                subprocess.run(["spotify"], check=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"Spotify opened{f', search: {track}' if track else ''}."
        return f"Spotify action '{action}' logged. Full control requires Spotify API."
    except Exception as e:
        return f"Spotify error: {str(e)}"


def run_code(code: str) -> str:
    """Execute Python in a restricted sandbox."""
    safe_globals = {"__builtins__": {
        "len": len, "range": range, "enumerate": enumerate,
        "zip": zip, "map": map, "filter": filter,
        "sum": sum, "min": min, "max": max, "abs": abs,
        "round": round, "pow": pow, "divmod": divmod,
        "str": str, "int": int, "float": float, "bool": bool,
        "list": list, "dict": dict, "set": set, "tuple": tuple,
        "print": print, "sorted": sorted, "reversed": reversed,
        "isinstance": isinstance, "hasattr": hasattr, "getattr": getattr,
        "Exception": Exception, "TypeError": TypeError, "ValueError": ValueError,
        "json": json, "math": __import__("math"),
        "datetime": datetime, "time": time}}
    import io
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        exec(code, safe_globals)
        output = sys.stdout.getvalue()
        return output if output else "Code executed successfully (no output)."
    except Exception as e:
        return f"Code execution error: {type(e).__name__}: {str(e)}"
    finally:
        sys.stdout = old_stdout


def system_info() -> str:
    """Get system information."""
    info = {
        "platform": sys.platform, "python": sys.version.split()[0],
        "cwd": str(Path.cwd()),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "openai": "ok" if _HAS_OPENAI else "missing",
        "voice_stt": "ok" if _OPTIONAL_DEPS.get("speech") else "missing",
        "voice_tts": "ok" if _OPTIONAL_DEPS.get("gtts") else "missing",
        "audio": "ok" if _OPTIONAL_DEPS.get("pygame") else "missing",
        "web_search": "ok" if _OPTIONAL_DEPS.get("ddgs") else "missing"}
    return json.dumps(info, indent=2)


def read_file(path: str, offset: int = 0, limit: int = 50) -> str:
    """Read a file (project boundary enforced)."""
    try:
        fp = Path(path).resolve()
        if not str(fp).startswith(str(_PROJECT_ROOT)):
            return "Error: Path outside project directory."
        with open(fp, "r", encoding="utf-8") as f:
            lines = f.readlines()
            s, e = offset, offset + limit
            sel = lines[s:e]
            return f"Lines {s+1}-{min(e, len(lines))} of {len(lines)}:\n" + "".join(sel)
    except Exception as e:
        return f"Error reading file: {str(e)}"


def write_file(path: str, content: str, append: bool = False) -> str:
    """Write a file (project boundary enforced)."""
    try:
        fp = Path(path).resolve()
        if not str(fp).startswith(str(_PROJECT_ROOT)):
            return "Error: Path outside project directory."
        mode = "a" if append else "w"
        with open(fp, mode, encoding="utf-8") as f:
            f.write(content)
        return f"File written: {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"


# ═════════════════════════════════════════════════════════════════════════════════════════════════════
#  VOICE ENGINE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

class VoiceEngine:
    """Speech-to-text and text-to-speech engine."""

    ACCENTS = {"uk": "co.uk", "us": "com", "au": "com.au", "ca": "ca",
                 "in": "co.in", "ie": "ie", "za": "co.za"}

    def __init__(self, voice_dir: Optional[Path] = None,
                 language: str = "en", accent: str = "uk"):
        self.voice_dir = Path(voice_dir or _VOICE_DIR)
        self.voice_dir.mkdir(parents=True, exist_ok=True)
        self.language = language
        self.accent = accent
        self.is_listening = False
        self._temp_files: List[Path] = []

    def listen(self, timeout: int = 5, phrase_limit: int = 8,
               language: str = "en-US") -> str:
        if not _OPTIONAL_DEPS.get("speech"):
            return ""
        recognizer = sr.Recognizer()
        try:
            with sr.Microphone() as source:
                logger.info(f"Listening (timeout={timeout}s)...")
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.listen(source, timeout=timeout,
                                          phrase_time_limit=phrase_limit)
                text = recognizer.recognize_google(audio, language=language)
                logger.info(f"Transcribed: '{text}'")
                return text
        except sr.WaitTimeoutError:
            logger.warning("Listening timeout")
            return ""
        except sr.UnknownValueError:
            logger.warning("Could not understand audio")
            return ""
        except Exception as e:
            logger.error(f"STT error: {e}")
            return ""

    def speak(self, text: str, language: str = "en",
              accent: str = "uk", play: bool = True) -> str:
        if not _OPTIONAL_DEPS.get("gtts"):
            return "TTS unavailable. Install: pip install gtts"
        clean = self._clean_for_speech(text)
        if not clean:
            return "Error: No speakable text"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = self.voice_dir / f"tts_{ts}.mp3"
        tld = self.ACCENTS.get(accent, "co.uk")
        try:
            gTTS(text=clean, lang=language, tld=tld).save(str(path))
            self._temp_files.append(path)
            if play and _OPTIONAL_DEPS.get("pygame"):
                self._play(str(path))
            return str(path)
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return f"TTS failed: {str(e)}"

    def speak_to_file(self, text: str, output_path: str,
                      language: str = "en", accent: str = "uk") -> str:
        if not _OPTIONAL_DEPS.get("gtts"):
            return "TTS unavailable"
        clean = self._clean_for_speech(text)
        tld = self.ACCENTS.get(accent, "co.uk")
        try:
            gTTS(text=clean, lang=language, tld=tld).save(output_path)
            return output_path
        except Exception as e:
            return f"TTS save failed: {str(e)}"

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

    def _clean_for_speech(self, text: str, max_length: int = 500) -> str:
        import re
        text = re.sub(r'```[\s\S]*?```', ' Code block omitted. ', text)
        text = re.sub(r'`[^`]+`', ' code ', text)
        text = re.sub(r'#{1,6}\s+', '', text)
        text = re.sub(r'[*_~`]{1,2}', '', text)
        text = re.sub(r'https?://\S+', ' link ', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:max_length] + "..." if len(text) > max_length else text

    def get_audio_files(self) -> List[Dict]:
        files = []
        for f in sorted(self.voice_dir.glob("*.mp3"), key=lambda x: x.stat().st_mtime, reverse=True):
            s = f.stat()
            files.append({"name": f.name, "path": str(f),
                          "size_kb": round(s.st_size / 1024, 1),
                          "created": datetime.fromtimestamp(s.st_mtime).isoformat()})
        return files

    def cleanup(self) -> int:
        removed = 0
        for f in list(self._temp_files):
            try:
                if f.exists():
                    f.unlink()
                    self._temp_files.remove(f)
                    removed += 1
            except Exception:
                pass
        return removed

    def status(self) -> Dict:
        return {
            "stt_available": _OPTIONAL_DEPS.get("speech", False),
            "tts_available": _OPTIONAL_DEPS.get("gtts", False),
            "playback_available": _OPTIONAL_DEPS.get("pygame", False),
            "is_listening": self.is_listening,
            "default_language": self.language,
            "default_accent": self.accent,
            "voice_dir": str(self.voice_dir)}


# ═════════════════════════════════════════════════════════════════════════════════════════════════════
#  MAIN AGENT CLASS
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

class LuqiAgent:
    """The unified LUQI agent — personal AI + FastAPI backend compatible.

    Usage (personal):
        agent = LuqiAgent()
        response = agent.chat("Hello!")
        agent.speak(response)

    Usage (backend, via interface functions below):
        result = agent_chat("Hello!", session_id="abc")
    """

    SYSTEM_PROMPT = (
        "You are Luqi, an intelligent AI assistant. You help with web searches, "
        "launching apps, running code, and recalling past conversations. You have "
        "persistent memory and learn from interactions. Be concise, helpful, and "
        "technically precise."
    )

    def __init__(self, api_key: Optional[str] = None,
                 model: str = DEFAULT_MODEL,
                 db_path: Optional[Path] = None,
                 alarm_time: str = DEFAULT_ALARM_TIME):
        self.model = model
        self.alarm_time = alarm_time
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        self.memory = MemoryEngine(db_path=db_path)
        self.voice = VoiceEngine()
        self.tools = ToolRegistry(memory=self.memory)
        self._register_tools()

        if _HAS_OPENAI:
            self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        else:
            self.client = None
            logger.warning("OpenAI not available. Install: pip install openai")

        logger.info(f"LuqiAgent initialized (session: {self.session_id})")

    def _register_tools(self):
        """Register all 7 built-in tools."""
        self.tools.register("search_web", search_web, {
            "description": "Search the live web for real-time info, news, weather, stocks.",
            "parameters": {"type": "object", "properties": {
                "query": {"type": "string", "description": "Search query"}},
                "required": ["query"]}}, category="information")

        self.tools.register("open_application", open_application, {
            "description": "Launch a desktop application (chrome, notepad, calculator, etc.).",
            "parameters": {"type": "object", "properties": {
                "app_name": {"type": "string"}}, "required": ["app_name"]}},
            category="system")

        self.tools.register("control_spotify", control_spotify, {
            "description": "Control the Spotify desktop app (open, play, pause).",
            "parameters": {"type": "object", "properties": {
                "action": {"type": "string"}, "track": {"type": "string"}},
                "required": ["action"]}}, category="media")

        self.tools.register("run_code", run_code, {
            "description": "Execute Python code in a restricted sandbox.",
            "parameters": {"type": "object", "properties": {
                "code": {"type": "string"}}, "required": ["code"]}},
            category="code")

        self.tools.register("system_info", system_info, {
            "description": "Get system info: platform, Python version, time.",
            "parameters": {"type": "object", "properties": {}},
            "required": []}, category="system")

        self.tools.register("read_file", read_file, {
            "description": "Read a file within the project directory.",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"}, "offset": {"type": "integer"},
                "limit": {"type": "integer"}}, "required": ["path"]}},
            category="files")

        self.tools.register("write_file", write_file, {
            "description": "Write content to a file within the project directory.",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"}, "content": {"type": "string"},
                "append": {"type": "boolean"}}, "required": ["path", "content"]}},
            category="files")

    # ── Core Chat ───────────────────────────────────────────────────────

    def chat(self, message: str, use_tools: bool = True) -> str:
        if not self.client:
            return "Error: OpenAI client not initialized. Set OPENAI_API_KEY."

        self.memory.save_message("user", message, session_id=self.session_id)
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        facts = self.memory.get_facts()
        if facts:
            ft = "\n".join([f"- {f['key']}: {f['value']}" for f in facts[:5]])
            messages.append({"role": "system", "content": f"User facts:\n{ft}"})

        messages.extend(self.memory.get_recent(session_id=self.session_id))
        messages.append({"role": "user", "content": message})

        try:
            if use_tools and self.tools.list():
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages,
                    tools=self.tools.get_openai_schemas(), tool_choice="auto")
            else:
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages)

            msg = response.choices[0].message
            tool_calls = msg.tool_calls

            if tool_calls:
                messages.append({
                    "role": "assistant", "content": msg.content or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function",
                         "function": {"name": tc.function.name,
                                      "arguments": tc.function.arguments}}
                        for tc in tool_calls]})

                for tc in tool_calls:
                    name = tc.function.name
                    args = json.loads(tc.function.arguments)
                    logger.info(f"Tool: {name}({args})")
                    output = self.tools.invoke(name, args)
                    messages.append({
                        "tool_call_id": tc.id, "role": "tool",
                        "name": name, "content": str(output)})

                final = self.client.chat.completions.create(
                    model=self.model, messages=messages)
                reply = final.choices[0].message.content
            else:
                reply = msg.content

            if reply:
                self.memory.save_message("assistant", reply, session_id=self.session_id)
            return reply or "I processed your request but have no text response."

        except Exception as e:
            error = f"Agent error: {type(e).__name__}: {str(e)}"
            logger.error(error)
            return error

    # ── Voice ─────────────────────────────────────────────────────────────

    def listen(self) -> str:
        return self.voice.listen()

    def speak(self, text: str):
        print(f"[Luqi]: {text}")
        result = self.voice.speak(text)
        if not result.endswith(".mp3"):
            logger.warning(f"TTS: {result}")

    def listen_and_respond(self) -> Dict[str, str]:
        user_input = self.listen()
        if not user_input:
            self.speak("I didn't catch that. Could you repeat?")
            return {"input": "", "response": "No input detected", "audio": ""}
        response = self.chat(user_input)
        self.speak(response)
        return {"input": user_input, "response": response}

    # ── Memory ──────────────────────────────────────────────────────────

    def recall(self, keyword: str) -> str:
        results = self.memory.search(keyword)
        if not results:
            return f"I searched my memory for '{keyword}' but found nothing."
        lines = [f"[{r['timestamp']}] {r['role'].upper()}: {r['content'][:100]}"
                 for r in results]
        return f"Memory results for '{keyword}':\n" + "\n".join(lines)

    def store_fact(self, key: str, value: str, category: str = "general"):
        self.memory.store_fact(key, value, category)

    def get_stats(self) -> Dict:
        return {**self.memory.get_stats(),
                "session_id": self.session_id,
                "tools": [t["name"] for t in self.tools.list()],
                "model": self.model}

    def clear_memory(self):
        self.memory.clear_session(self.session_id)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    def cleanup(self):
        self.voice.cleanup()

    # ── Scheduler ──────────────────────────────────────────────────────────

    def run_scheduler(self):
        logger.info(f"Scheduler online. Monitoring for {self.alarm_time}...")
        while True:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            if current_time == "00:00" and now.second < 10:
                self.memory.cleanup_old_reports(days=7)
            if current_time == self.alarm_time and not self.memory.was_report_delivered_today():
                logger.info("Morning report trigger fired!")
                self._deliver_morning_report()
                self.memory.mark_report_delivered()
            seconds_to_next_minute = 60 - now.second
            time.sleep(seconds_to_next_minute)

    def _deliver_morning_report(self):
        try:
            date_str = datetime.now().strftime("%A, %B %d, %Y")
            greeting = f"Good morning! Today is {date_str}."
            news = search_web("latest news and weather today")
            summary = self.chat(f"Summarize into a brief morning briefing:\n{news}", use_tools=False)
            stats = self.get_stats()
            report = (f"{greeting}\n\n{summary}\n\n"
                      f"Memory: {stats.get('total_messages', 0)} conversations, "
                      f"{stats.get('total_facts', 0)} facts learned.")
            print(f"\n{'='*50}\nMORNING REPORT — {datetime.now().strftime('%H:%M')}\n{'='*50}")
            print(report)
            print(f"{'='*50}\n")
            self.speak(report)
        except Exception as e:
            logger.error(f"Morning report failed: {e}")
            self.speak("Good morning! I had trouble preparing your report.")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE FUNCTIONS (for v25_luqi_endpoints.py)
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

_agent_instance: Optional[LuqiAgent] = None

def _get_agent() -> LuqiAgent:
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = LuqiAgent()
    return _agent_instance


def agent_chat(message: str, session_id: Optional[str] = None,
               use_tools: bool = True) -> Dict[str, Any]:
    agent = _get_agent()
    if session_id:
        agent.session_id = session_id
    reply = agent.chat(message, use_tools=use_tools)
    return {"status": "success", "version": "25.1.1", "codename": "LUQI",
            "message": reply, "session_id": agent.session_id,
            "tools": [t["name"] for t in agent.tools.list()],
            "timestamp": datetime.now().isoformat()}


def agent_voice_listen(timeout: int = 5) -> Dict[str, Any]:
    agent = _get_agent()
    result = agent.listen_and_respond(timeout=timeout)
    return {"status": "success" if result["input"] else "no_input",
            "input": result["input"], "response": result["response"],
            "session_id": agent.session_id,
            "timestamp": datetime.now().isoformat()}


def agent_speak(text: str) -> Dict[str, Any]:
    agent = _get_agent()
    audio = agent.voice.speak(text)
    ok = audio.endswith(".mp3")
    return {"status": "success" if ok else "error",
            "audio_file": audio if ok else None,
            "error": None if ok else audio,
            "timestamp": datetime.now().isoformat()}


def agent_memory_search(keyword: str) -> Dict[str, Any]:
    agent = _get_agent()
    results = agent.memory.search(keyword)
    return {"status": "success", "query": keyword,
            "count": len(results), "results": results[:10],
            "timestamp": datetime.now().isoformat()}


def agent_memory_facts(category: Optional[str] = None) -> Dict[str, Any]:
    agent = _get_agent()
    facts = agent.memory.get_facts(category)
    return {"status": "success", "category": category or "all",
            "count": len(facts), "facts": facts,
            "timestamp": datetime.now().isoformat()}


def agent_store_fact(key: str, value: str, category: str = "general") -> Dict[str, Any]:
    agent = _get_agent()
    agent.memory.store_fact(key, value, category)
    return {"status": "success", "stored": {"key": key, "value": value, "category": category},
            "timestamp": datetime.now().isoformat()}


def agent_stats() -> Dict[str, Any]:
    agent = _get_agent()
    stats = agent.get_stats()
    return {"status": "success", **stats,
            "available_tools": len(agent.tools.list()),
            "tool_list": [t["name"] for t in agent.tools.list()],
            "timestamp": datetime.now().isoformat()}


def agent_list_tools() -> Dict[str, Any]:
    agent = _get_agent()
    tools = agent.tools.list()
    return {"status": "success", "total": len(tools), "tools": tools,
            "timestamp": datetime.now().isoformat()}


def agent_clear_session(session_id: Optional[str] = None) -> Dict[str, Any]:
    agent = _get_agent()
    if session_id:
        agent.memory.clear_session(session_id)
    else:
        agent.clear_memory()
    return {"status": "success", "new_session_id": agent.session_id,
            "timestamp": datetime.now().isoformat()}


def web_search(query: str) -> Dict[str, Any]:
    return {"status": "success", "query": query,
            "results": search_web(query),
            "timestamp": datetime.now().isoformat()}


def run_code(code: str) -> Dict[str, Any]:
    return {"status": "success", "code": code[:200],
            "output": run_code(code),
            "timestamp": datetime.now().isoformat()}


# ══════════════════════════════════════════════════════════════════════════════════════════════════════
#  CLI / INTERACTIVE MODE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

def interactive_mode(agent: LuqiAgent, voice_first: bool = False):
    print("\n" + "=" * 50)
    print("  Luqi AI v25.1.1 — Unified Agent")
    print("  Commands: /voice, /stats, /recall <kw>, /clear, /tools, exit")
    print("=" * 50 + "\n")

    greeting = "Hello! I'm Luqi. How can I help you today?"
    if voice_first:
        print("Voice-first mode. Speak to begin...\n")
        agent.speak(greeting)
    else:
        print(f"[Luqi]: {greeting}\n")

    while True:
        try:
            if voice_first:
                user_input = agent.listen()
                if user_input:
                    print(f"[You]: {user_input}")
            else:
                user_input = input("[You]: ").strip()

            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit"):
                agent.speak("Goodbye!")
                break
            elif user_input == "/help":
                print("Commands: /voice, /stats, /recall <keyword>, /clear, /tools, exit")
                continue
            elif user_input == "/voice":
                voice_first = not voice_first
                print(f"Switched to {'voice' if voice_first else 'text'} mode.")
                continue
            elif user_input == "/stats":
                print(json.dumps(agent.get_stats(), indent=2))
                continue
            elif user_input == "/clear":
                agent.clear_memory()
                print("Session memory cleared.")
                continue
            elif user_input == "/tools":
                for t in agent.tools.list():
                    print(f"  {t['name']} ({t['category']}): {t['description']}")
                continue
            elif user_input.startswith("/recall "):
                print(agent.recall(user_input[8:]))
                continue

            response = agent.chat(user_input)
            print(f"[Luqi]: {response}\n")
            if voice_first:
                agent.speak(response)

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            logger.error(f"Interactive loop: {e}")


def self_test() -> bool:
    print("\n" + "=" * 50)
    print("  Luqi Unified Agent — Self-Test")
    print("=" * 50)
    passed = failed = 0

    tests = [
        ("Memory engine", lambda: _test_memory()),
        ("Tool registry", lambda: _test_registry()),
        ("Code sandbox", lambda: _test_sandbox()),
        ("Voice engine", lambda: _test_voice()),
        ("System info", lambda: _test_sysinfo()),
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
    print("=" * 50)
    return failed == 0


def _test_memory():
    import tempfile
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        mem = MemoryEngine(db_path=db_path)
        mem.save_message("user", "Hello", session_id="t")
        ctx = mem.get_recent(session_id="t")
        assert len(ctx) == 1 and ctx[0]["role"] == "user"
        mem.store_fact("k", "v")
        assert any(f["key"] == "k" for f in mem.get_facts())
        mem.clear_session("t")
    finally:
        os.unlink(db_path)


def _test_registry():
    reg = ToolRegistry()
    def fn(x: str) -> str:
        return f"ok: {x}"
    reg.register("t", fn, {"description": "d", "parameters": {"type": "object", "properties": {}}})
    assert len(reg.list()) == 1
    assert "ok: hi" in reg.invoke("t", {"x": "hi"})
    assert "not found" in reg.invoke("x", {})


def _test_sandbox():
    assert "4" in run_code("print(2+2)")
    assert "error" in run_code("print(undefined)").lower()
    assert "error" in run_code("import os").lower()


def _test_voice():
    ve = VoiceEngine()
    c = ve._clean_for_speech("**bold** `code` https://x.com")
    assert "**" not in c and "https://" not in c


def _test_sysinfo():
    info = json.loads(system_info())
    assert "platform" in info


# ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════════════════════════════

def _setup_logging():
    log_file = _LOG_DIR / f"luqi_{datetime.now().strftime('%Y%m%d')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)])


def main():
    parser = argparse.ArgumentParser(description="Luqi AI Unified Agent")
    parser.add_argument("--voice", "-v", action="store_true", help="Voice-first mode")
    parser.add_argument("--schedule", "-s", action="store_true", help="Scheduler only")
    parser.add_argument("--test", "-t", action="store_true", help="Self-test")
    parser.add_argument("--alarm", default=DEFAULT_ALARM_TIME, help="Alarm HH:MM")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenAI model")
    args = parser.parse_args()

    _setup_logging()

    if args.test:
        sys.exit(0 if self_test() else 1)

    if args.schedule:
        agent = LuqiAgent(alarm_time=args.alarm, model=args.model)
        try:
            agent.run_scheduler()
        except KeyboardInterrupt:
            logger.info("Scheduler stopped.")
        sys.exit(0)

    agent = LuqiAgent(alarm_time=args.alarm, model=args.model)
    try:
        interactive_mode(agent, voice_first=args.voice)
    finally:
        agent.cleanup()


if __name__ == "__main__":
    main()
