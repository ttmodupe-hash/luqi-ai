"""
Luqi AI Configuration - Centralized settings with .env support.
All environment variables are optional; sensible defaults are provided.

Usage:
    from config import settings
    db_path = settings.db_path
    model = settings.openai_model
"""

import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application settings loaded from environment with defaults."""

    PROJECT_ROOT: Path = Path(__file__).parent.resolve()
    DATA_DIR: Path = PROJECT_ROOT / "data"
    LOG_DIR: Path = PROJECT_ROOT / "data" / "logs"
    SANDBOX_DIR: Path = PROJECT_ROOT / "data" / "sandbox"

    host: str = os.getenv("LUQI_HOST", "0.0.0.0")
    port: int = int(os.getenv("LUQI_PORT", "8000"))
    workers: int = int(os.getenv("LUQI_WORKERS", "1"))
    reload: bool = os.getenv("LUQI_RELOAD", "false").lower() == "true"

    cors_origins: list = os.getenv(
        "LUQI_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,*"
    ).split(",")

    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("LUQI_MODEL", "gpt-4o")
    openai_max_tokens: int = int(os.getenv("LUQI_MAX_TOKENS", "2048"))

    db_path: Path = Path(os.getenv("LUQI_DB_PATH", str(DATA_DIR / "luqi.db")))

    voice_timeout: int = int(os.getenv("LUQI_VOICE_TIMEOUT", "5"))
    voice_accent: str = os.getenv("LUQI_VOICE_ACCENT", "uk")
    voice_language: str = os.getenv("LUQI_VOICE_LANGUAGE", "en")

    sandbox_timeout: int = int(os.getenv("LUQI_SANDBOX_TIMEOUT", "10"))
    max_file_size_mb: int = int(os.getenv("LUQI_MAX_FILE_SIZE_MB", "50"))

    alarm_time: str = os.getenv("LUQI_ALARM_TIME", "07:30")

    log_level: str = os.getenv("LUQI_LOG_LEVEL", "INFO")
    log_to_file: bool = os.getenv("LUQI_LOG_TO_FILE", "true").lower() == "true"

    api_key_header: str = os.getenv("LUQI_API_KEY_HEADER", "X-API-Key")
    require_api_key: bool = os.getenv("LUQI_REQUIRE_API_KEY", "false").lower() == "true"

    environment: str = os.getenv("LUQI_ENV", "development")
    version: str = "25.1.2"
    codename: str = "LUQI"

    @classmethod
    def ensure_dirs(cls):
        for d in (cls.DATA_DIR, cls.LOG_DIR, cls.SANDBOX_DIR):
            d.mkdir(parents=True, exist_ok=True)

    @classmethod
    def health_info(cls) -> dict:
        return {
            "version": cls.version,
            "codename": cls.codename,
            "environment": cls.environment,
            "model": cls.openai_model,
            "host": cls.host,
            "port": cls.port,
            "db_path": str(cls.db_path),
            "log_level": cls.log_level,
        }


settings = Settings()
settings.ensure_dirs()
