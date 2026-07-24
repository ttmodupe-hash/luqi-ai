#!/usr/bin/env python3
"""
Luqi AI Personal Assistant v25.1.0 "LUQI"
===========================================
A comprehensive personal AI assistant module with persistent memory, web search,
voice interaction, application control, and intelligent conversation.

Usage:
    from luqi_personal_ai import PersonalAI
    ai = PersonalAI()
    ai.chat("What's the weather today?")
"""

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

logger = logging.getLogger("luqi.personal")

_OPTIONAL = {}

try:
    from openai import OpenAI
    _OPTIONAL["openai"] = True
except ImportError:
    _OPTIONAL["openai"] = False

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

_PROJECT_ROOT = Path(__file__).parent.resolve()
_DATA_DIR = _PROJECT_ROOT / "data"
_DB_FILE = _DATA_DIR / "personal_ai.db"
_VOICE_DIR = _DATA_DIR / "voice"
_LOG_DIR = _DATA_DIR / "logs"

for _d in (_DATA_DIR, _VOICE_DIR, _LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DEFAULT_MODEL = "gpt-4o"
MAX_CONTEXT = 10

# ═══════════════════════════════════════════════════════════════════════════════
#  MEMORY ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalMemory:
    """Persistent memory for the personal AI assistant."""

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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT DEFAULT 'default',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL, content TEXT NOT NULL)""")
        c.execute("""CREATE TABLE IF NOT EXISTS facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL, value TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            remind_at TEXT NOT NULL,
            created TEXT DEFAULT CURRENT_TIMESTAMP,
            triggered INTEGER DEFAULT 0)""")
        conn.commit()
        conn.close()

    def save(self, role: str, content: str, session_id: str = "default"):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)",
                        (session_id, role, content))
            conn.commit()
        except Exception as e:
            logger.error(f"Save error: {e}")

    def get_recent(self, limit: int = MAX_CONTEXT, session_id: str = "default") -> List[Dict[str, str]]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT role, content FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?",
                           (session_id, limit))
            rows = c.fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"Get recent error: {e}")
            return []

    def store_fact(self, key: str, value: str, category: str = "general"):
        try:
            conn = self._conn()
            conn.execute("""INSERT INTO facts (key, value, category) VALUES (?, ?, ?)
                           ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                           timestamp = datetime('now')""", (key, value, category))
            conn.commit()
        except Exception as e:
            logger.error(f"Store fact error: {e}")

    def get_facts(self, category: Optional[str] = None) -> List[Dict]:
        try:
            conn = self._conn()
            if category:
                c = conn.execute("SELECT * FROM facts WHERE category = ? ORDER BY timestamp DESC", (category,))
            else:
                c = conn.execute("SELECT * FROM facts ORDER BY timestamp DESC")
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"Get facts error: {e}")
            return []

    def add_reminder(self, text: str, remind_at: str):
        try:
            conn = self._conn()
            conn.execute("INSERT INTO reminders (text, remind_at) VALUES (?, ?)", (text, remind_at))
            conn.commit()
        except Exception as e:
            logger.error(f"Add reminder error: {e}")

    def get_pending_reminders(self) -> List[Dict]:
        try:
            conn = self._conn()
            c = conn.execute("""SELECT * FROM reminders 
                               WHERE triggered = 0 AND remind_at <= datetime('now')
                               ORDER BY remind_at""")
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"Get reminders error: {e}")
            return []

    def mark_reminder_triggered(self, reminder_id: int):
        try:
            conn = self._conn()
            conn.execute("UPDATE reminders SET triggered = 1 WHERE id = ?", (reminder_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"Mark reminder error: {e}")

    def search(self, keyword: str, limit: int = 10) -> List[Dict]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT * FROM conversations WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?",
                           (f"%{keyword}%", limit))
            return [dict(r) for r in c.fetchall()]
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        try:
            conn = self._conn()
            c = conn.execute("SELECT COUNT(*) FROM conversations")
            total_messages = c.fetchone()[0]
            c = conn.execute("SELECT COUNT(*) FROM facts")
            total_facts = c.fetchone()[0]
            c = conn.execute("SELECT COUNT(*) FROM reminders")
            total_reminders = c.fetchone()[0]
            return {"total_messages": total_messages, "total_facts": total_facts,
                    "total_reminders": total_reminders}
        except Exception as e:
            logger.error(f"Stats error: {e}")
            return {}

    def clear(self, session_id: str = "default"):
        try:
            conn = self._conn()
            conn.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"Clear error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def search_web(query: str) -> str:
    """Search the web."""
    if not _OPTIONAL.get("ddgs"):
        return "Web search unavailable. Install: pip install duckduckgo-search"
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
            if not results:
                return f"No results for '{query}'."
            lines = [f"[{i+1}] {r['title']}\n{r['body'][:150]}..." for i, r in enumerate(results)]
            return f"Results for '{query}':\n\n" + "\n\n".join(lines)
    except Exception as e:
        return f"Search error: {str(e)}"


def open_app(app_name: str) -> str:
    """Open a local application."""
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
    except Exception as e:
        return f"Failed to launch {app_name}: {str(e)}"


def sys_info() -> str:
    """Get system info."""
    return json.dumps({
        "platform": sys.platform, "python": sys.version.split()[0],
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cwd": str(Path.cwd())}, indent=2)


def run_python(code: str) -> str:
    """Run Python code safely."""
    safe = {"__builtins__": {
        "len": len, "range": range, "enumerate": enumerate, "zip": zip,
        "map": map, "filter": filter, "sum": sum, "min": min, "max": max,
        "abs": abs, "round": round, "pow": pow, "divmod": divmod,
        "str": str, "int": int, "float": float, "bool": bool,
        "list": list, "dict": dict, "set": set, "tuple": tuple,
        "print": print, "sorted": sorted, "isinstance": isinstance,
        "hasattr": hasattr, "getattr": getattr, "Exception": Exception,
        "json": json, "math": __import__("math"), "datetime": datetime, "time": time}}
    import io
    old = sys.stdout
    sys.stdout = io.StringIO()
    try:
        exec(code, safe)
        out = sys.stdout.getvalue()
        return out if out else "Code executed successfully."
    except Exception as e:
        return f"Error: {type(e).__name__}: {str(e)}"
    finally:
        sys.stdout = old


# ═══════════════════════════════════════════════════════════════════════════════
#  VOICE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class VoiceEngine:
    """Voice processing engine."""

    ACCENTS = {"uk": "co.uk", "us": "com", "au": "com.au", "ca": "ca",
                 "in": "co.in", "ie": "ie", "za": "co.za"}

    def __init__(self, voice_dir: Optional[Path] = None):
        self.voice_dir = Path(voice_dir or _VOICE_DIR)
        self.voice_dir.mkdir(parents=True, exist_ok=True)
        self._temp: List[Path] = []

    def listen(self, timeout: int = 5, phrase: int = 8) -> str:
        if not _OPTIONAL.get("speech"):
            return ""
        r = sr.Recognizer()
        try:
            with sr.Microphone() as src:
                r.adjust_for_ambient_noise(src, duration=0.5)
                audio = r.listen(src, timeout=timeout, phrase_time_limit=phrase)
                return r.recognize_google(audio)
        except Exception:
            return ""

    def speak(self, text: str, lang: str = "en", accent: str = "uk") -> str:
        if not _OPTIONAL.get("gtts"):
            return "TTS unavailable. Install: pip install gtts"
        clean = self._clean(text)
        if not clean:
            return "No speakable text"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = self.voice_dir / f"tts_{ts}.mp3"
        tld = self.ACCENTS.get(accent, "co.uk")
        try:
            gTTS(text=clean, lang=lang, tld=tld).save(str(path))
            self._temp.append(path)
            if _OPTIONAL.get("pygame"):
                self._play(str(path))
            return str(path)
        except Exception as e:
            return f"TTS failed: {str(e)}"

    def _play(self, fp: str):
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            pygame.mixer.music.load(fp)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            pygame.mixer.quit()
        except Exception:
            pass

    def _clean(self, text: str) -> str:
        import re
        text = re.sub(r'```[\s\S]*?```', ' code ', text)
        text = re.sub(r'`[^`]+`', ' code ', text)
        text = re.sub(r'#{1,6}\s+', '', text)
        text = re.sub(r'[*_~`]', '', text)
        text = re.sub(r'https?://\S+', ' link ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:500] + "..." if len(text) > 500 else text

    def cleanup(self):
        for f in list(self._temp):
            try:
                if f.exists():
                    f.unlink()
                    self._temp.remove(f)
            except Exception:
                pass


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN PERSONAL AI CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalAI:
    """Luqi AI Personal Assistant."""

    SYSTEM = ("You are Luqi, a helpful personal AI assistant. You have access to web search, "
              "app launching, code execution, and file management. You remember conversations "
              "and learn from interactions. Be concise, helpful, and precise.")

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.model = model
        self.session = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.memory = PersonalMemory()
        self.voice = VoiceEngine()
        self._setup_ai(api_key)
        self._register_tools()

    def _setup_ai(self, api_key: Optional[str]):
        if _OPTIONAL.get("openai"):
            self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        else:
            self.client = None
            logger.warning("OpenAI not available")

    def _register_tools(self):
        self.tools = {
            "web_search": {"func": search_web, "desc": "Search the web for real-time info"},
            "open_app": {"func": open_app, "desc": "Launch a local application"},
            "sys_info": {"func": sys_info, "desc": "Get system information"},
            "run_python": {"func": run_python, "desc": "Execute Python code"},
        }

    def chat(self, message: str) -> str:
        """Chat with the AI."""
        if not self.client:
            return "Error: OpenAI client not initialized. Set OPENAI_API_KEY."

        self.memory.save("user", message, self.session)
        messages = [{"role": "system", "content": self.SYSTEM}]

        facts = self.memory.get_facts()
        if facts:
            ft = "\n".join([f"- {f['key']}: {f['value']}" for f in facts[:5]])
            messages.append({"role": "system", "content": f"Known facts:\n{ft}"})

        messages.extend(self.memory.get_recent(session_id=self.session))
        messages.append({"role": "user", "content": message})

        try:
            response = self.client.chat.completions.create(
                model=self.model, messages=messages,
                tools=self._get_tool_schemas(), tool_choice="auto")

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
                    output = self._exec_tool(name, args)
                    messages.append({"tool_call_id": tc.id, "role": "tool",
                                    "name": name, "content": str(output)})

                final = self.client.chat.completions.create(model=self.model, messages=messages)
                reply = final.choices[0].message.content
            else:
                reply = msg.content

            if reply:
                self.memory.save("assistant", reply, self.session)
            return reply or "I processed your request."

        except Exception as e:
            return f"Error: {type(e).__name__}: {str(e)}"

    def _get_tool_schemas(self) -> List[Dict]:
        schemas = []
        for name, tool in self.tools.items():
            schemas.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool["desc"],
                    "parameters": {"type": "object", "properties": {}}}})
        return schemas

    def _exec_tool(self, name: str, args: Dict) -> str:
        tool = self.tools.get(name)
        if not tool:
            return f"Tool '{name}' not found"
        try:
            return str(tool["func"](**args))
        except Exception as e:
            return f"Tool error: {str(e)}"

    def listen(self) -> str:
        """Listen for voice input."""
        return self.voice.listen()

    def speak(self, text: str) -> str:
        """Convert text to speech."""
        return self.voice.speak(text)

    def listen_and_respond(self):
        """Listen and respond."""
        user_input = self.listen()
        if not user_input:
            return {"input": "", "response": "I didn't catch that"}
        response = self.chat(user_input)
        self.speak(response)
        return {"input": user_input, "response": response}

    def store_fact(self, key: str, value: str, category: str = "general"):
        """Store a fact."""
        self.memory.store_fact(key, value, category)

    def get_facts(self, category: Optional[str] = None) -> List[Dict]:
        """Get stored facts."""
        return self.memory.get_facts(category)

    def add_reminder(self, text: str, remind_at: str):
        """Add a reminder."""
        self.memory.add_reminder(text, remind_at)

    def check_reminders(self) -> List[Dict]:
        """Check pending reminders."""
        reminders = self.memory.get_pending_reminders()
        for r in reminders:
            self.memory.mark_reminder_triggered(r["id"])
        return reminders

    def search_memory(self, keyword: str) -> List[Dict]:
        """Search conversation memory."""
        return self.memory.search(keyword)

    def get_stats(self) -> Dict[str, Any]:
        """Get AI statistics."""
        return {**self.memory.get_stats(), "session": self.session,
                "tools": list(self.tools.keys()), "model": self.model}

    def clear_memory(self):
        """Clear session memory."""
        self.memory.clear(self.session)
        self.session = datetime.now().strftime("%Y%m%d_%H%M%S")

    def cleanup(self):
        """Clean up resources."""
        self.voice.cleanup()


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

_ai_instance: Optional[PersonalAI] = None

def _get_ai() -> PersonalAI:
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = PersonalAI()
    return _ai_instance


def ai_chat(message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    ai = _get_ai()
    if session_id:
        ai.session = session_id
    reply = ai.chat(message)
    return {"status": "success", "message": reply, "session_id": ai.session,
            "version": "25.1.0", "timestamp": datetime.now().isoformat()}


def ai_voice_listen(timeout: int = 5) -> Dict[str, Any]:
    ai = _get_ai()
    result = ai.listen_and_respond()
    return {"status": "success", **result, "session_id": ai.session,
            "timestamp": datetime.now().isoformat()}


def ai_speak(text: str) -> Dict[str, Any]:
    ai = _get_ai()
    audio = ai.speak(text)
    return {"status": "success", "audio_file": audio,
            "timestamp": datetime.now().isoformat()}


def ai_memory_search(keyword: str) -> Dict[str, Any]:
    ai = _get_ai()
    results = ai.search_memory(keyword)
    return {"status": "success", "query": keyword, "results": results,
            "timestamp": datetime.now().isoformat()}


def ai_store_fact(key: str, value: str, category: str = "general") -> Dict[str, Any]:
    ai = _get_ai()
    ai.store_fact(key, value, category)
    return {"status": "success", "stored": {"key": key, "value": value, "category": category},
            "timestamp": datetime.now().isoformat()}


def ai_stats() -> Dict[str, Any]:
    ai = _get_ai()
    return {"status": "success", **ai.get_stats(),
            "timestamp": datetime.now().isoformat()}
