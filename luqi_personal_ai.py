#!/usr/bin/env python3
"""
Luqi AI Personal Assistant v25.1.1 "Prometheus"
================================================
Your intelligent desktop companion with persistent memory, web search,
voice processing, and autonomous tool execution.

Features:
- Long-term SQLite memory with session management
- Real-time web search via DuckDuckGo
- Voice recognition (STT) and text-to-speech (TTS)
- Application launcher with cross-platform support
- Code execution sandbox
- Morning report scheduler
- Spotify integration
- OpenAI GPT-4o with function calling

Usage:
    python3 luqi_personal_ai.py              # Interactive mode
    python3 luqi_personal_ai.py --voice      # Voice-first mode
    python3 luqi_personal_ai.py --schedule   # Background scheduler only
    python3 luqi_personal_ai.py --test       # Run self-test
"""

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

# ── Optional Dependencies ────────────────────────────────────────────────────

logger = logging.getLogger("luqi")

_REQUIRED = {}
_OPTIONAL = {}

try:
    from openai import OpenAI
    _REQUIRED["openai"] = True
except ImportError:
    _REQUIRED["openai"] = False
    logger.warning("openai not installed. Install: pip install openai")

try:
    from duckduckgo_search import DDGS
    _OPTIONAL["ddgs"] = True
except ImportError:
    _OPTIONAL["ddgs"] = False

try:
    import speech_recognition as sr
    _OPTIONAL["speech"] = True
except ImportError:
    _OPTIONAL["speech"] = False

try:
    from gtts import gTTS
    _OPTIONAL["gtts"] = True
except ImportError:
    _OPTIONAL["gtts"] = False

try:
    import pygame
    _OPTIONAL["pygame"] = True
except ImportError:
    _OPTIONAL["pygame"] = False

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).parent.resolve()
DB_FILE = PROJECT_ROOT / "data" / "luqi_personal.db"
VOICE_DIR = PROJECT_ROOT / "data" / "voice"
LOG_DIR = PROJECT_ROOT / "data" / "logs"

for d in (DB_FILE.parent, VOICE_DIR, LOG_DIR):
    d.mkdir(parents=True, exist_ok=True)

DEFAULT_MODEL = "gpt-4o"
DEFAULT_ALARM_TIME = "07:30"
MAX_CONTEXT_MESSAGES = 10

# ═══════════════════════════════════════════════════════════════════════════════
#  PERSISTENT MEMORY ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class MemoryEngine:
    """Thread-safe SQLite persistent memory with session tracking."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or DB_FILE)
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        """Initialize all database tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT DEFAULT 'default',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_calls TEXT,
                metadata TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                confidence REAL DEFAULT 1.0
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tool_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_name TEXT NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                input_summary TEXT,
                output_summary TEXT,
                duration_ms INTEGER,
                success INTEGER DEFAULT 1
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                delivered INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    def save_message(self, role: str, content: str,
                     session_id: str = "default",
                     tool_calls: Optional[List[Dict]] = None):
        """Save a conversation message."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO conversation_history
                   (session_id, timestamp, role, content, tool_calls)
                   VALUES (?, datetime('now'), ?, ?, ?)""",
                (session_id, role, content,
                 json.dumps(tool_calls) if tool_calls else None)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save message: {e}")

    def get_recent(self, limit: int = MAX_CONTEXT_MESSAGES,
                   session_id: str = "default") -> List[Dict[str, str]]:
        """Get recent conversation context (chronological order)."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT role, content FROM conversation_history
                   WHERE session_id = ?
                   ORDER BY id DESC LIMIT ?""",
                (session_id, limit)
            )
            rows = cursor.fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []

    def search(self, keyword: str, limit: int = 10) -> List[Dict]:
        """Search conversation history."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT timestamp, role, content FROM conversation_history
                   WHERE content LIKE ?
                   ORDER BY timestamp DESC LIMIT ?""",
                (f"%{keyword}%", limit)
            )
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def store_fact(self, key: str, value: str,
                   category: str = "general", confidence: float = 1.0):
        """Store a learned fact about the user."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_facts (key, value, category, confidence)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(key) DO UPDATE SET
                   value = excluded.value,
                   timestamp = datetime('now'),
                   confidence = excluded.confidence""",
                (key, value, category, confidence)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to store fact: {e}")

    def get_facts(self, category: Optional[str] = None) -> List[Dict]:
        """Retrieve stored facts."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            if category:
                cursor.execute(
                    "SELECT * FROM user_facts WHERE category = ? ORDER BY timestamp DESC",
                    (category,)
                )
            else:
                cursor.execute("SELECT * FROM user_facts ORDER BY timestamp DESC")
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get facts: {e}")
            return []

    def log_tool_usage(self, tool_name: str, input_summary: str = "",
                       output_summary: str = "", duration_ms: int = 0,
                       success: bool = True):
        """Log a tool execution."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO tool_usage
                   (tool_name, input_summary, output_summary, duration_ms, success)
                   VALUES (?, ?, ?, ?, ?)""",
                (tool_name, input_summary[:200], output_summary[:200],
                 duration_ms, 1 if success else 0)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to log tool usage: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM conversation_history")
            total_messages = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM user_facts")
            total_facts = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM tool_usage")
            total_tools = cursor.fetchone()[0]
            cursor.execute(
                "SELECT tool_name, COUNT(*) FROM tool_usage GROUP BY tool_name ORDER BY COUNT(*) DESC"
            )
            tool_breakdown = [{"tool": row[0], "uses": row[1]} for row in cursor.fetchall()]
            return {
                "total_messages": total_messages,
                "total_facts": total_facts,
                "total_tool_calls": total_tools,
                "tool_breakdown": tool_breakdown,
                "db_path": self.db_path
            }
        except Exception as e:
            logger.error(f"Stats error: {e}")
            return {}

    def clear_session(self, session_id: str = "default"):
        """Clear a conversation session."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM conversation_history WHERE session_id = ?",
                (session_id,)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to clear session: {e}")

    def was_report_delivered_today(self) -> bool:
        """Check if morning report was already delivered today."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            today = datetime.now().strftime("%Y-%m-%d")
            cursor.execute(
                "SELECT delivered FROM scheduled_reports WHERE date = ?",
                (today,)
            )
            row = cursor.fetchone()
            return row is not None and row[0] == 1
        except Exception:
            return False

    def mark_report_delivered(self):
        """Mark morning report as delivered for today."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            today = datetime.now().strftime("%Y-%m-%d")
            cursor.execute(
                """INSERT INTO scheduled_reports (date, delivered)
                   VALUES (?, 1)
                   ON CONFLICT(date) DO UPDATE SET delivered = 1""",
                (today,)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to mark report: {e}")

    def cleanup_old_reports(self, days: int = 30):
        """Remove report tracking older than N days."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM scheduled_reports WHERE date < date('now', '-{} days')".format(days)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

class ToolRegistry:
    """Dynamic tool registry with OpenAI-compatible schema generation."""

    def __init__(self, memory: Optional[MemoryEngine] = None):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Dict] = {}
        self.memory = memory

    def register(self, name: str, func: Callable, schema: Dict,
                 description: str = "", category: str = "general"):
        """Register a tool."""
        self._tools[name] = func
        self._schemas[name] = {
            "func": func,
            "schema": schema,
            "description": description or schema.get("description", ""),
            "category": category,
            "registered_at": datetime.now().isoformat()
        }

    def get(self, name: str) -> Optional[Callable]:
        return self._tools.get(name)

    def list(self) -> List[Dict]:
        return [
            {
                "name": name,
                "description": meta["description"],
                "category": meta["category"]
            }
            for name, meta in self._schemas.items()
        ]

    def get_openai_schemas(self) -> List[Dict]:
        """Format schemas for OpenAI function calling."""
        schemas = []
        for name, meta in self._schemas.items():
            schema = meta["schema"]
            schemas.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": schema.get("description", ""),
                    "parameters": schema.get("parameters", {"type": "object", "properties": {}})
                }
            })
        return schemas

    def invoke(self, name: str, arguments: Dict) -> str:
        """Invoke a tool by name."""
        func = self._tools.get(name)
        if not func:
            return f"Error: Tool '{name}' not found."

        start = time.time()
        try:
            result = func(**arguments)
            duration = int((time.time() - start) * 1000)

            if self.memory:
                self.memory.log_tool_usage(
                    tool_name=name,
                    input_summary=str(arguments)[:200],
                    output_summary=str(result)[:200],
                    duration_ms=duration,
                    success=True
                )

            return str(result)
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            if self.memory:
                self.memory.log_tool_usage(
                    tool_name=name,
                    input_summary=str(arguments)[:200],
                    output_summary=str(e)[:200],
                    duration_ms=duration,
                    success=False
                )
            error_msg = f"Tool '{name}' failed: {str(e)}"
            logger.error(error_msg)
            return error_msg


# ═══════════════════════════════════════════════════════════════════════════════
#  BUILT-IN TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def search_web(query: str) -> str:
    """Search the live web for real-time information."""
    if not _OPTIONAL.get("ddgs"):
        return "Web search unavailable. Install: pip install duckduckgo-search"
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
            if not results:
                return f"No results found for '{query}'."
            formatted = []
            for i, r in enumerate(results, 1):
                body = r.get("body", "")[:150]
                href = r.get("href", "N/A")
                formatted.append(f"[{i}] {r['title']}\n    {body}...\n    {href}")
            return f"Web search results for '{query}':\n\n" + "\n\n".join(formatted)
    except Exception as e:
        return f"Web search error: {str(e)}"


def open_application(app_name: str) -> str:
    """Launch a local application safely."""
    try:
        platform = sys.platform
        if platform == "win32":
            subprocess.run(["start", "", app_name], shell=True, check=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif platform == "darwin":
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
    """Control Spotify desktop app."""
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
            if track:
                return f"Spotify opened. Search for '{track}' in the app."
            return "Spotify launched."
        return f"Spotify action '{action}' logged. Full control requires Spotify API."
    except Exception as e:
        return f"Spotify error: {str(e)}"


def run_code(code: str) -> str:
    """Execute Python in a restricted sandbox."""
    safe_globals = {
        "__builtins__": {
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
            "datetime": datetime, "time": time,
        }
    }

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
        "platform": sys.platform,
        "python": sys.version.split()[0],
        "cwd": str(Path.cwd()),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "voice_stt": "available" if _OPTIONAL.get("speech") else "unavailable",
        "voice_tts": "available" if _OPTIONAL.get("gtts") else "unavailable",
        "audio": "available" if _OPTIONAL.get("pygame") else "unavailable",
        "web_search": "available" if _OPTIONAL.get("ddgs") else "unavailable",
    }
    return json.dumps(info, indent=2)


def read_file(path: str, offset: int = 0, limit: int = 50) -> str:
    """Read a file within the project directory."""
    try:
        file_path = Path(path).resolve()
        if not str(file_path).startswith(str(PROJECT_ROOT)):
            return "Error: Path is outside the project directory."
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            start = offset
            end = offset + limit
            selected = lines[start:end]
            return f"Lines {start+1}-{min(end, len(lines))} of {len(lines)}:\n" + "".join(selected)
    except Exception as e:
        return f"Error reading file: {str(e)}"


def write_file(path: str, content: str, append: bool = False) -> str:
    """Write content to a file within the project directory."""
    try:
        file_path = Path(path).resolve()
        if not str(file_path).startswith(str(PROJECT_ROOT)):
            return "Error: Path is outside the project directory."
        mode = "a" if append else "w"
        with open(file_path, mode, encoding="utf-8") as f:
            f.write(content)
        return f"File written: {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
#  VOICE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class VoiceEngine:
    """Speech-to-text and text-to-speech engine."""

    ACCENTS = {
        "uk": "co.uk", "us": "com", "au": "com.au",
        "ca": "ca", "in": "co.in", "ie": "ie", "za": "co.za"
    }

    def __init__(self, voice_dir: Optional[Path] = None,
                 language: str = "en", accent: str = "uk"):
        self.voice_dir = Path(voice_dir or VOICE_DIR)
        self.voice_dir.mkdir(parents=True, exist_ok=True)
        self.language = language
        self.accent = accent
        self.is_listening = False
        self._temp_files: List[Path] = []

    def listen(self, timeout: int = 5, phrase_limit: int = 8,
               language: str = "en-US") -> str:
        """Capture microphone input and transcribe."""
        if not _OPTIONAL.get("speech"):
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
            logger.warning("Listening timeout - no speech detected")
            return ""
        except sr.UnknownValueError:
            logger.warning("Could not understand audio")
            return ""
        except Exception as e:
            logger.error(f"STT error: {e}")
            return ""

    def speak(self, text: str, language: str = "en",
              accent: str = "uk", play: bool = True) -> str:
        """Convert text to speech and optionally play it."""
        if not _OPTIONAL.get("gtts"):
            return "TTS unavailable. Install: pip install gtts"

        clean = self._clean_for_speech(text)
        if not clean:
            return "Error: No speakable text after cleaning"

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_path = self.voice_dir / f"tts_{timestamp}.mp3"
        tld = self.ACCENTS.get(accent, "co.uk")

        try:
            tts = gTTS(text=clean, lang=language, tld=tld)
            tts.save(str(audio_path))
            self._temp_files.append(audio_path)

            if play and _OPTIONAL.get("pygame"):
                self._play(str(audio_path))

            return str(audio_path)
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return f"TTS failed: {str(e)}"

    def _play(self, file_path: str):
        """Play audio via pygame."""
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            pygame.mixer.quit()
        except Exception as e:
            logger.error(f"Audio playback error: {e}")

    def _clean_for_speech(self, text: str, max_length: int = 500) -> str:
        """Clean text for speech (remove markdown, code, URLs)."""
        import re
        text = re.sub(r'```[\s\S]*?```', ' Code block omitted. ', text)
        text = re.sub(r'`[^`]+`', ' code ', text)
        text = re.sub(r'#{1,6}\s+', '', text)
        text = re.sub(r'[*_~`]{1,2}', '', text)
        text = re.sub(r'https?://\S+', ' link ', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) > max_length:
            text = text[:max_length] + "..."
        return text

    def cleanup(self) -> int:
        """Remove temporary audio files. Returns count removed."""
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


# ═══════════════════════════════════════════════════════════════════════════════
#  LUQI PERSONAL AI
# ═══════════════════════════════════════════════════════════════════════════════

class LuqiPersonalAI:
    """Your personal AI assistant — the main entry point.

    Usage:
        ai = LuqiPersonalAI()
        response = ai.chat("What's the weather today?")
        ai.speak(response)
    """

    SYSTEM_PROMPT = (
        "You are Luqi, an intelligent and polished AI personal assistant. "
        "You help the user with web searches, launching apps, running code, "
        "and recalling past conversations. You have persistent memory and "
        "learn from interactions. Be concise, helpful, and technically precise. "
        "Address the user respectfully."
    )

    def __init__(self, api_key: Optional[str] = None,
                 model: str = DEFAULT_MODEL,
                 db_path: Optional[Path] = None,
                 alarm_time: str = DEFAULT_ALARM_TIME):
        self.model = model
        self.alarm_time = alarm_time
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Initialize core components
        self.memory = MemoryEngine(db_path=db_path)
        self.voice = VoiceEngine()
        self.tools = ToolRegistry(memory=self.memory)
        self._register_tools()

        # Initialize OpenAI client
        if _REQUIRED.get("openai"):
            self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        else:
            self.client = None
            logger.warning("OpenAI client not available. Install: pip install openai")

        logger.info(f"Luqi AI initialized (session: {self.session_id})")

    def _register_tools(self):
        """Register all built-in tools."""
        self.tools.register("search_web", search_web, {
            "description": "Search the live web for real-time info, news, weather, stocks.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query"}},
                "required": ["query"]
            }
        }, category="information")

        self.tools.register("open_application", open_application, {
            "description": "Launch a desktop application (e.g., chrome, notepad, calculator).",
            "parameters": {
                "type": "object",
                "properties": {"app_name": {"type": "string"}},
                "required": ["app_name"]
            }
        }, category="system")

        self.tools.register("control_spotify", control_spotify, {
            "description": "Control the Spotify desktop app (open, play, pause).",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "track": {"type": "string"}
                },
                "required": ["action"]
            }
        }, category="media")

        self.tools.register("run_code", run_code, {
            "description": "Execute Python code in a restricted sandbox.",
            "parameters": {
                "type": "object",
                "properties": {"code": {"type": "string"}},
                "required": ["code"]
            }
        }, category="code")

        self.tools.register("system_info", system_info, {
            "description": "Get system info: platform, Python version, time.",
            "parameters": {"type": "object", "properties": {}},
            "required": []
        }, category="system")

        self.tools.register("read_file", read_file, {
            "description": "Read a file within the project directory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "offset": {"type": "integer"},
                    "limit": {"type": "integer"}
                },
                "required": ["path"]
            }
        }, category="files")

        self.tools.register("write_file", write_file, {
            "description": "Write content to a file within the project directory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                    "append": {"type": "boolean"}
                },
                "required": ["path", "content"]
            }
        }, category="files")

    # ── Core Chat ──────────────────────────────────────────────────────

    def chat(self, message: str, use_tools: bool = True) -> str:
        """Process a message and return the AI response."""
        if not self.client:
            return "Error: OpenAI client not initialized. Set OPENAI_API_KEY."

        self.memory.save_message("user", message, session_id=self.session_id)

        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        # Include user facts
        facts = self.memory.get_facts()
        if facts:
            fact_text = "\n".join([f"- {f['key']}: {f['value']}" for f in facts[:5]])
            messages.append({"role": "system", "content": f"User facts:\n{fact_text}"})

        # Include recent context
        messages.extend(self.memory.get_recent(session_id=self.session_id))
        messages.append({"role": "user", "content": message})

        try:
            if use_tools and self.tools.list():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=self.tools.get_openai_schemas(),
                    tool_choice="auto"
                )
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )

            msg = response.choices[0].message
            tool_calls = msg.tool_calls

            if tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function",
                         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                        for tc in tool_calls
                    ]
                })

                for tc in tool_calls:
                    name = tc.function.name
                    args = json.loads(tc.function.arguments)
                    logger.info(f"Executing tool: {name}({args})")
                    output = self.tools.invoke(name, args)
                    messages.append({
                        "tool_call_id": tc.id,
                        "role": "tool",
                        "name": name,
                        "content": str(output)
                    })

                final = self.client.chat.completions.create(
                    model=self.model, messages=messages
                )
                reply = final.choices[0].message.content
            else:
                reply = msg.content

            if reply:
                self.memory.save_message("assistant", reply, session_id=self.session_id)

            return reply or "I processed your request but have no text response."

        except Exception as e:
            error = f"Agent error: {str(e)}"
            logger.error(error)
            return error

    # ── Voice Interface ────────────────────────────────────────────────

    def listen(self) -> str:
        """Listen for voice input and return transcribed text."""
        return self.voice.listen()

    def speak(self, text: str):
        """Convert text to speech and play it."""
        print(f"[Luqi]: {text}")
        result = self.voice.speak(text)
        if not result.endswith(".mp3"):
            logger.warning(f"TTS: {result}")

    def listen_and_respond(self) -> Dict[str, str]:
        """Listen, process, and speak the response."""
        user_input = self.listen()
        if not user_input:
            self.speak("I didn't catch that. Could you repeat?")
            return {"input": "", "response": "No input detected", "audio": ""}

        response = self.chat(user_input)
        self.speak(response)
        return {"input": user_input, "response": response}

    # ── Memory Management ──────────────────────────────────────────────

    def recall(self, keyword: str) -> str:
        """Search past conversations."""
        results = self.memory.search(keyword)
        if not results:
            return f"I searched my memory for '{keyword}' but found nothing."
        lines = [f"[{r['timestamp']}] {r['role'].upper()}: {r['content'][:100]}"
                 for r in results]
        return f"Memory results for '{keyword}':\n" + "\n".join(lines)

    def store_fact(self, key: str, value: str, category: str = "general"):
        """Store a fact about the user."""
        self.memory.store_fact(key, value, category)

    def get_stats(self) -> Dict:
        """Get agent statistics."""
        return {
            **self.memory.get_stats(),
            "session_id": self.session_id,
            "tools": [t["name"] for t in self.tools.list()],
            "model": self.model
        }

    def clear_memory(self):
        """Clear current session memory."""
        self.memory.clear_session(self.session_id)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    def cleanup(self):
        """Clean up resources."""
        self.voice.cleanup()

    # ── Morning Report Scheduler ───────────────────────────────────────

    def run_scheduler(self):
        """Run the background morning report scheduler."""
        logger.info(f"Scheduler online. Monitoring for {self.alarm_time}...")

        while True:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            current_second = now.second

            # Reset at midnight
            if current_time == "00:00" and current_second < 10:
                logger.info("Midnight reset — clearing report flag")
                self.memory.cleanup_old_reports(days=7)

            # Check alarm time (within the first minute to avoid double-trigger)
            if current_time == self.alarm_time and not self.memory.was_report_delivered_today():
                logger.info("Morning report trigger fired!")
                self._deliver_morning_report()
                self.memory.mark_report_delivered()

            # Sleep to next minute boundary for efficiency
            seconds_to_next_minute = 60 - now.second
            time.sleep(seconds_to_next_minute)

    def _deliver_morning_report(self):
        """Generate and deliver the morning report."""
        try:
            date_str = datetime.now().strftime("%A, %B %d, %Y")
            greeting = f"Good morning! Today is {date_str}."

            # Get weather and news
            news = search_web("latest news and weather today")
            news_summary = self.chat(
                f"Summarize this into a brief morning briefing (2-3 sentences):\n{news}",
                use_tools=False
            )

            # Get stats
            stats = self.get_stats()
            messages = stats.get("total_messages", 0)
            facts = stats.get("total_facts", 0)

            report = (
                f"{greeting} Here's your morning briefing.\n\n"
                f"{news_summary}\n\n"
                f"Memory stats: {messages} conversations, {facts} facts learned."
            )

            print(f"\n{'='*50}")
            print(f"MORNING REPORT — {datetime.now().strftime('%H:%M')}")
            print(f"{'='*50}")
            print(report)
            print(f"{'='*50}\n")

            self.speak(report)

        except Exception as e:
            logger.error(f"Morning report failed: {e}")
            self.speak("Good morning! I encountered an issue preparing your report.")


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERACTIVE CLI
# ═══════════════════════════════════════════════════════════════════════════════

def interactive_mode(ai: LuqiPersonalAI, voice_first: bool = False):
    """Run the interactive chat loop."""
    print("\n" + "=" * 50)
    print("  Luqi AI Personal Assistant v25.1.1")
    print("  Type 'exit', 'quit', or press Ctrl+C to leave")
    print("  Commands: /voice, /stats, /recall <keyword>, /clear, /help")
    print("=" * 50 + "\n")

    if voice_first:
        print("Voice-first mode. Speak to begin...\n")
        ai.speak("Hello! I'm Luqi. How can I help you today?")
    else:
        print("[Luqi]: Hello! I'm Luqi. How can I help you today?\n")

    while True:
        try:
            if voice_first:
                user_input = ai.listen()
                if user_input:
                    print(f"[You]: {user_input}")
            else:
                user_input = input("[You]: ").strip()

            if not user_input:
                continue

            # Commands
            if user_input.lower() in ("exit", "quit"):
                ai.speak("Goodbye!")
                break
            elif user_input == "/help":
                print("Commands: /voice (toggle voice), /stats, /recall <keyword>, /clear, /tools, exit")
                continue
            elif user_input == "/voice":
                voice_first = not voice_first
                mode = "voice" if voice_first else "text"
                print(f"Switched to {mode} mode.")
                continue
            elif user_input == "/stats":
                stats = ai.get_stats()
                print(json.dumps(stats, indent=2))
                continue
            elif user_input == "/clear":
                ai.clear_memory()
                print("Session memory cleared.")
                continue
            elif user_input == "/tools":
                for t in ai.tools.list():
                    print(f"  {t['name']} ({t['category']}): {t['description']}")
                continue
            elif user_input.startswith("/recall "):
                keyword = user_input[8:]
                print(ai.recall(keyword))
                continue

            # Normal chat
            response = ai.chat(user_input)
            print(f"[Luqi]: {response}\n")

            if voice_first:
                ai.speak(response)

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            logger.error(f"Interactive loop error: {e}")
            print(f"Error: {e}")


def self_test() -> bool:
    """Run a quick self-test."""
    print("\n" + "=" * 50)
    print("  Luqi AI Self-Test")
    print("=" * 50)

    passed = 0
    failed = 0

    # Test 1: Memory engine
    try:
        mem = MemoryEngine()
        mem.save_message("user", "Hello", session_id="test")
        ctx = mem.get_recent(session_id="test")
        assert len(ctx) == 1
        mem.store_fact("test_key", "test_value")
        facts = mem.get_facts()
        assert any(f["key"] == "test_key" for f in facts)
        mem.clear_session("test")
        print("  [PASS] Memory engine")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Memory engine: {e}")
        failed += 1

    # Test 2: Tool registry
    try:
        reg = ToolRegistry()
        def dummy_tool(x: str) -> str:
            return f"ok: {x}"
        reg.register("dummy", dummy_tool, {
            "description": "A test tool",
            "parameters": {"type": "object", "properties": {"x": {"type": "string"}}, "required": ["x"]}
        })
        result = reg.invoke("dummy", {"x": "hello"})
        assert "ok: hello" in result
        print("  [PASS] Tool registry")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Tool registry: {e}")
        failed += 1

    # Test 3: Code sandbox
    try:
        result = run_code("print(2 + 2)")
        assert "4" in result
        result_err = run_code("print(undefined)")
        assert "error" in result_err.lower()
        print("  [PASS] Code sandbox")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Code sandbox: {e}")
        failed += 1

    # Test 4: Voice engine
    try:
        ve = VoiceEngine()
        clean = ve._clean_for_speech("Hello **world**! `code` https://test.com")
        assert "**" not in clean
        assert "https://" not in clean
        print("  [PASS] Voice engine")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] Voice engine: {e}")
        failed += 1

    # Test 5: System info
    try:
        info = json.loads(system_info())
        assert "platform" in info
        print("  [PASS] System info")
        passed += 1
    except Exception as e:
        print(f"  [FAIL] System info: {e}")
        failed += 1

    print(f"\n  {passed} passed, {failed} failed")
    print(f"  Status: {'HEALTHY' if failed == 0 else 'DEGRADED'}")
    print("=" * 50)
    return failed == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """Configure logging."""
    log_file = LOG_DIR / f"luqi_{datetime.now().strftime('%Y%m%d')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )


def main():
    parser = argparse.ArgumentParser(description="Luqi AI Personal Assistant")
    parser.add_argument("--voice", "-v", action="store_true", help="Voice-first mode")
    parser.add_argument("--schedule", "-s", action="store_true", help="Run scheduler only")
    parser.add_argument("--test", "-t", action="store_true", help="Run self-test")
    parser.add_argument("--alarm", default=DEFAULT_ALARM_TIME, help="Alarm time (HH:MM)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenAI model")
    args = parser.parse_args()

    setup_logging()

    if args.test:
        success = self_test()
        sys.exit(0 if success else 1)

    if args.schedule:
        ai = LuqiPersonalAI(alarm_time=args.alarm, model=args.model)
        try:
            ai.run_scheduler()
        except KeyboardInterrupt:
            logger.info("Scheduler stopped.")
        sys.exit(0)

    # Interactive mode (default)
    ai = LuqiPersonalAI(alarm_time=args.alarm, model=args.model)
    try:
        interactive_mode(ai, voice_first=args.voice)
    finally:
        ai.cleanup()


if __name__ == "__main__":
    main()