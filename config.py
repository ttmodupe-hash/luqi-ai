"""
Luqi AI — Project-level configuration
Reads from environment variables; provides sensible defaults for local dev.
"""

from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent.resolve()
DATA_DIR = PROJECT_ROOT / "data"
STATIC_DIR = PROJECT_ROOT / "app" / "dist"  # Vite build output
UPLOADS_DIR = PROJECT_ROOT / "uploads"

for d in (DATA_DIR, UPLOADS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
DEBUG = os.environ.get("DEBUG", "false").lower() in ("1", "true", "yes")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_raw_cors = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS = [s.strip() for s in _raw_cors.split(",") if s.strip()]

# ---------------------------------------------------------------------------
# AI / Keys
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
ADMIN_KEY = os.environ.get("LUQI_ADMIN_KEY", "")

DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "gpt-4o-mini")
MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "50"))

# ---------------------------------------------------------------------------
# Cache / DB
# ---------------------------------------------------------------------------
CACHE_DIR = DATA_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "luqi.db"

# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------
ENABLE_SANDBOX = os.environ.get("ENABLE_SANDBOX", "true").lower() in ("1", "true", "yes")
ENABLE_VOICE = os.environ.get("ENABLE_VOICE", "true").lower() in ("1", "true", "yes")
ENABLE_WEBSOCKET = os.environ.get("ENABLE_WEBSOCKET", "true").lower() in ("1", "true", "yes")
