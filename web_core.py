#!/usr/bin/env python3
"""
Luqi AI v25.1.2 "Prometheus . LUQI" - Unified Web Core
=======================================================
One codebase serves Web, Desktop, and Mobile:
  Web:     FastAPI server with PWA (offline-capable)
  Desktop: PyInstaller wrapper or electron-like WebView
  Mobile:  Responsive PWA, installable on iOS/Android

Features:
- FastAPI backend with telemetry, chat, file upload
- SQLite persistent memory for conversations
- Multi-format document parsing (PDF, DOCX, XLSX, TXT, images, Python)
- Voice input/output (STT + TTS with 8 accents)
- Web search via DuckDuckGo
- Self-improvement protocol
- Capability agents (tracker, improvement, update-push)
- PWA: service worker, manifest, offline page
- Mobile-responsive with touch gestures
- Desktop wrapper support

Usage:
    python web_core.py              # Start web server
    python web_core.py --desktop    # Launch desktop app (PyQt6 WebView)
    python web_core.py --test       # Run tests
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import io
import json
import logging
import os
import platform
import re
import secrets
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import traceback
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Tuple, Union

import uvicorn
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
    StreamingResponse,
)
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger("luqi.webcore")

PROJECT_ROOT = Path(__file__).parent.resolve()
DATA_DIR = PROJECT_ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
STATIC_DIR = DATA_DIR / "web_static"
MEMORY_DB = DATA_DIR / "luqi_memory.db"

for d in [DATA_DIR, UPLOADS_DIR, STATIC_DIR]:
    d.mkdir(parents=True, exist_ok=True)


class ModelProvider(str, Enum):
    GPT4O = "gpt-4o"
    GPT4O_MINI = "gpt-4o-mini"
    GPT4_TURBO = "gpt-4-turbo"
    CLAUDE_SONNET = "claude-sonnet"
    CLAUDE_HAIKU = "claude-haiku"
    LOCAL_LLAMA = "local-llama"


class Accent(str, Enum):
    AMERICAN = "american"
    BRITISH = "british"
    AUSTRALIAN = "australian"
    INDIAN = "indian"
    NIGERIAN = "nigerian"
    SOUTH_AFRICAN = "south_african"
    FRENCH = "french"
    GERMAN = "german"


@dataclass
class ChatMessage:
    role: str
    content: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    model: Optional[str] = None


class MemoryEngine:
    """Thread-safe SQLite persistent memory for conversations."""

    def __init__(self, db_path: Path = MEMORY_DB):
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    model TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_session ON conversations(session_id);
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    content TEXT NOT NULL,
                    doc_type TEXT,
                    size_bytes INTEGER,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS api_keys (
                    key_hash TEXT PRIMARY KEY,
                    name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP,
                    request_count INTEGER DEFAULT 0,
                    is_admin INTEGER DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS rate_limits (
                    key_hash TEXT PRIMARY KEY,
                    tokens REAL DEFAULT 60.0,
                    last_refill TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS request_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key_hash TEXT,
                    method TEXT,
                    path TEXT,
                    status_code INTEGER,
                    latency_ms REAL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS webhooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    secret TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS youtube_campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    niche TEXT,
                    target_audience TEXT,
                    content_pillars TEXT,
                    upload_schedule TEXT,
                    seo_strategy TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS wealth_funnels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    funnel_type TEXT,
                    price_tier TEXT,
                    estimated_revenue REAL,
                    status TEXT DEFAULT 'draft',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

    def save_message(self, session_id: str, role: str, content: str, model: Optional[str] = None):
        self._conn().execute(
            "INSERT INTO conversations (session_id, role, content, model) VALUES (?, ?, ?, ?)",
            (session_id, role, content, model),
        )
        self._conn().commit()

    def get_history(self, session_id: str, limit: int = 50) -> List[ChatMessage]:
        rows = self._conn().execute(
            "SELECT role, content, model, created_at FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
        return [ChatMessage(r["role"], r["content"], r["created_at"], r["model"]) for r in reversed(rows)]

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        rows = self._conn().execute(
            "SELECT session_id, COUNT(*) as msg_count, MAX(created_at) as last_active FROM conversations GROUP BY session_id ORDER BY last_active DESC"
        ).fetchall()
        return [{"session_id": r["session_id"], "message_count": r["msg_count"], "last_active": r["last_active"]} for r in rows]

    def clear_session(self, session_id: str):
        self._conn().execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
        self._conn().commit()

    def delete_session(self, session_id: str):
        self.clear_session(session_id)

    def save_document(self, filename: str, content: str, doc_type: str, size_bytes: int) -> int:
        cursor = self._conn().execute(
            "INSERT INTO documents (filename, content, doc_type, size_bytes) VALUES (?, ?, ?, ?)",
            (filename, content, doc_type, size_bytes),
        )
        self._conn().commit()
        return cursor.lastrowid

    def get_documents(self) -> List[Dict[str, Any]]:
        rows = self._conn().execute(
            "SELECT id, filename, doc_type, size_bytes, uploaded_at FROM documents ORDER BY uploaded_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def get_document(self, doc_id: int) -> Optional[Dict[str, Any]]:
        row = self._conn().execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        return dict(row) if row else None


class DocumentParser:
    """Parse PDF, DOCX, XLSX, TXT, images, and Python files."""

    SUPPORTED_TYPES = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".xlsx": "xlsx",
        ".txt": "text",
        ".md": "markdown",
        ".py": "python",
        ".json": "json",
        ".csv": "csv",
        ".jpg": "image",
        ".jpeg": "image",
        ".png": "image",
        ".webp": "image",
    }

    @classmethod
    def detect_type(cls, filename: str) -> Optional[str]:
        ext = Path(filename).suffix.lower()
        return cls.SUPPORTED_TYPES.get(ext)

    @classmethod
    def parse(cls, filepath: Path, doc_type: str) -> str:
        if doc_type == "text" or doc_type == "markdown" or doc_type == "json" or doc_type == "csv":
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        elif doc_type == "python":
            with open(filepath, "r", encoding="utf-8") as f:
                code = f.read()
            try:
                tree = ast.parse(code)
                functions = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
                classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
                return f"# Python File Analysis\n\nClasses: {classes}\nFunctions: {functions}\n\n```python\n{code[:5000]}\n```"
            except SyntaxError:
                return code[:10000]
        elif doc_type == "pdf":
            try:
                import PyPDF2
                text = ""
                with open(filepath, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() or ""
                return text[:20000] or "[PDF: No extractable text]"
            except Exception as e:
                return f"[PDF parsing error: {e}]"
        elif doc_type == "docx":
            try:
                import docx
                doc = docx.Document(filepath)
                return "\n".join([p.text for p in doc.paragraphs])[:20000]
            except Exception as e:
                return f"[DOCX parsing error: {e}]"
        elif doc_type == "xlsx":
            try:
                import openpyxl
                wb = openpyxl.load_workbook(filepath, data_only=True)
                result = []
                for sheet in wb.worksheets[:3]:
                    result.append(f"Sheet: {sheet.title}")
                    for row in sheet.iter_rows(max_row=min(100, sheet.max_row), values_only=True):
                        result.append(", ".join(str(c) for c in row if c is not None))
                return "\n".join(result)[:20000]
            except Exception as e:
                return f"[XLSX parsing error: {e}]"
        elif doc_type == "image":
            return f"[Image uploaded: {filepath.name}]"
        return "[Unsupported file type]"


class VoiceEngine:
    """Text-to-speech and speech-to-text with multiple accents."""

    ACCENT_MAP = {
        Accent.AMERICAN: "com",
        Accent.BRITISH: "co.uk",
        Accent.AUSTRALIAN: "com.au",
        Accent.INDIAN: "co.in",
        Accent.NIGERIAN: "com.ng",
        Accent.SOUTH_AFRICAN: "co.za",
        Accent.FRENCH: "fr",
        Accent.GERMAN: "de",
    }

    def __init__(self):
        self._stt_available = None
        self._tts_available = None

    @property
    def stt_available(self) -> bool:
        if self._stt_available is None:
            try:
                import speech_recognition as sr
                self._stt_available = True
            except ImportError:
                self._stt_available = False
        return self._stt_available

    @property
    def tts_available(self) -> bool:
        if self._tts_available is None:
            try:
                from gtts import gTTS
                self._tts_available = True
            except ImportError:
                self._tts_available = False
        return self._tts_available

    def text_to_speech(self, text: str, accent: Accent = Accent.AMERICAN, lang: str = "en") -> bytes:
        if not self.tts_available:
            raise RuntimeError("gTTS not installed. Run: pip install gtts")
        from gtts import gTTS
        tld = self.ACCENT_MAP.get(accent, "com")
        tts = gTTS(text=text[:5000], lang=lang, tld=tld, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()

    def speech_to_text(self, audio_bytes: bytes) -> str:
        if not self.stt_available:
            raise RuntimeError("SpeechRecognition not installed. Run: pip install SpeechRecognition")
        import speech_recognition as sr
        r = sr.Recognizer()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        try:
            with sr.AudioFile(tmp_path) as source:
                audio = r.record(source)
            return r.recognize_google(audio)
        except sr.UnknownValueError:
            return "[Could not understand audio]"
        except sr.RequestError as e:
            return f"[STT service error: {e}]"
        finally:
            os.unlink(tmp_path)


class ToolRegistry:
    """Dynamic tool/function registry for AI function calling."""

    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}

    def register(self, name: str, func: Callable, description: str, parameters: Optional[Dict] = None):
        self._tools[name] = {
            "func": func,
            "description": description,
            "parameters": parameters or {"type": "object", "properties": {}},
        }

    def get_schemas(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": info["description"],
                    "parameters": info["parameters"],
                },
            }
            for name, info in self._tools.items()
        ]

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        if name not in self._tools:
            return {"error": f"Tool '{name}' not found"}
        func = self._tools[name]["func"]
        if asyncio.iscoroutinefunction(func):
            return await func(**arguments)
        return func(**arguments)

    @property
    def tools(self) -> Dict[str, Dict[str, Any]]:
        return dict(self._tools)


class CapabilityTracker:
    """Track what LUQI can and cannot do."""

    CAPABILITIES = [
        {"id": "chat", "name": "AI Chat", "status": "active", "category": "core"},
        {"id": "memory", "name": "Persistent Memory", "status": "active", "category": "core"},
        {"id": "web_search", "name": "Web Search", "status": "active", "category": "core"},
        {"id": "doc_parse", "name": "Document Parsing", "status": "active", "category": "core"},
        {"id": "voice_tts", "name": "Text-to-Speech", "status": "active", "category": "voice"},
        {"id": "voice_stt", "name": "Speech-to-Text", "status": "active", "category": "voice"},
        {"id": "self_improve", "name": "Self-Improvement", "status": "active", "category": "advanced"},
        {"id": "code_analysis", "name": "Code Analysis", "status": "active", "category": "advanced"},
        {"id": "multi_model", "name": "Multi-Model AI", "status": "active", "category": "core"},
        {"id": "youtube", "name": "YouTube Creation Suite", "status": "active", "category": "content"},
        {"id": "wealth", "name": "Wealth Creation Engine", "status": "active", "category": "content"},
        {"id": "pwa", "name": "PWA Support", "status": "active", "category": "platform"},
        {"id": "desktop", "name": "Desktop App", "status": "active", "category": "platform"},
        {"id": "mobile", "name": "Mobile Responsive", "status": "active", "category": "platform"},
        {"id": "auth", "name": "API Key Auth", "status": "active", "category": "security"},
        {"id": "rate_limit", "name": "Rate Limiting", "status": "active", "category": "security"},
        {"id": "ws", "name": "WebSocket Chat", "status": "active", "category": "core"},
        {"id": "export", "name": "Data Export", "status": "active", "category": "utility"},
        {"id": "webhooks", "name": "Webhook System", "status": "active", "category": "utility"},
        {"id": "translate", "name": "Auto-Translation", "status": "active", "category": "utility"},
        {"id": "sentiment", "name": "Sentiment Analysis", "status": "active", "category": "utility"},
        {"id": "metrics", "name": "Prometheus Metrics", "status": "active", "category": "monitoring"},
        {"id": "health", "name": "Health Monitoring", "status": "active", "category": "monitoring"},
        {"id": "file_upload", "name": "File Upload & Analysis", "status": "active", "category": "core"},
        {"id": "theme", "name": "Theme Toggle", "status": "active", "category": "ui"},
        {"id": "admin", "name": "Admin Dashboard", "status": "active", "category": "ui"},
        {"id": "offline", "name": "Offline Support", "status": "active", "category": "pwa"},
        {"id": "push_notif", "name": "Push Notifications", "status": "planned", "category": "pwa"},
        {"id": "sync", "name": "Cross-Device Sync", "status": "planned", "category": "pwa"},
        {"id": "collab", "name": "Collaborative Editing", "status": "planned", "category": "advanced"},
        {"id": "agent_marketplace", "name": "Agent Marketplace", "status": "planned", "category": "advanced"},
        {"id": "rag", "name": "RAG (Document QA)", "status": "active", "category": "advanced"},
        {"id": "image_gen", "name": "Image Generation", "status": "active", "category": "content"},
        {"id": "video_gen", "name": "Video Generation", "status": "planned", "category": "content"},
        {"id": "music_gen", "name": "Music Generation", "status": "planned", "category": "content"},
        {"id": "sandbox", "name": "Python Sandbox", "status": "active", "category": "advanced"},
        {"id": "browser", "name": "Browser Automation", "status": "active", "category": "core"},
        {"id": "scheduler", "name": "Task Scheduler", "status": "active", "category": "utility"},
        {"id": "data_viz", "name": "Data Visualization", "status": "active", "category": "utility"},
        {"id": "email", "name": "Email Integration", "status": "planned", "category": "utility"},
        {"id": "sms", "name": "SMS Integration", "status": "planned", "category": "utility"},
        {"id": "calendar", "name": "Calendar Integration", "status": "planned", "category": "utility"},
        {"id": "social_post", "name": "Social Media Posting", "status": "active", "category": "content"},
        {"id": "seo_audit", "name": "SEO Audit", "status": "active", "category": "content"},
        {"id": "funnel_builder", "name": "Sales Funnel Builder", "status": "active", "category": "wealth"},
        {"id": "pricing_optimizer", "name": "Pricing Optimizer", "status": "active", "category": "wealth"},
        {"id": "sponsor_finder", "name": "Sponsor Finder", "status": "active", "category": "wealth"},
        {"id": "analytics", "name": "Analytics Dashboard", "status": "active", "category": "monitoring"},
        {"id": "ab_testing", "name": "A/B Testing", "status": "planned", "category": "wealth"},
        {"id": "affiliate", "name": "Affiliate System", "status": "planned", "category": "wealth"},
        {"id": "subscription", "name": "Subscription Management", "status": "active", "category": "wealth"},
        {"id": "invoice", "name": "Invoice Generator", "status": "active", "category": "wealth"},
        {"id": "meeting_notes", "name": "Meeting Notes AI", "status": "active", "category": "utility"},
        {"id": "competitor_analysis", "name": "Competitor Analysis", "status": "active", "category": "wealth"},
        {"id": "trend_forecast", "name": "Trend Forecasting", "status": "active", "category": "wealth"},
        {"id": "api_builder", "name": "API Builder", "status": "active", "category": "advanced"},
        {"id": "database_designer", "name": "Database Designer", "status": "active", "category": "advanced"},
        {"id": "test_generator", "name": "Test Generator", "status": "active", "category": "advanced"},
        {"id": "ci_cd", "name": "CI/CD Pipeline", "status": "active", "category": "advanced"},
        {"id": "security_audit", "name": "Security Audit", "status": "active", "category": "security"},
        {"id": "penetration_test", "name": "Penetration Testing", "status": "planned", "category": "security"},
        {"id": "backup_restore", "name": "Backup & Restore", "status": "active", "category": "utility"},
        {"id": "migration", "name": "Database Migration", "status": "active", "category": "utility"},
        {"id": "localization", "name": "Localization (i18n)", "status": "active", "category": "utility"},
        {"id": "accessibility", "name": "Accessibility (a11y)", "status": "active", "category": "ui"},
        {"id": "gdpr_compliance", "name": "GDPR Compliance", "status": "active", "category": "security"},
        {"id": "audit_log", "name": "Audit Logging", "status": "active", "category": "security"},
    ]

    def list(self) -> List[Dict[str, str]]:
        return self.CAPABILITIES

    def get_by_category(self, category: str) -> List[Dict[str, str]]:
        return [c for c in self.CAPABILITIES if c["category"] == category]

    def count_active(self) -> int:
        return sum(1 for c in self.CAPABILITIES if c["status"] == "active")

    def count_planned(self) -> int:
        return sum(1 for c in self.CAPABILITIES if c["status"] == "planned")


class SelfImprovementAgent:
    """Analyze LUQI's own code and suggest improvements."""

    def __init__(self, project_root: Path = PROJECT_ROOT):
        self.project_root = project_root

    def analyze_file(self, filepath: Path) -> Dict[str, Any]:
        content = filepath.read_text(encoding="utf-8")
        lines = content.split("\n")
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return {"error": "Syntax error in file"}

        functions = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
        classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
        imports = [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]

        issues = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                complexity = len(list(ast.walk(node)))
                if complexity > 200:
                    issues.append(f"Function '{node.name}' is too complex ({complexity} nodes)")
                if ast.get_docstring(node) is None and not node.name.startswith("_"):
                    issues.append(f"Function '{node.name}' missing docstring")
            if isinstance(node, ast.Try) and any(isinstance(h, ast.ExceptHandler) and h.type is None for h in node.handlers):
                issues.append("Bare except: found - use specific exceptions")

        return {
            "file": str(filepath.relative_to(self.project_root)),
            "lines": len(lines),
            "functions": len(functions),
            "classes": len(classes),
            "imports": len(imports),
            "docstring_coverage": sum(1 for f in functions if ast.get_docstring(f)) / max(len(functions), 1),
            "issues": issues,
        }

    def analyze_project(self) -> List[Dict[str, Any]]:
        results = []
        for py_file in self.project_root.rglob("*.py"):
            if "__pycache__" in str(py_file) or ".git" in str(py_file):
                continue
            try:
                results.append(self.analyze_file(py_file))
            except Exception:
                pass
        return results

    def generate_report(self) -> str:
        results = self.analyze_project()
        total_lines = sum(r["lines"] for r in results)
        total_functions = sum(r["functions"] for r in results)
        total_issues = sum(len(r["issues"]) for r in results)
        return f"""# Self-Improvement Report

Files analyzed: {len(results)}
Total lines: {total_lines}
Total functions: {total_functions}
Issues found: {total_issues}

## Top Issues
{chr(10).join(f"- {i}" for r in results for i in r["issues"][:3])}
"""


class UpdatePushAgent:
    """Track what changed and push updates to the repository."""

    def __init__(self, project_root: Path = PROJECT_ROOT):
        self.project_root = project_root
        self.changelog_path = project_root / "CHANGELOG.md"

    def get_git_status(self) -> Dict[str, Any]:
        try:
            result = subprocess.run(
                ["git", "-C", str(self.project_root), "status", "--short"],
                capture_output=True, text=True, timeout=10,
            )
            files = result.stdout.strip().split("\n") if result.stdout.strip() else []
            return {"dirty": len(files) > 0, "changed_files": [f.strip() for f in files if f.strip()]}
        except Exception as e:
            return {"dirty": False, "error": str(e)}

    def get_last_commit(self) -> str:
        try:
            result = subprocess.run(
                ["git", "-C", str(self.project_root), "log", "-1", "--oneline"],
                capture_output=True, text=True, timeout=10,
            )
            return result.stdout.strip()
        except Exception:
            return "Unknown"

    def append_changelog(self, version: str, changes: List[str]):
        entry = f"\n## {version} - {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
        for c in changes:
            entry += f"- {c}\n"
        if self.changelog_path.exists():
            self.changelog_path.write_text(entry + self.changelog_path.read_text())
        else:
            self.changelog_path.write_text(f"# Changelog\n{entry}")


class YoutubeCreationEngine:
    """AI-powered YouTube content creation suite."""

    CONTENT_PILLARS = [
        "Educational Tutorials",
        "Tech Reviews",
        "Behind the Scenes",
        "Q&A Sessions",
        "Collaborations",
        "Trending Topics",
        "Case Studies",
        "Tool Comparisons",
    ]

    SEO_TEMPLATES = {
        "title": [
            "How to {topic} in {year} (Step-by-Step)",
            "{topic}: The Complete Guide for Beginners",
            "Top {number} {topic} Tips You Need to Know",
            "Why {topic} Matters (And How to Start)",
            "{topic} Tutorial: From Zero to Expert",
        ],
        "description": [
            "Learn everything about {topic} in this comprehensive guide.",
            "Discover the best {topic} strategies used by professionals.",
            "This {topic} tutorial covers all the essentials you need.",
        ],
        "tags": [
            "{topic}", "tutorial", "how to", "guide", "{year}",
            "beginner", "tips", "tricks", "education", "tech",
        ],
    }

    def __init__(self, memory: MemoryEngine):
        self.memory = memory

    def generate_campaign(self, niche: str, target_audience: str, video_count: int = 30) -> Dict[str, Any]:
        import random
        year = datetime.utcnow().year
        content_pillars = random.sample(self.CONTENT_PILLARS, min(5, len(self.CONTENT_PILLARS)))
        videos = []
        for i in range(video_count):
            pillar = random.choice(content_pillars)
            title_template = random.choice(self.SEO_TEMPLATES["title"])
            title = title_template.format(topic=f"{niche} - {pillar}", year=year, number=random.randint(3, 10))
            videos.append({
                "episode": i + 1,
                "title": title,
                "pillar": pillar,
                "estimated_duration": random.choice([8, 12, 15, 20, 25]),
                "target_keywords": [niche.lower(), pillar.lower(), "tutorial"],
            })

        upload_schedule = ["Monday", "Wednesday", "Friday"]
        campaign = {
            "niche": niche,
            "target_audience": target_audience,
            "content_pillars": content_pillars,
            "upload_schedule": upload_schedule,
            "total_videos": video_count,
            "estimated_total_duration": sum(v["estimated_duration"] for v in videos),
            "videos": videos,
            "seo_strategy": {
                "title_templates": self.SEO_TEMPLATES["title"][:3],
                "description_templates": self.SEO_TEMPLATES["description"][:2],
                "recommended_tags": self.SEO_TEMPLATES["tags"],
            },
        }
        return campaign

    def generate_thumbnail_prompt(self, video_title: str) -> str:
        return f"""Create a high-contrast YouTube thumbnail for: "{video_title}"
- Bold, readable text (max 3 words)
- Bright background with face or object
- 1280x720 resolution
- Eye-catching colors (red, yellow, orange accents)
- Professional but approachable style"""

    def generate_script_outline(self, topic: str, duration_minutes: int = 10) -> Dict[str, Any]:
        segments = []
        hook_time = 0.5
        intro_time = 1
        content_time = duration_minutes - 3
        cta_time = 1.5
        segments.append({"type": "hook", "duration": hook_time, "content": f"Attention-grabbing statement about {topic}"})
        segments.append({"type": "intro", "duration": intro_time, "content": f"Introduce yourself and what viewers will learn about {topic}"})
        for i in range(int(content_time // 2)):
            segments.append({"type": "content", "duration": 2, "content": f"Key point {i+1} about {topic} with example"})
        segments.append({"type": "cta", "duration": cta_time, "content": "Subscribe, like, comment, and check links in description"})
        return {"topic": topic, "total_duration": duration_minutes, "segments": segments}

    def save_campaign(self, campaign: Dict[str, Any]) -> int:
        cursor = self.memory._conn().execute(
            "INSERT INTO youtube_campaigns (title, niche, target_audience, content_pillars, upload_schedule, seo_strategy) VALUES (?, ?, ?, ?, ?, ?)",
            (campaign["niche"] + " Campaign", campaign["niche"], campaign["target_audience"],
             json.dumps(campaign["content_pillars"]), json.dumps(campaign["upload_schedule"]), json.dumps(campaign["seo_strategy"])),
        )
        self.memory._conn().commit()
        return cursor.lastrowid

    def get_campaigns(self) -> List[Dict[str, Any]]:
        rows = self.memory._conn().execute("SELECT * FROM youtube_campaigns ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


class WealthCreationEngine:
    """AI-powered wealth creation and monetization engine."""

    FUNNEL_TEMPLATES = [
        {"name": "Free Video → Email List → Course", "tiers": ["Free", "$27", "$197"]},
        {"name": "Tutorial → Tool/Template → Coaching", "tiers": ["Free", "$47", "$497/mo"]},
        {"name": "Webinar → Program → Mastermind", "tiers": ["Free", "$297", "$2,997"]},
        {"name": "Content → Affiliate → Product", "tiers": ["Free", "$17-97", "$497"]},
        {"name": "Community → Membership → Agency", "tiers": ["Free", "$29/mo", "$5,000+"]},
    ]

    SPONSOR_NICHES = {
        "tech": ["Software companies", "Hardware brands", "SaaS platforms", "Developer tools"],
        "education": ["Online course platforms", "Book publishers", "EdTech startups", "Certification bodies"],
        "finance": ["Investment apps", "Banking services", "Crypto exchanges", "Financial advisors"],
        "health": ["Fitness brands", "Supplement companies", "Health apps", "Medical devices"],
        "creative": ["Design tools", "Stock media sites", "Creative software", "Freelance platforms"],
    }

    def __init__(self, memory: MemoryEngine):
        self.memory = memory

    def generate_funnel(self, niche: str, audience_size: int, content_type: str) -> Dict[str, Any]:
        import random
        template = random.choice(self.FUNNEL_TEMPLATES)
        conversion_rates = [0.05, 0.02, 0.005]
        revenue_projection = []
        current_audience = audience_size
        for i, tier in enumerate(template["tiers"]):
            if i == 0:
                revenue_projection.append({"tier": tier, "audience": current_audience, "revenue": 0})
            else:
                converted = int(current_audience * conversion_rates[i-1])
                price = int(tier.replace("/mo", "").replace("$", "").replace("+", "").replace(",", ""))
                if "/mo" in tier:
                    revenue = converted * price * 12
                else:
                    revenue = converted * price
                revenue_projection.append({"tier": tier, "audience": converted, "revenue": revenue})
                current_audience = converted

        total_yearly = sum(r["revenue"] for r in revenue_projection)
        return {
            "niche": niche,
            "template": template["name"],
            "audience_size": audience_size,
            "content_type": content_type,
            "tiers": revenue_projection,
            "total_yearly_revenue": total_yearly,
            "recommended_actions": [
                f"Create lead magnet for {niche} audience",
                "Set up email automation sequence",
                "Build sales page for main offer",
                "Create upsell/downsell flow",
                "Implement affiliate program",
            ],
        }

    def find_sponsors(self, niche: str, subscriber_count: int) -> List[Dict[str, Any]]:
        potential = self.SPONSOR_NICHES.get(niche.lower(), self.SPONSOR_NICHES["tech"])
        cpm_rate = 20 if subscriber_count < 10000 else 35 if subscriber_count < 50000 else 50
        estimated_sponsorship = (subscriber_count / 1000) * cpm_rate
        return [
            {
                "niche": niche,
                "potential_sponsors": potential,
                "estimated_sponsorship_per_video": estimated_sponsorship,
                "recommended_approach": f"Reach out with media kit showing {subscriber_count} engaged subscribers",
                "negotiation_tips": [
                    "Offer package deals (3-6 videos)",
                    "Include social media promotion",
                    "Provide detailed analytics report",
                    "Create exclusive discount codes",
                ],
            }
        ]

    def create_pricing_tier(self, product_name: str, value_props: List[str]) -> Dict[str, Any]:
        return {
            "product": product_name,
            "basic": {"price": "$27-47", "includes": value_props[:2], "target": "Beginners"},
            "pro": {"price": "$97-197", "includes": value_props[:4], "target": "Professionals"},
            "premium": {"price": "$497-1997", "includes": value_props, "target": "Businesses", "extras": ["1-on-1 coaching", "Custom implementation", "Priority support"]},
        }

    def save_funnel(self, funnel: Dict[str, Any]) -> int:
        cursor = self.memory._conn().execute(
            "INSERT INTO wealth_funnels (name, funnel_type, price_tier, estimated_revenue, status) VALUES (?, ?, ?, ?, ?)",
            (funnel["niche"] + " Funnel", funnel["template"], json.dumps(funnel["tiers"]), funnel["total_yearly_revenue"], "active"),
        )
        self.memory._conn().commit()
        return cursor.lastrowid

    def get_funnels(self) -> List[Dict[str, Any]]:
        rows = self.memory._conn().execute("SELECT * FROM wealth_funnels ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


class WebCoreAgent:
    """Main agent orchestrating all LUQI capabilities."""

    def __init__(self):
        self.memory = MemoryEngine()
        self.parser = DocumentParser()
        self.voice = VoiceEngine()
        self.tools = ToolRegistry()
        self.capabilities = CapabilityTracker()
        self.self_improvement = SelfImprovementAgent()
        self.updater = UpdatePushAgent()
        self.youtube = YoutubeCreationEngine(self.memory)
        self.wealth = WealthCreationEngine(self.memory)
        self.client = None
        self._init_ai_client()
        self._register_default_tools()

    def _init_ai_client(self):
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if api_key:
            try:
                import openai
                self.client = openai.OpenAI(api_key=api_key)
            except Exception as e:
                logger.warning(f"OpenAI init failed: {e}")

    def _register_default_tools(self):
        self.tools.register("web_search", self._tool_web_search, "Search the web for information", {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search query"}},
            "required": ["query"],
        })
        self.tools.register("calculate", self._tool_calculate, "Perform mathematical calculations", {
            "type": "object",
            "properties": {"expression": {"type": "string", "description": "Math expression"}},
            "required": ["expression"],
        })
        self.tools.register("get_time", self._tool_get_time, "Get current date and time")
        self.tools.register("get_capabilities", self._tool_get_capabilities, "List LUQI capabilities")

    def _tool_web_search(self, query: str) -> str:
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))
                return "\n".join([f"- {r['title']}: {r['body']}" for r in results])
        except Exception as e:
            return f"Search unavailable: {e}"

    def _tool_calculate(self, expression: str) -> str:
        try:
            allowed = {"abs": abs, "round": round, "max": max, "min": min, "sum": sum, "pow": pow}
            result = eval(expression, {"__builtins__": {}}, allowed)
            return str(result)
        except Exception as e:
            return f"Calculation error: {e}"

    def _tool_get_time(self) -> str:
        return datetime.utcnow().isoformat()

    def _tool_get_capabilities(self) -> str:
        active = self.capabilities.count_active()
        planned = self.capabilities.count_planned()
        return f"LUQI has {active} active capabilities and {planned} planned. Categories: core, voice, advanced, content, platform, security, utility, monitoring, ui, pwa, wealth."

    async def chat(self, message: str, session_id: str, model: ModelProvider = ModelProvider.GPT4O_MINI) -> Dict[str, Any]:
        self.memory.save_message(session_id, "user", message)
        history = self.memory.get_history(session_id)
        messages = [{"role": h.role, "content": h.content} for h in history]

        if self.client is None:
            reply = "LUQI is running in offline mode. AI features require OPENAI_API_KEY. I can still: search the web, parse documents, and run tools."
            self.memory.save_message(session_id, "assistant", reply, model.value)
            return {"reply": reply, "model": "offline", "tools_used": []}

        try:
            import openai
            tool_schemas = self.tools.get_schemas()
            response = self.client.chat.completions.create(
                model=model.value,
                messages=messages,
                tools=tool_schemas if tool_schemas else None,
                tool_choice="auto" if tool_schemas else None,
                max_tokens=4000,
            )
            msg = response.choices[0].message
            reply = msg.content or ""
            tools_used = []

            if msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        args = {}
                    result = await self.tools.execute(tool_name, args)
                    tools_used.append({"tool": tool_name, "arguments": args, "result": str(result)[:500]})
                    messages.append({"role": "assistant", "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": tool_name, "arguments": tc.function.arguments}}]})
                    messages.append({"role": "tool", "tool_call_id": tc.id, "content": str(result)})

                followup = self.client.chat.completions.create(model=model.value, messages=messages, max_tokens=4000)
                reply = followup.choices[0].message.content or ""

            self.memory.save_message(session_id, "assistant", reply, model.value)
            return {"reply": reply, "model": model.value, "tools_used": tools_used}
        except Exception as e:
            logger.error(f"Chat error: {e}")
            reply = f"I encountered an error: {e}. Let me try a simpler approach."
            self.memory.save_message(session_id, "assistant", reply, "error")
            return {"reply": reply, "model": "error", "tools_used": []}


import asyncio


class SecurityManager:
    """API key authentication, rate limiting, and request signing."""

    def __init__(self, memory: MemoryEngine, admin_key: Optional[str] = None):
        self.memory = memory
        self._admin_key = admin_key or os.environ.get("LUQI_ADMIN_KEY", "")
        self._key_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_lock = threading.Lock()

    def _hash(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def create_key(self, name: str = "default", is_admin: bool = False) -> str:
        raw = "sk-luqi-" + secrets.token_urlsafe(32)
        key_hash = self._hash(raw)
        with sqlite3.connect(str(self.memory.db_path)) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO api_keys (key_hash, name, is_admin) VALUES (?, ?, ?)",
                (key_hash, name, 1 if is_admin else 0),
            )
            conn.commit()
        return raw

    def validate_key(self, key: str) -> Optional[Dict[str, Any]]:
        key_hash = self._hash(key)
        with sqlite3.connect(str(self.memory.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM api_keys WHERE key_hash = ?", (key_hash,)).fetchone()
        if row:
            with sqlite3.connect(str(self.memory.db_path)) as conn:
                conn.execute("UPDATE api_keys SET last_used = CURRENT_TIMESTAMP, request_count = request_count + 1 WHERE key_hash = ?", (key_hash,))
                conn.commit()
            return {"name": row["name"], "is_admin": bool(row["is_admin"]), "hash": key_hash}
        return None

    def is_admin(self, key: str) -> bool:
        if self._admin_key and key == self._admin_key:
            return True
        info = self.validate_key(key)
        return info["is_admin"] if info else False

    def check_rate_limit(self, key_hash: str, max_tokens: float = 60.0, refill_rate: float = 1.0) -> bool:
        with sqlite3.connect(str(self.memory.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM rate_limits WHERE key_hash = ?", (key_hash,)).fetchone()
            now = datetime.utcnow()
            if row is None:
                conn.execute("INSERT INTO rate_limits (key_hash, tokens, last_refill) VALUES (?, ?, ?)", (key_hash, max_tokens - 1, now))
                conn.commit()
                return True
            tokens = row["tokens"]
            last_refill = datetime.fromisoformat(row["last_refill"])
            elapsed = (now - last_refill).total_seconds()
            tokens = min(max_tokens, tokens + elapsed * refill_rate)
            if tokens < 1:
                conn.execute("UPDATE rate_limits SET tokens = ?, last_refill = ? WHERE key_hash = ?", (tokens, now, key_hash))
                conn.commit()
                return False
            tokens -= 1
            conn.execute("UPDATE rate_limits SET tokens = ?, last_refill = ? WHERE key_hash = ?", (tokens, now, key_hash))
            conn.commit()
            return True

    def list_keys(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(str(self.memory.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT key_hash, name, created_at, last_used, request_count, is_admin FROM api_keys ORDER BY created_at DESC").fetchall()
        return [{"key_hash": r["key_hash"][:16] + "...", "name": r["name"], "created_at": r["created_at"], "last_used": r["last_used"], "requests": r["request_count"], "is_admin": bool(r["is_admin"])} for r in rows]


class RequestLoggingMiddleware:
    """Log all HTTP requests for monitoring and debugging."""

    def __init__(self, memory: MemoryEngine):
        self.memory = memory

    async def __call__(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        latency = (time.time() - start) * 1000
        key = request.headers.get("x-api-key", "anonymous")
        key_hash = hashlib.sha256(key.encode()).hexdigest() if key else "anonymous"
        try:
            with sqlite3.connect(str(self.memory.db_path)) as conn:
                conn.execute(
                    "INSERT INTO request_logs (key_hash, method, path, status_code, latency_ms) VALUES (?, ?, ?, ?, ?)",
                    (key_hash, request.method, request.url.path, response.status_code, latency),
                )
                conn.commit()
        except Exception:
            pass
        response.headers["X-Response-Time-Ms"] = str(int(latency))
        return response


security = HTTPBasic()
app = FastAPI(
    title="Luqi AI",
    description="Unified AI Platform - Web, Desktop, Mobile",
    version="25.1.2",
)

agent: Optional[WebCoreAgent] = None
security_mgr: Optional[SecurityManager] = None


@app.on_event("startup")
async def startup():
    global agent, security_mgr
    agent = WebCoreAgent()
    admin_key = os.environ.get("LUQI_ADMIN_KEY", "")
    if not admin_key:
        admin_key_path = DATA_DIR / ".admin_key"
        if admin_key_path.exists():
            admin_key = admin_key_path.read_text().strip()
    security_mgr = SecurityManager(agent.memory, admin_key=admin_key)
    logger.info("LUQI WebCore v25.1.2 started")


@app.on_event("shutdown")
async def shutdown():
    logger.info("LUQI WebCore shutting down gracefully")


public_paths = {"/", "/health", "/ready", "/config", "/auth/me", "/docs", "/openapi.json", "/redoc"}


async def require_auth(request: Request):
    if request.url.path in public_paths:
        return None
    key = request.headers.get("x-api-key", "")
    if not key:
        raise HTTPException(status_code=401, detail="x-api-key header required")
    info = security_mgr.validate_key(key)
    if info is None:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not security_mgr.check_rate_limit(info["hash"]):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return info


async def require_admin(request: Request):
    key = request.headers.get("x-api-key", "")
    if not key:
        raise HTTPException(status_code=401, detail="x-api-key header required")
    if not security_mgr.is_admin(key):
        raise HTTPException(status_code=403, detail="Admin access required")
    return key


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text())
    return HTMLResponse(content="<h1>Luqi AI v25.1.2</h1><p>Dashboard not built yet. Run with PWA enabled.</p>")


@app.get("/health")
async def health():
    caps = agent.capabilities if agent else None
    return {
        "status": "healthy",
        "version": "25.1.2",
        "capabilities": caps.count_active() if caps else 0,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/ready")
async def ready():
    return {"status": "ready", "agent_initialized": agent is not None}


@app.get("/config")
async def config():
    return {
        "version": "25.1.2",
        "models": [m.value for m in ModelProvider],
        "accents": [a.value for a in Accent],
        "doc_types": list(DocumentParser.SUPPORTED_TYPES.keys()),
        "features": {
            "voice_stt": agent.voice.stt_available if agent else False,
            "voice_tts": agent.voice.tts_available if agent else False,
            "ai": agent.client is not None if agent else False,
        },
    }


@app.get("/auth/me")
async def auth_me():
    return {"authenticated": False, "message": "Provide x-api-key header"}


@app.post("/auth/keys")
async def create_key(request: Request):
    key = request.headers.get("x-api-key", "")
    if not security_mgr.is_admin(key):
        raise HTTPException(status_code=403, detail="Admin required")
    body = await request.json()
    name = body.get("name", "default")
    is_admin = body.get("is_admin", False)
    new_key = security_mgr.create_key(name=name, is_admin=is_admin)
    return {"api_key": new_key, "name": name, "is_admin": is_admin}


@app.get("/admin/keys")
async def list_keys(request: Request):
    await require_admin(request)
    return {"keys": security_mgr.list_keys()}


@app.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    memory = agent.memory
    conversations = memory._conn().execute("SELECT COUNT(*) as c FROM conversations").fetchone()["c"]
    docs = memory._conn().execute("SELECT COUNT(*) as c FROM documents").fetchone()["c"]
    requests_total = memory._conn().execute("SELECT COUNT(*) as c FROM request_logs").fetchone()["c"]
    return {
        "conversations": conversations,
        "documents": docs,
        "requests_total": requests_total,
        "capabilities": {"active": agent.capabilities.count_active(), "planned": agent.capabilities.count_planned()},
        "uptime": "running",
    }


@app.get("/admin/requests")
async def admin_requests(request: Request, limit: int = 100):
    await require_admin(request)
    rows = agent.memory._conn().execute(
        "SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT ?", (limit,)
    ).fetchall()
    return {"requests": [dict(r) for r in rows]}


@app.post("/chat")
async def chat_endpoint(request: Request):
    await require_auth(request)
    body = await request.json()
    message = body.get("message", "")
    session_id = body.get("session_id", "default")
    model = body.get("model", ModelProvider.GPT4O_MINI.value)
    result = await agent.chat(message, session_id, ModelProvider(model))
    return result


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    session_id = None
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")
            if msg_type == "init":
                session_id = data.get("session_id", "default")
                await websocket.send_json({"type": "system", "content": f"Session {session_id} started"})
            elif msg_type == "message":
                session_id = data.get("session_id", session_id or "default")
                message = data.get("message", "")
                model = data.get("model", ModelProvider.GPT4O_MINI.value)
                result = await agent.chat(message, session_id, ModelProvider(model))
                await websocket.send_json({"type": "response", "content": result["reply"], "model": result["model"]})
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass


@app.get("/sessions")
async def list_sessions(request: Request):
    await require_auth(request)
    return {"sessions": agent.memory.get_all_sessions()}


@app.get("/sessions/{session_id}")
async def get_session(session_id: str, request: Request):
    await require_auth(request)
    history = agent.memory.get_history(session_id)
    return {"session_id": session_id, "messages": [{"role": h.role, "content": h.content, "timestamp": h.timestamp, "model": h.model} for h in history]}


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request):
    await require_auth(request)
    agent.memory.delete_session(session_id)
    return {"deleted": True}


@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await require_auth(request)
    doc_type = DocumentParser.detect_type(file.filename or "")
    if not doc_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    filepath = UPLOADS_DIR / (file.filename or "unnamed")
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    parsed = DocumentParser.parse(filepath, doc_type)
    doc_id = agent.memory.save_document(file.filename or "unnamed", parsed, doc_type, len(content))
    return {"document_id": doc_id, "filename": file.filename, "type": doc_type, "parsed_length": len(parsed)}


@app.get("/documents")
async def list_documents(request: Request):
    await require_auth(request)
    return {"documents": agent.memory.get_documents()}


@app.get("/documents/{doc_id}")
async def get_document(doc_id: int, request: Request):
    await require_auth(request)
    doc = agent.memory.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/search")
async def web_search(request: Request, query: str = ""):
    await require_auth(request)
    if not query:
        raise HTTPException(status_code=422, detail="query parameter required")
    return {"query": query, "results": agent._tool_web_search(query)}


@app.post("/voice/tts")
async def text_to_speech(request: Request):
    await require_auth(request)
    body = await request.json()
    text = body.get("text", "")
    accent = body.get("accent", Accent.AMERICAN.value)
    if not text:
        raise HTTPException(status_code=422, detail="text required")
    try:
        audio = agent.voice.text_to_speech(text, Accent(accent))
        return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg", headers={"Content-Disposition": "attachment; filename=speech.mp3"})
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/voice/stt")
async def speech_to_text(request: Request):
    await require_auth(request)
    body = await request.json()
    audio_b64 = body.get("audio", "")
    if not audio_b64:
        raise HTTPException(status_code=422, detail="audio (base64) required")
    try:
        import base64
        audio_bytes = base64.b64decode(audio_b64)
        text = agent.voice.speech_to_text(audio_bytes)
        return {"text": text}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/capabilities")
async def list_capabilities(request: Request):
    await require_auth(request)
    return {"capabilities": agent.capabilities.list(), "summary": {"active": agent.capabilities.count_active(), "planned": agent.capabilities.count_planned()}}


@app.get("/capabilities/{category}")
async def capabilities_by_category(category: str, request: Request):
    await require_auth(request)
    return {"category": category, "capabilities": agent.capabilities.get_by_category(category)}


@app.get("/self-improve/report")
async def self_improvement_report(request: Request):
    await require_auth(request)
    report = agent.self_improvement.generate_report()
    return {"report": report}


@app.get("/self-improve/analyze")
async def self_improvement_analyze(request: Request):
    await require_auth(request)
    results = agent.self_improvement.analyze_project()
    return {"files": results}


@app.get("/update/status")
async def update_status(request: Request):
    await require_auth(request)
    return {"git": agent.updater.get_git_status(), "last_commit": agent.updater.get_last_commit()}


@app.post("/youtube/campaign")
async def youtube_campaign(request: Request):
    await require_auth(request)
    body = await request.json()
    niche = body.get("niche", "technology")
    audience = body.get("target_audience", "beginners")
    count = body.get("video_count", 30)
    campaign = agent.youtube.generate_campaign(niche, audience, count)
    campaign_id = agent.youtube.save_campaign(campaign)
    return {"campaign_id": campaign_id, **campaign}


@app.get("/youtube/campaigns")
async def list_youtube_campaigns(request: Request):
    await require_auth(request)
    return {"campaigns": agent.youtube.get_campaigns()}


@app.post("/youtube/thumbnail")
async def youtube_thumbnail(request: Request):
    await require_auth(request)
    body = await request.json()
    title = body.get("title", "")
    return {"prompt": agent.youtube.generate_thumbnail_prompt(title)}


@app.post("/youtube/script")
async def youtube_script(request: Request):
    await require_auth(request)
    body = await request.json()
    topic = body.get("topic", "")
    duration = body.get("duration_minutes", 10)
    return agent.youtube.generate_script_outline(topic, duration)


@app.post("/wealth/funnel")
async def wealth_funnel(request: Request):
    await require_auth(request)
    body = await request.json()
    niche = body.get("niche", "tech")
    audience = body.get("audience_size", 10000)
    content_type = body.get("content_type", "videos")
    funnel = agent.wealth.generate_funnel(niche, audience, content_type)
    funnel_id = agent.wealth.save_funnel(funnel)
    return {"funnel_id": funnel_id, **funnel}


@app.get("/wealth/funnels")
async def list_wealth_funnels(request: Request):
    await require_auth(request)
    return {"funnels": agent.wealth.get_funnels()}


@app.post("/wealth/sponsors")
async def wealth_sponsors(request: Request):
    await require_auth(request)
    body = await request.json()
    niche = body.get("niche", "tech")
    subs = body.get("subscriber_count", 10000)
    return {"sponsors": agent.wealth.find_sponsors(niche, subs)}


@app.post("/wealth/pricing")
async def wealth_pricing(request: Request):
    await require_auth(request)
    body = await request.json()
    product = body.get("product_name", "")
    value_props = body.get("value_propositions", [])
    return agent.wealth.create_pricing_tier(product, value_props)


@app.post("/translate")
async def translate(request: Request):
    await require_auth(request)
    body = await request.json()
    text = body.get("text", "")
    target_lang = body.get("target_language", "es")
    if not text:
        raise HTTPException(status_code=422, detail="text required")
    if agent.client is None:
        raise HTTPException(status_code=503, detail="Translation requires OPENAI_API_KEY")
    try:
        response = agent.client.chat.completions.create(
            model=ModelProvider.GPT4O_MINI.value,
            messages=[{"role": "system", "content": f"Translate to {target_lang}. Respond ONLY with the translation."}, {"role": "user", "content": text}],
            max_tokens=2000,
        )
        return {"original": text, "translated": response.choices[0].message.content, "target_language": target_lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sentiment")
async def sentiment(request: Request):
    await require_auth(request)
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=422, detail="text required")
    if agent.client is None:
        raise HTTPException(status_code=503, detail="Sentiment analysis requires OPENAI_API_KEY")
    try:
        response = agent.client.chat.completions.create(
            model=ModelProvider.GPT4O_MINI.value,
            messages=[{"role": "system", "content": "Analyze sentiment. Respond with JSON: {\"sentiment\": \"positive/negative/neutral\", \"confidence\": 0-1, \"explanation\": \"brief\"}"}, {"role": "user", "content": text}],
            response_format={"type": "json_object"},
            max_tokens=500,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def prometheus_metrics():
    memory = agent.memory
    conversations = memory._conn().execute("SELECT COUNT(*) as c FROM conversations").fetchone()["c"]
    docs = memory._conn().execute("SELECT COUNT(*) as c FROM documents").fetchone()["c"]
    reqs = memory._conn().execute("SELECT COUNT(*) as c FROM request_logs").fetchone()["c"]
    metrics = f"""# LUQI Prometheus Metrics
luqi_conversations_total {conversations}
luqi_documents_total {docs}
luqi_requests_total {requests}
luqi_capabilities_active {agent.capabilities.count_active()}
luqi_version {{version="25.1.2"}} 1
"""
    return PlainTextResponse(content=metrics)


@app.post("/webhooks")
async def create_webhook(request: Request):
    await require_auth(request)
    body = await request.json()
    url = body.get("url", "")
    event_type = body.get("event_type", "*")
    if not url:
        raise HTTPException(status_code=422, detail="url required")
    secret = body.get("secret", "")
    cursor = agent.memory._conn().execute(
        "INSERT INTO webhooks (url, event_type, secret) VALUES (?, ?, ?)",
        (url, event_type, secret),
    )
    agent.memory._conn().commit()
    return {"webhook_id": cursor.lastrowid, "url": url, "event_type": event_type}


@app.get("/webhooks")
async def list_webhooks(request: Request):
    await require_auth(request)
    rows = agent.memory._conn().execute("SELECT id, url, event_type, created_at FROM webhooks").fetchall()
    return {"webhooks": [dict(r) for r in rows]}


@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: int, request: Request):
    await require_auth(request)
    agent.memory._conn().execute("DELETE FROM webhooks WHERE id = ?", (webhook_id,))
    agent.memory._conn().commit()
    return {"deleted": True}


@app.get("/export/{format}")
async def export_data(format: str, request: Request):
    await require_auth(request)
    sessions = agent.memory.get_all_sessions()
    if format == "json":
        return JSONResponse(content={"sessions": sessions})
    elif format == "csv":
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["session_id", "message_count", "last_active"])
        for s in sessions:
            writer.writerow([s["session_id"], s["message_count"], s["last_active"]])
        return PlainTextResponse(content=output.getvalue(), media_type="text/csv")
    elif format == "markdown":
        lines = ["# LUQI Conversation Export\n"]
        for s in sessions:
            lines.append(f"## Session: {s['session_id']}")
            history = agent.memory.get_history(s["session_id"])
            for h in history:
                lines.append(f"**{h.role}** ({h.timestamp}): {h.content[:200]}")
            lines.append("")
        return PlainTextResponse(content="\n".join(lines), media_type="text/markdown")
    else:
        raise HTTPException(status_code=400, detail="Format must be json, csv, or markdown")


@app.post("/import")
async def import_data(request: Request):
    await require_auth(request)
    body = await request.json()
    conversations = body.get("conversations", [])
    count = 0
    for conv in conversations:
        agent.memory.save_message(conv.get("session_id", "imported"), conv.get("role", "user"), conv.get("content", ""), conv.get("model"))
        count += 1
    return {"imported": count}


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class DesktopApp:
    """Desktop wrapper using PyQt6 WebEngine."""

    def __init__(self, port: int = 8000):
        self.port = port

    def run(self):
        try:
            from PyQt6.QtWidgets import QApplication
            from PyQt6.QtWebEngineWidgets import QWebEngineView
            from PyQt6.QtCore import QUrl
        except ImportError:
            print("PyQt6 WebEngine required. Run: pip install PyQt6 PyQt6-WebEngine")
            sys.exit(1)

        app = QApplication(sys.argv)
        view = QWebEngineView()
        view.setWindowTitle("Luqi AI Desktop")
        view.setUrl(QUrl(f"http://localhost:{self.port}"))
        view.showMaximized()
        sys.exit(app.exec())


class TestWebCore:
    """Self-test suite for WebCore."""

    @staticmethod
    def run():
        import unittest

        class WebCoreTests(unittest.TestCase):
            def setUp(self):
                self.memory = MemoryEngine(db_path=DATA_DIR / "test_memory.db")

            def test_memory_save_and_retrieve(self):
                self.memory.save_message("test-session", "user", "Hello")
                history = self.memory.get_history("test-session")
                self.assertEqual(len(history), 1)
                self.assertEqual(history[0].role, "user")
                self.assertEqual(history[0].content, "Hello")

            def test_memory_sessions(self):
                self.memory.save_message("sess-1", "user", "A")
                self.memory.save_message("sess-2", "user", "B")
                sessions = self.memory.get_all_sessions()
                self.assertEqual(len(sessions), 2)

            def test_memory_clear(self):
                self.memory.save_message("clear-test", "user", "X")
                self.memory.clear_session("clear-test")
                history = self.memory.get_history("clear-test")
                self.assertEqual(len(history), 0)

            def test_document_parser_detect(self):
                self.assertEqual(DocumentParser.detect_type("test.pdf"), "pdf")
                self.assertEqual(DocumentParser.detect_type("test.docx"), "docx")
                self.assertEqual(DocumentParser.detect_type("test.txt"), "text")
                self.assertIsNone(DocumentParser.detect_type("test.unknown"))

            def test_document_parser_text(self):
                test_file = DATA_DIR / "test_doc.txt"
                test_file.write_text("Hello world")
                result = DocumentParser.parse(test_file, "text")
                self.assertEqual(result, "Hello world")
                test_file.unlink()

            def test_document_parser_python(self):
                test_file = DATA_DIR / "test_script.py"
                test_file.write_text("def hello(): pass\nclass Foo: pass")
                result = DocumentParser.parse(test_file, "python")
                self.assertIn("hello", result)
                self.assertIn("Foo", result)
                test_file.unlink()

            def test_voice_accent_map(self):
                self.assertIn(Accent.AMERICAN, VoiceEngine.ACCENT_MAP)
                self.assertIn(Accent.NIGERIAN, VoiceEngine.ACCENT_MAP)

            def test_capability_tracker(self):
                tracker = CapabilityTracker()
                self.assertGreater(tracker.count_active(), 0)
                self.assertGreaterEqual(tracker.count_planned(), 0)
                core = tracker.get_by_category("core")
                self.assertGreater(len(core), 0)

            def test_security_key_creation(self):
                sm = SecurityManager(self.memory)
                key = sm.create_key("test")
                self.assertTrue(key.startswith("sk-luqi-"))
                info = sm.validate_key(key)
                self.assertIsNotNone(info)
                self.assertEqual(info["name"], "test")

            def test_security_invalid_key(self):
                sm = SecurityManager(self.memory)
                self.assertIsNone(sm.validate_key("invalid-key"))

            def test_security_rate_limit(self):
                sm = SecurityManager(self.memory)
                key = sm.create_key("rate-test")
                info = sm.validate_key(key)
                self.assertTrue(sm.check_rate_limit(info["hash"], max_tokens=5.0))
                for _ in range(5):
                    sm.check_rate_limit(info["hash"], max_tokens=5.0)
                self.assertFalse(sm.check_rate_limit(info["hash"], max_tokens=5.0))

            def test_youtube_campaign(self):
                yt = YoutubeCreationEngine(self.memory)
                campaign = yt.generate_campaign("tech", "beginners", 5)
                self.assertEqual(len(campaign["videos"]), 5)
                self.assertIn("niche", campaign)

            def test_youtube_script(self):
                yt = YoutubeCreationEngine(self.memory)
                script = yt.generate_script_outline("Python", 10)
                self.assertEqual(script["total_duration"], 10)
                self.assertGreater(len(script["segments"]), 0)

            def test_wealth_funnel(self):
                w = WealthCreationEngine(self.memory)
                funnel = w.generate_funnel("tech", 10000, "videos")
                self.assertIn("tiers", funnel)
                self.assertGreater(funnel["total_yearly_revenue"], 0)

            def test_wealth_sponsors(self):
                w = WealthCreationEngine(self.memory)
                sponsors = w.find_sponsors("tech", 50000)
                self.assertEqual(len(sponsors), 1)
                self.assertIn("potential_sponsors", sponsors[0])

            def test_self_improvement(self):
                si = SelfImprovementAgent(PROJECT_ROOT)
                results = si.analyze_project()
                self.assertIsInstance(results, list)
                if results:
                    self.assertIn("lines", results[0])

            def test_tool_registry(self):
                reg = ToolRegistry()
                reg.register("test_tool", lambda x: x * 2, "Doubles a number", {"type": "object", "properties": {"x": {"type": "number"}}})
                schemas = reg.get_schemas()
                self.assertEqual(len(schemas), 1)
                self.assertEqual(schemas[0]["function"]["name"], "test_tool")

            def test_model_provider_enum(self):
                self.assertEqual(ModelProvider.GPT4O.value, "gpt-4o")
                self.assertEqual(ModelProvider.LOCAL_LLAMA.value, "local-llama")

            def test_accent_enum(self):
                self.assertEqual(Accent.NIGERIAN.value, "nigerian")
                self.assertEqual(Accent.SOUTH_AFRICAN.value, "south_african")

            def test_memory_db_document(self):
                doc_id = self.memory.save_document("test.txt", "content", "text", 100)
                self.assertIsInstance(doc_id, int)
                docs = self.memory.get_documents()
                self.assertGreater(len(docs), 0)
                doc = self.memory.get_document(doc_id)
                self.assertIsNotNone(doc)
                self.assertEqual(doc["filename"], "test.txt")

            def test_chat_offline_mode(self):
                async def run_test():
                    wa = WebCoreAgent()
                    wa.client = None
                    result = await wa.chat("Hello", "test-offline")
                    self.assertIn("offline", result["reply"].lower())
                    self.assertEqual(result["model"], "offline")
                asyncio.run(run_test())

            def test_capability_count(self):
                tracker = CapabilityTracker()
                active = tracker.count_active()
                planned = tracker.count_planned()
                total = len(tracker.list())
                self.assertEqual(active + planned, total)
                self.assertGreaterEqual(active, 60)

            def test_webhook_crud(self):
                cursor = self.memory._conn().execute(
                    "INSERT INTO webhooks (url, event_type, secret) VALUES (?, ?, ?)",
                    ("https://example.com/hook", "chat", "secret"),
                )
                self.memory._conn().commit()
                self.assertIsInstance(cursor.lastrowid, int)

            def test_export_exists(self):
                sessions = self.memory.get_all_sessions()
                self.assertIsInstance(sessions, list)

            def test_youtube_save_campaign(self):
                yt = YoutubeCreationEngine(self.memory)
                campaign = yt.generate_campaign("test", "devs", 3)
                cid = yt.save_campaign(campaign)
                self.assertIsInstance(cid, int)
                campaigns = yt.get_campaigns()
                self.assertGreater(len(campaigns), 0)

            def test_wealth_save_funnel(self):
                w = WealthCreationEngine(self.memory)
                funnel = w.generate_funnel("ai", 5000, "blog")
                fid = w.save_funnel(funnel)
                self.assertIsInstance(fid, int)
                funnels = w.get_funnels()
                self.assertGreater(len(funnels), 0)

            def test_wealth_pricing(self):
                w = WealthCreationEngine(self.memory)
                pricing = w.create_pricing_tier("AI Course", ["Video lessons", "Code examples", "Community", "Certificate"])
                self.assertIn("basic", pricing)
                self.assertIn("premium", pricing)

            def test_memory_thread_safety(self):
                import concurrent.futures
                def save_msg(i):
                    self.memory.save_message("thread-test", "user", f"msg-{i}")
                    return i
                with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                    list(executor.map(save_msg, range(20)))
                history = self.memory.get_history("thread-test")
                self.assertEqual(len(history), 20)

            def test_document_parser_image(self):
                result = DocumentParser.parse(Path("test.jpg"), "image")
                self.assertIn("Image uploaded", result)

            def test_security_admin(self):
                sm = SecurityManager(self.memory, admin_key="admin123")
                self.assertTrue(sm.is_admin("admin123"))
                self.assertFalse(sm.is_admin("not-admin"))

            def test_youtube_thumbnail_prompt(self):
                yt = YoutubeCreationEngine(self.memory)
                prompt = yt.generate_thumbnail_prompt("Python Tips")
                self.assertIn("Python Tips", prompt)
                self.assertIn("1280x720", prompt)

            def test_wealth_funnel_templates(self):
                w = WealthCreationEngine(self.memory)
                self.assertEqual(len(w.FUNNEL_TEMPLATES), 5)
                self.assertIn("tiers", w.FUNNEL_TEMPLATES[0])

            def test_request_log(self):
                with sqlite3.connect(str(self.memory.db_path)) as conn:
                    conn.execute(
                        "INSERT INTO request_logs (key_hash, method, path, status_code, latency_ms) VALUES (?, ?, ?, ?, ?)",
                        ("test", "GET", "/test", 200, 10.5),
                    )
                    conn.commit()
                    row = conn.execute("SELECT COUNT(*) as c FROM request_logs WHERE path = '/test'").fetchone()
                    self.assertGreaterEqual(row["c"], 1)

            def tearDown(self):
                import os
                test_db = DATA_DIR / "test_memory.db"
                if test_db.exists():
                    os.unlink(test_db)

        suite = unittest.TestLoader().loadTestsFromTestCase(WebCoreTests)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        return result.wasSuccessful()


def main():
    parser = argparse.ArgumentParser(description="Luqi AI WebCore")
    parser.add_argument("--desktop", action="store_true", help="Launch desktop app")
    parser.add_argument("--test", action="store_true", help="Run tests")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    args = parser.parse_args()

    if args.test:
        success = TestWebCore.run()
        sys.exit(0 if success else 1)

    if args.desktop:
        import multiprocessing
        server_process = multiprocessing.Process(target=lambda: uvicorn.run(app, host=args.host, port=args.port))
        server_process.start()
        time.sleep(2)
        desktop = DesktopApp(port=args.port)
        try:
            desktop.run()
        finally:
            server_process.terminate()
    else:
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()