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
DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "gpt-4o-mini")
ADMIN_KEY = os.environ.get("LUQI_ADMIN_KEY", "")

# ---------------------------------------------------------------------------
# NVIDIA Nemotron 3.5 Lightning
# ---------------------------------------------------------------------------
NEMOTRON_API_KEY = os.environ.get("NEMOTRON_API_KEY", "")
NEMOTRON_BASE_URL = os.environ.get("NEMOTRON_BASE_URL", "http://localhost:8000/v1")
NEMOTRON_MODEL = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3.5-lightning")
NEMOTRON_MAX_TOKENS = int(os.environ.get("NEMOTRON_MAX_TOKENS", "32768"))
NEMOTRON_CONTEXT_WINDOW = int(os.environ.get("NEMOTRON_CONTEXT_WINDOW", "1048576"))
NEMOTRON_TEMPERATURE = float(os.environ.get("NEMOTRON_TEMPERATURE", "0.7"))
NEMOTRON_TOP_P = float(os.environ.get("NEMOTRON_TOP_P", "0.9"))
NEMOTRON_TIMEOUT = float(os.environ.get("NEMOTRON_TIMEOUT", "120.0"))
NEMOTRON_MAX_RETRIES = int(os.environ.get("NEMOTRON_MAX_RETRIES", "3"))

# ---------------------------------------------------------------------------
# Cryptocurrency / SARS Tax
# ---------------------------------------------------------------------------
ENABLE_CRYPTO = os.environ.get("ENABLE_CRYPTO", "true").lower() in ("1", "true", "yes")
COINGECKO_API_KEY = os.environ.get("COINGECKO_API_KEY", "")
COINGECKO_BASE_URL = os.environ.get("COINGECKO_BASE_URL", "https://api.coingecko.com/api/v3")
BINANCE_BASE_URL = os.environ.get("BINANCE_BASE_URL", "https://api.binance.com")
CRYPTO_CACHE_TTL = int(os.environ.get("CRYPTO_CACHE_TTL", "60"))
DEFAULT_FIAT_CURRENCY = os.environ.get("DEFAULT_FIAT_CURRENCY", "zar")

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

# ---------------------------------------------------------------------------
# Settings singleton (for main.py compatibility)
# ---------------------------------------------------------------------------

class _Settings:
    """Unified settings object — mirrors all module-level constants."""

    # Version
    version = "29.1.0"
    codename = "Prometheus"
    environment = "development" if DEBUG else "production"

    # Paths
    PROJECT_ROOT = PROJECT_ROOT
    DATA_DIR = DATA_DIR
    STATIC_DIR = STATIC_DIR
    UPLOADS_DIR = UPLOADS_DIR
    LOG_DIR = DATA_DIR / "logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # Server
    host = HOST
    port = PORT
    workers = int(os.environ.get("WORKERS", "1"))
    reload = DEBUG

    # Logging
    log_to_file = os.environ.get("LOG_TO_FILE", "false").lower() in ("1", "true", "yes")
    log_level = os.environ.get("LOG_LEVEL", "INFO")

    # DB
    db_path = DB_PATH

    # AI
    openai_api_key = OPENAI_API_KEY
    openai_model = DEFAULT_MODEL

    # Nemotron
    nemotron_api_key = NEMOTRON_API_KEY
    nemotron_base_url = NEMOTRON_BASE_URL
    nemotron_model = NEMOTRON_MODEL
    nemotron_max_tokens = NEMOTRON_MAX_TOKENS
    nemotron_context_window = NEMOTRON_CONTEXT_WINDOW
    nemotron_temperature = NEMOTRON_TEMPERATURE
    nemotron_top_p = NEMOTRON_TOP_P
    nemotron_timeout = NEMOTRON_TIMEOUT
    nemotron_max_retries = NEMOTRON_MAX_RETRIES

    # Crypto
    enable_crypto = ENABLE_CRYPTO
    coingecko_api_key = COINGECKO_API_KEY
    coingecko_base_url = COINGECKO_BASE_URL
    binance_base_url = BINANCE_BASE_URL
    crypto_cache_ttl = CRYPTO_CACHE_TTL
    default_fiat_currency = DEFAULT_FIAT_CURRENCY

    # CORS
    cors_origins = CORS_ORIGINS

    @staticmethod
    def health_info():
        import sqlite3, shutil, datetime
        healthy = True
        checks = {}
        try:
            conn = sqlite3.connect(str(DB_PATH))
            conn.execute("SELECT 1")
            conn.close()
            checks["database"] = "ok"
        except Exception as e:
            checks["database"] = f"error: {e}"
            healthy = False
        try:
            du = shutil.disk_usage(DATA_DIR)
            checks["disk_free_gb"] = round(du.free / (1024**3), 2)
        except Exception as e:
            checks["disk"] = f"error: {e}"
            healthy = False
        checks["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
        return {"healthy": healthy, "checks": checks}


settings = _Settings()

# Legacy CONFIG dict (for omega_ai modules)
CONFIG = {
    "version": settings.version,
    "codename": settings.codename,
    "environment": settings.environment,
    "debug": DEBUG,
    "host": HOST,
    "port": PORT,
    "data_dir": str(DATA_DIR),
    "db_path": str(DB_PATH),
    "openai_api_key": OPENAI_API_KEY,
    "openai_model": DEFAULT_MODEL,
    "enable_sandbox": ENABLE_SANDBOX,
    "enable_voice": ENABLE_VOICE,
    "enable_websocket": ENABLE_WEBSOCKET,
    "cors_origins": CORS_ORIGINS,
    "enable_crypto": ENABLE_CRYPTO,
    "coingecko_api_key": COINGECKO_API_KEY,
    "coingecko_base_url": COINGECKO_BASE_URL,
    "binance_base_url": BINANCE_BASE_URL,
    "crypto_cache_ttl": CRYPTO_CACHE_TTL,
    "default_fiat_currency": DEFAULT_FIAT_CURRENCY,
}


def get_memory_dir(subdir: str = ""):
    """Return the path to a memory subdirectory."""
    d = DATA_DIR / "memory" / subdir
    d.mkdir(parents=True, exist_ok=True)
    return str(d)
