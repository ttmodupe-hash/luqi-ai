"""Config — Central configuration management."""

import os
from typing import Any, Dict


class Config:
    """Omega AI configuration manager."""

    def __init__(self):
        self._config: Dict[str, Any] = {
            "app_name": "Omega AI",
            "version": "29.1.0",
            "debug": os.getenv("DEBUG", "false").lower() == "true",
            "host": os.getenv("HOST", "0.0.0.0"),
            "port": int(os.getenv("PORT", "8000")),
            "database_url": os.getenv("DATABASE_URL", "sqlite:///omega_ai.db"),
            "redis_url": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            "secret_key": os.getenv("SECRET_KEY", "change-me"),
            "jwt_secret": os.getenv("JWT_SECRET", "change-me-too"),
            "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
            "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY", ""),
            "google_api_key": os.getenv("GOOGLE_API_KEY", ""),
            "huggingface_api_key": os.getenv("HUGGINGFACE_API_KEY", ""),
            "at_username": os.getenv("AT_USERNAME", ""),
            "at_api_key": os.getenv("AT_API_KEY", ""),
            "telegram_bot_token": os.getenv("TELEGRAM_BOT_TOKEN", ""),
            "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_user": os.getenv("SMTP_USER", ""),
            "smtp_pass": os.getenv("SMTP_PASS", ""),
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "enable_federated_learning": os.getenv("ENABLE_FEDERATED_LEARNING", "false").lower() == "true",
            "enable_blockchain_audit": os.getenv("ENABLE_BLOCKCHAIN_AUDIT", "false").lower() == "true",
            "data_dir": os.getenv("DATA_DIR", "./data"),
            "models_dir": os.getenv("MODELS_DIR", "./models"),
            "cache_dir": os.getenv("CACHE_DIR", "./cache"),
        }

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)

    def set(self, key: str, value: Any):
        self._config[key] = value

    def all(self) -> Dict[str, Any]:
        return self._config.copy()

    def is_debug(self) -> bool:
        return self._config.get("debug", False)


# Global config instance
config = Config()

if __name__ == "__main__":
    print(config.all())
