"""
web_core.config - Centralized settings.
"""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
DATA_DIR = PROJECT_ROOT / "data"
DB_FILE = DATA_DIR / "luqi_web.db"
SANDBOX_DIR = DATA_DIR / "sandbox"
STATIC_DIR = DATA_DIR / "web_static"
UPLOADS_DIR = DATA_DIR / "uploads"

for d in (DATA_DIR, SANDBOX_DIR, STATIC_DIR, UPLOADS_DIR):
    d.mkdir(parents=True, exist_ok=True)

VERSION = "25.2.0"
CODENAME = "Modular LUQI"
DEFAULT_MODEL = "gpt-4o"
MAX_FILE_SIZE_MB = 50

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
ADMIN_KEY = os.environ.get("LUQI_ADMIN_KEY", "")
