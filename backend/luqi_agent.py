#!/usr/bin/env python3
"""
Luqi AI v25.1.0 "LUQI" — Autonomous Agent Engine
=====================================================
Integrates persistent memory, web search, local system control, voice processing,
and OpenAI-compatible function calling into Luqi AI's Prometheus backend.

Inspired by L.U.Q.I. — adds an intelligent agent layer that can:
- Remember conversations across sessions (SQLite memory)
- Search the live web for real-time information
- Launch local applications and open files
- Process voice input and generate voice output
- Use tools dynamically via function calling

Usage:
    from backend.luqi_agent import LuqiAgent
    agent = LuqiAgent()
    response = agent.chat("What's the weather in Lagos?")
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
# These are imported lazily to avoid hard failures if not installed

try:
    from duckduckgo_search import DDGS
    _HAS_DDGS = True
except ImportError:
    _HAS_DDGS = False

try:
    import speech_recognition as sr
    _HAS_SPEECH = True
except ImportError:
    _HAS_SPEECH = False

try:
    from gtts import gTTS
    _HAS_GTTS = True
except ImportError:
    _HAS_GTTS = False

try:
    import pygame
    _HAS_PYGAME = True
except ImportError:
    _HAS_PYGAME = False

try:
    from openai import OpenAI
    _HAS_OPENAI = True
except ImportError:
    _HAS_OPENAI = False

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Default paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent
DB_DIR = PROJECT_ROOT / "data"
DB_FILE = DB_DIR / "luqi_memory.db"
VOICE_DIR = PROJECT_ROOT / "data" / "voice"

# Ensure directories exist
DB_DIR.mkdir(parents=True, exist_ok=True)
VOICE_DIR.mkdir(parents=True, exist_ok=True)

# AI Model configuration
DEFAULT_MODEL = "gpt-4o"
MAX_MEMORY_CONTEXT = 10  # Recent conversation turns to include in prompt

# ═══════════════════════════════════════════════════════════════════════════════
#  PERSISTENT MEMORY (SQLite)
# ═══════════════════════════════════════════════════════════════════════════════

class ConversationMemory:
    """SQLite-backed persistent conversation memory.
    
    Stores all user/assistant interactions with timestamps,
    supports retrieval by time range, keyword search, and
    context window assembly for agent prompts.
    """
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or DB_FILE)
        self._local = threading.local()
        self._init_db()
    
    def _conn(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn
    
    def _init_db(self):
        """Initialize database tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Main conversation history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT DEFAULT 'default',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_calls TEXT,  -- JSON array of tool invocations
                metadata TEXT     -- JSON object for extra data
            )
        """)
        
        # User preferences and facts learned
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                confidence REAL DEFAULT 1.0
            )
        """)
        
        # Tool usage analytics
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
        
        conn.commit()
        conn.close()
        logger.info(f"Memory database initialized at {self.db_path}")
    
    def save_message(self, role: str, content: str, 
                     session_id: str = "default",
                     tool_calls: Optional[List[Dict]] = None,
                     metadata: Optional[Dict] = None):
        """Save a conversation message to memory."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO conversation_history 
                   (session_id, timestamp, role, content, tool_calls, metadata)
                   VALUES (?, datetime('now'), ?, ?, ?, ?)""",
                (session_id, role, content,
                 json.dumps(tool_calls) if tool_calls else None,
                 json.dumps(metadata) if metadata else None)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save message: {e}")
    
    def get_recent_context(self, limit: int = MAX_MEMORY_CONTEXT,
                           session_id: str = "default") -> List[Dict[str, str]]:
        """Retrieve recent conversation for agent context window."""
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
            # Reverse to maintain chronological order
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []
    
    def search_memories(self, keyword: str, limit: int = 10) -> List[Dict]:
        """Search conversation history by keyword."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT * FROM conversation_history
                   WHERE content LIKE ?
                   ORDER BY timestamp DESC LIMIT ?""",
                (f"%{keyword}%", limit)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to search memories: {e}")
            return []
    
    def store_fact(self, key: str, value: str, 
                   category: str = "general", confidence: float = 1.0):
        """Store a learned fact about the user."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_memory (key, value, category, confidence)
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
    
    def get_facts(self, category: Optional[str] = None, limit: int = 20) -> List[Dict]:
        """Retrieve stored facts about the user."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            if category:
                cursor.execute(
                    "SELECT * FROM user_memory WHERE category = ? ORDER BY timestamp DESC LIMIT ?",
                    (category, limit)
                )
            else:
                cursor.execute(
                    "SELECT * FROM user_memory ORDER BY timestamp DESC LIMIT ?",
                    (limit,)
                )
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to retrieve facts: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get memory database statistics."""
        try:
            conn = self._conn()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM conversation_history")
            total_messages = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM user_memory")
            total_facts = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM tool_usage")
            total_tool_calls = cursor.fetchone()[0]
            cursor.execute(
                "SELECT tool_name, COUNT(*) as count FROM tool_usage GROUP BY tool_name ORDER BY count DESC"
            )
            tool_stats = [{"tool": row[0], "uses": row[1]} for row in cursor.fetchall()]
            return {
                "total_messages": total_messages,
                "total_facts": total_facts,
                "total_tool_calls": total_tool_calls,
                "tool_breakdown": tool_stats,
                "db_path": self.db_path
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
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


# ═══════════════════════════════════════════════════════════════════════════════
#  TOOL REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

class ToolRegistry:
    """Dynamic tool registry for the agent.
    
    Tools can be registered at runtime. Each tool has:
    - A callable function
    - A JSON schema for OpenAI function calling
    - Metadata (description, category, requires)
    """
    
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Dict] = {}
        self._metadata: Dict[str, Dict] = {}
    
    def register(self, name: str, func: Callable, schema: Dict,
                 description: str = "", category: str = "general"):
        """Register a new tool."""
        self._tools[name] = func
        self._schemas[name] = schema
        self._metadata[name] = {
            "description": description or schema.get("description", ""),
            "category": category,
            "registered_at": datetime.utcnow().isoformat()
        }
        logger.info(f"Tool registered: {name}")
    
    def unregister(self, name: str):
        """Remove a tool from the registry."""
        self._tools.pop(name, None)
        self._schemas.pop(name, None)
        self._metadata.pop(name, None)
    
    def get_function(self, name: str) -> Optional[Callable]:
        """Get a tool's callable function."""
        return self._tools.get(name)
    
    def get_schema(self, name: str) -> Optional[Dict]:
        """Get a tool's JSON schema."""
        return self._schemas.get(name)
    
    def list_tools(self) -> List[Dict]:
        """List all registered tools with metadata."""
        return [
            {
                "name": name,
                "description": meta["description"],
                "category": meta["category"],
                "schema": self._schemas.get(name, {})
            }
            for name, meta in self._metadata.items()
        ]
    
    def get_openai_schemas(self) -> List[Dict]:
        """Get all tool schemas formatted for OpenAI function calling."""
        schemas = []
        for name, schema in self._schemas.items():
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
        """Invoke a tool by name with arguments."""
        func = self._tools.get(name)
        if not func:
            return f"Error: Tool '{name}' not found."
        
        start = time.time()
        try:
            result = func(**arguments)
            duration = int((time.time() - start) * 1000)
            return str(result)
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            error_msg = f"Tool '{name}' failed: {str(e)}"
            logger.error(error_msg)
            return error_msg


# ═══════════════════════════════════════════════════════════════════════════════
#  BUILT-IN TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

def search_the_web(query: str) -> str:
    """Search the live web for real-time information."""
    if not _HAS_DDGS:
        return "Web search unavailable: duckduckgo-search not installed. Install with: pip install duckduckgo-search"
    
    try:
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=5)]
            if not results:
                return f"No results found for '{query}'."
            
            formatted = []
            for i, r in enumerate(results, 1):
                formatted.append(f"[{i}] {r['title']}\n    {r['body'][:200]}...\n    Source: {r.get('href', 'N/A')}")
            
            return f"Web search results for '{query}':\n\n" + "\n\n".join(formatted)
    except Exception as e:
        return f"Web search failed: {str(e)}"


def open_local_application(app_name: str) -> str:
    """Launch a local system application."""
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
        return f"Launched {app_name} successfully."
    except subprocess.CalledProcessError as e:
        return f"Failed to launch {app_name}: process exited with code {e.returncode}"
    except FileNotFoundError:
        return f"Application '{app_name}' not found. Check the name and try again."
    except Exception as e:
        return f"Failed to launch {app_name}: {str(e)}"


def get_system_info() -> str:
    """Get system information."""
    info = {
        "platform": sys.platform,
        "python_version": sys.version,
        "cwd": os.getcwd(),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    return json.dumps(info, indent=2)


def read_file(path: str, offset: int = 0, limit: int = 100) -> str:
    """Read a local file's contents."""
    try:
        file_path = Path(path).resolve()
        # Security: prevent reading outside project directory
        project_root = Path(__file__).parent.parent.resolve()
        if not str(file_path).startswith(str(project_root)):
            return "Error: Path is outside the project directory."
        
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            start = offset
            end = offset + limit
            selected = lines[start:end]
            return f"Lines {start+1}-{min(end, len(lines))} of {len(lines)}:\n" + "".join(selected)
    except Exception as e:
        return f"Error reading file: {str(e)}"


def write_file(path: str, content: str, append: bool = False) -> str:
    """Write content to a local file."""
    try:
        file_path = Path(path).resolve()
        project_root = Path(__file__).parent.parent.resolve()
        if not str(file_path).startswith(str(project_root)):
            return "Error: Path is outside the project directory."
        
        mode = 'a' if append else 'w'
        with open(file_path, mode, encoding='utf-8') as f:
            f.write(content)
        return f"File written successfully: {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"


def run_python_code(code: str) -> str:
    """Execute Python code in a restricted environment and return output."""
    import io

    # Create restricted globals — no __import__ to prevent sandbox escape
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

    old_stdout = sys.stdout
    sys.stdout = io.StringIO()

    try:
        exec(code, safe_globals)
        output = sys.stdout.getvalue()
        return output if output else "Code executed successfully (no output)."
    except Exception as e:
        return f"Code execution error: {str(e)}"
    finally:
        sys.stdout = old_stdout


def get_memory_stats() -> str:
    """Get conversation memory statistics."""
    # This will be bound to the agent's memory instance
    return "Memory stats available via agent.get_stats()"


# ═══════════════════════════════════════════════════════════════════════════════
#  VOICE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class VoiceEngine:
    """Speech-to-text and text-to-speech processing.
    
    Handles voice input capture, transcription, and voice output generation.
    Uses Google Speech Recognition (STT) and gTTS (TTS) by default.
    """
    
    def __init__(self, voice_dir: Optional[str] = None):
        self.voice_dir = Path(voice_dir or VOICE_DIR)
        self.voice_dir.mkdir(parents=True, exist_ok=True)
        self.is_listening = False
        self._temp_files: List[Path] = []
    
    # ── Speech-to-Text ──────────────────────────────────────────────────
    
    def listen(self, timeout: int = 5, phrase_time_limit: int = 8,
               language: str = "en-US") -> str:
        """Capture audio from microphone and transcribe to text.
        
        Returns transcribed text or empty string on failure.
        """
        if not _HAS_SPEECH:
            return ""
        
        recognizer = sr.Recognizer()
        try:
            with sr.Microphone() as source:
                logger.info("Listening for audio input...")
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.listen(source, timeout=timeout, 
                                          phrase_time_limit=phrase_time_limit)
                text = recognizer.recognize_google(audio, language=language)
                logger.info(f"Transcribed: {text}")
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
    
    def listen_continuous(self, callback: Callable[[str], None],
                          stop_event: threading.Event):
        """Listen continuously until stop_event is set.
        
        Calls callback with transcribed text after each utterance.
        """
        if not _HAS_SPEECH:
            logger.error("Speech recognition not available")
            return
        
        recognizer = sr.Recognizer()
        self.is_listening = True
        
        try:
            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source, duration=1)
                
                while not stop_event.is_set() and self.is_listening:
                    try:
                        audio = recognizer.listen(source, timeout=1, 
                                                  phrase_time_limit=10)
                        text = recognizer.recognize_google(audio)
                        if text:
                            callback(text)
                    except sr.WaitTimeoutError:
                        continue
                    except sr.UnknownValueError:
                        continue
                    except Exception as e:
                        logger.error(f"Continuous listen error: {e}")
        finally:
            self.is_listening = False
    
    # ── Text-to-Speech ──────────────────────────────────────────────────
    
    def speak(self, text: str, language: str = "en", 
              tld: str = "co.uk", slow: bool = False) -> str:
        """Convert text to speech and play it.
        
        Returns path to generated audio file.
        """
        if not _HAS_GTTS:
            return "TTS unavailable: gTTS not installed. Install with: pip install gtts"
        
        # Clean text for speech (remove markdown, code blocks)
        clean_text = self._clean_for_speech(text)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_path = self.voice_dir / f"tts_{timestamp}.mp3"
        
        try:
            tts = gTTS(text=clean_text, lang=language, tld=tld, slow=slow)
            tts.save(str(audio_path))
            self._temp_files.append(audio_path)
            
            # Play audio if pygame is available
            if _HAS_PYGAME:
                self._play_audio(str(audio_path))
            
            return str(audio_path)
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return f"TTS failed: {str(e)}"
    
    def _play_audio(self, file_path: str):
        """Play audio file using pygame."""
        try:
            pygame.mixer.init()
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            pygame.mixer.quit()
        except Exception as e:
            logger.error(f"Audio playback error: {e}")
    
    def _clean_for_speech(self, text: str) -> str:
        """Clean text for speech output (remove markdown, code, etc.)."""
        import re
        # Remove code blocks
        text = re.sub(r'```[\s\S]*?```', ' Code block omitted. ', text)
        # Remove inline code
        text = re.sub(r'`[^`]+`', ' code ', text)
        # Remove markdown headers
        text = re.sub(r'#+\s+', '', text)
        # Remove URLs
        text = re.sub(r'https?://\S+', ' link ', text)
        # Remove markdown formatting
        text = re.sub(r'[*_~`]', '', text)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        # Limit length for speech
        if len(text) > 500:
            text = text[:500] + "..."
        return text
    
    def cleanup(self):
        """Remove temporary audio files."""
        for f in self._temp_files:
            try:
                if f.exists():
                    f.unlink()
            except Exception:
                pass
        self._temp_files.clear()


# ═══════════════════════════════════════════════════════════════════════════════
#  LUQI AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class LuqiAgent:
    """Main agent class — the brain of the LUQI integration.
    
    Orchestrates:
    - Conversation memory (persistent SQLite)
    - Tool registry (dynamic tool calling)
    - Voice processing (STT + TTS)
    - OpenAI-compatible function calling
    - Session management
    
    Usage:
        agent = LuqiAgent(api_key="your-key")
        response = agent.chat("What's the weather today?")
        agent.speak(response)
    """
    
    SYSTEM_PROMPT = """You are Luqi AI v25 — an advanced autonomous assistant codenamed "Prometheus". 
You have access to powerful tools including web search, local application control, file management, 
and code execution. You remember conversations across sessions.

Guidelines:
- Be direct, helpful, and technically precise
- Use tools when they provide better answers than your training data
- Address the user respectfully
- If asked about real-time information (news, weather, stock prices), ALWAYS use web_search
- When launching apps or modifying files, confirm the action first
- Keep responses concise unless detail is requested
"""
    
    def __init__(self, api_key: Optional[str] = None, 
                 model: str = DEFAULT_MODEL,
                 db_path: Optional[str] = None):
        """Initialize the LUQI agent.
        
        Args:
            api_key: OpenAI API key (or set OPENAI_API_KEY env var)
            model: OpenAI model to use (default: gpt-4o)
            db_path: Path to SQLite memory database
        """
        self.model = model
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Initialize memory
        self.memory = ConversationMemory(db_path=db_path)
        
        # Initialize voice engine
        self.voice = VoiceEngine()
        
        # Initialize tool registry
        self.tools = ToolRegistry()
        self._register_builtin_tools()
        
        # Initialize OpenAI client
        if _HAS_OPENAI:
            self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        else:
            self.client = None
            logger.warning("OpenAI client not available. Running in tool-only mode.")
    
    def _register_builtin_tools(self):
        """Register all built-in tools."""
        self.tools.register(
            name="web_search",
            func=search_the_web,
            schema={
                "description": "Search the live web for real-time information, news, current events, sports scores, weather, stock prices, or any up-to-date data not in your training set.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query. Be specific for best results."}
                    },
                    "required": ["query"]
                }
            },
            category="information"
        )
        
        self.tools.register(
            name="open_application",
            func=open_local_application,
            schema={
                "description": "Launch a local application on the user's computer (e.g., 'chrome', 'notepad', 'calculator', 'terminal').",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "app_name": {"type": "string", "description": "Name or command of the application to launch."}
                    },
                    "required": ["app_name"]
                }
            },
            category="system"
        )
        
        self.tools.register(
            name="system_info",
            func=get_system_info,
            schema={
                "description": "Get information about the current system (platform, Python version, time, working directory).",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            category="system"
        )
        
        self.tools.register(
            name="read_file",
            func=read_file,
            schema={
                "description": "Read contents of a file within the project directory.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative or absolute path to the file."},
                        "offset": {"type": "integer", "description": "Line offset to start reading from."},
                        "limit": {"type": "integer", "description": "Maximum number of lines to read."}
                    },
                    "required": ["path"]
                }
            },
            category="files"
        )
        
        self.tools.register(
            name="write_file",
            func=write_file,
            schema={
                "description": "Write or append content to a file within the project directory.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path to the file."},
                        "content": {"type": "string", "description": "Content to write."},
                        "append": {"type": "boolean", "description": "If true, append instead of overwrite."}
                    },
                    "required": ["path", "content"]
                }
            },
            category="files"
        )
        
        self.tools.register(
            name="run_python",
            func=run_python_code,
            schema={
                "description": "Execute Python code in a restricted sandbox environment and return the output. Useful for calculations, data processing, or quick scripts.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Python code to execute."}
                    },
                    "required": ["code"]
                }
            },
            category="code"
        )
    
    # ── Core Chat Interface ─────────────────────────────────────────────
    
    def chat(self, message: str, use_tools: bool = True,
             store_memory: bool = True) -> str:
        """Process a chat message and return the response.
        
        Args:
            message: User's message
            use_tools: Whether to enable tool calling
            store_memory: Whether to save this exchange to memory
            
        Returns:
            Assistant's response text
        """
        if not self.client:
            return "Error: OpenAI client not initialized. Set OPENAI_API_KEY."
        
        # Save user message
        if store_memory:
            self.memory.save_message("user", message, session_id=self.session_id)
        
        # Build messages with context
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        
        # Add relevant facts about user
        facts = self.memory.get_facts(limit=5)
        if facts:
            fact_text = "\n".join([f"- {f['key']}: {f['value']}" for f in facts])
            messages.append({
                "role": "system",
                "content": f"Known facts about the user:\n{fact_text}"
            })
        
        # Add recent conversation context
        messages.extend(self.memory.get_recent_context(
            limit=MAX_MEMORY_CONTEXT, session_id=self.session_id
        ))
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Call OpenAI with tools
        try:
            if use_tools and self.tools.list_tools():
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
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls
            
            # Handle tool calls
            if tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function", 
                         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                        for tc in tool_calls
                    ]
                })
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"Executing tool: {function_name}({function_args})")
                    
                    # Execute the tool
                    func = self.tools.get_function(function_name)
                    if func:
                        tool_output = func(**function_args)
                    else:
                        tool_output = f"Error: Tool '{function_name}' not found."
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": str(tool_output)
                    })
                
                # Get final response after tool execution
                second_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )
                reply = second_response.choices[0].message.content
            else:
                reply = response_message.content
            
            # Save assistant response
            if store_memory and reply:
                self.memory.save_message("assistant", reply, session_id=self.session_id)
            
            return reply or "I processed your request but have no text response."
            
        except Exception as e:
            error_msg = f"Agent error: {str(e)}"
            logger.error(error_msg)
            return error_msg
    
    # ── Voice Interface ─────────────────────────────────────────────────
    
    def listen_and_respond(self, timeout: int = 5) -> Dict[str, str]:
        """Listen for voice input, process it, and return response.
        
        Returns dict with 'input', 'response', and 'audio_path' keys.
        """
        # Listen
        user_input = self.voice.listen(timeout=timeout)
        if not user_input:
            return {"input": "", "response": "I didn't catch that. Could you repeat?", "audio_path": ""}
        
        # Process
        response = self.chat(user_input)
        
        # Speak response
        audio_path = self.voice.speak(response)
        
        return {
            "input": user_input,
            "response": response,
            "audio_path": audio_path
        }
    
    def speak(self, text: str) -> str:
        """Convert text to speech."""
        return self.voice.speak(text)
    
    # ── Memory Management ───────────────────────────────────────────────
    
    def store_fact(self, key: str, value: str, category: str = "general"):
        """Store a fact about the user."""
        self.memory.store_fact(key, value, category)
    
    def get_facts(self, category: Optional[str] = None) -> List[Dict]:
        """Retrieve stored facts."""
        return self.memory.get_facts(category)
    
    def search_memories(self, keyword: str) -> List[Dict]:
        """Search conversation history."""
        return self.memory.search_memories(keyword)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        return self.memory.get_stats()
    
    def clear_session(self):
        """Clear current session memory."""
        self.memory.clear_session(self.session_id)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # ── Tool Management ─────────────────────────────────────────────────
    
    def register_tool(self, name: str, func: Callable, schema: Dict,
                      description: str = "", category: str = "custom"):
        """Register a custom tool at runtime."""
        self.tools.register(name, func, schema, description, category)
    
    def list_tools(self) -> List[Dict]:
        """List all available tools."""
        return self.tools.list_tools()
    
    # ── Cleanup ─────────────────────────────────────────────────────────
    
    def cleanup(self):
        """Clean up resources."""
        self.voice.cleanup()


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI-Compatible Interface Functions
# ═══════════════════════════════════════════════════════════════════════════════
# These functions mirror the pattern used by other Luqi AI backend modules
# and can be called directly from v25_endpoints.py

_agent_instance: Optional[LuqiAgent] = None

def _get_agent() -> LuqiAgent:
    """Get or create the singleton agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = LuqiAgent()
    return _agent_instance


def agent_chat(message: str, session_id: Optional[str] = None,
               use_tools: bool = True) -> Dict[str, Any]:
    """Chat with the LUQI agent. FastAPI-compatible interface."""
    agent = _get_agent()
    if session_id:
        agent.session_id = session_id
    
    reply = agent.chat(message, use_tools=use_tools)
    
    return {
        "status": "success",
        "version": "25.1.0",
        "codename": "LUQI",
        "message": reply,
        "session_id": agent.session_id,
        "tools_used": [t["name"] for t in agent.list_tools()],
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_voice_listen(timeout: int = 5) -> Dict[str, Any]:
    """Listen for voice input and get agent response."""
    agent = _get_agent()
    result = agent.listen_and_respond(timeout=timeout)
    
    return {
        "status": "success" if result["input"] else "no_input",
        "transcribed_input": result["input"],
        "agent_response": result["response"],
        "audio_file": result["audio_path"],
        "session_id": agent.session_id,
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_speak(text: str) -> Dict[str, Any]:
    """Convert text to speech."""
    agent = _get_agent()
    audio_path = agent.speak(text)
    
    return {
        "status": "success" if audio_path.endswith(".mp3") else "error",
        "audio_file": audio_path,
        "text_spoken": text[:100],
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_memory_search(keyword: str) -> Dict[str, Any]:
    """Search conversation memory."""
    agent = _get_agent()
    results = agent.search_memories(keyword)
    
    return {
        "status": "success",
        "query": keyword,
        "results_count": len(results),
        "results": results[:10],  # Limit to 10
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_memory_facts(category: Optional[str] = None) -> Dict[str, Any]:
    """Get stored facts about the user."""
    agent = _get_agent()
    facts = agent.get_facts(category)
    
    return {
        "status": "success",
        "category": category or "all",
        "facts_count": len(facts),
        "facts": facts,
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_store_fact(key: str, value: str, 
                     category: str = "general") -> Dict[str, Any]:
    """Store a fact about the user."""
    agent = _get_agent()
    agent.store_fact(key, value, category)
    
    return {
        "status": "success",
        "stored": {"key": key, "value": value, "category": category},
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_stats() -> Dict[str, Any]:
    """Get agent statistics."""
    agent = _get_agent()
    stats = agent.get_stats()
    
    return {
        "status": "success",
        **stats,
        "available_tools": len(agent.list_tools()),
        "tool_list": [t["name"] for t in agent.list_tools()],
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_list_tools() -> Dict[str, Any]:
    """List all available tools."""
    agent = _get_agent()
    tools = agent.list_tools()
    
    return {
        "status": "success",
        "total_tools": len(tools),
        "tools": tools,
        "timestamp": datetime.utcnow().isoformat()
    }


def agent_clear_session(session_id: Optional[str] = None) -> Dict[str, Any]:
    """Clear a conversation session."""
    agent = _get_agent()
    if session_id:
        agent.memory.clear_session(session_id)
    else:
        agent.clear_session()
    
    return {
        "status": "success",
        "message": "Session memory cleared.",
        "new_session_id": agent.session_id,
        "timestamp": datetime.utcnow().isoformat()
    }


def web_search(query: str) -> Dict[str, Any]:
    """Standalone web search function."""
    results = search_the_web(query)
    
    return {
        "status": "success",
        "query": query,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }


def run_code(code: str) -> Dict[str, Any]:
    """Execute Python code in sandbox."""
    output = run_python_code(code)
    
    return {
        "status": "success",
        "code": code[:200],
        "output": output,
        "timestamp": datetime.utcnow().isoformat()
    }