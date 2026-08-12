"""Settings and configuration for LUQI AI"""
import os
from typing import Dict, Any
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "LUQI AI"
    APP_VERSION: str = "29.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://luqi:luqi@localhost:5432/luqi_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_ENABLED: bool = True
    
    # Auth
    JWT_SECRET: str = "luqi-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    
    # External APIs
    NVIDIA_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Monitoring
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings


def get_db_url() -> str:
    """Get database URL."""
    return settings.DATABASE_URL


def is_production() -> bool:
    """Check if running in production."""
    return settings.APP_ENV == "production"
