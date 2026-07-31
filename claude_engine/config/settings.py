"""Engine configuration via pydantic-settings.

Mirrors the 18 sacred ``ClaudeLikeEngine.__init__`` parameters from SPEC
section 2. Every field can be overridden through an environment variable
prefixed with ``CLAUDE_ENGINE_`` (e.g. ``CLAUDE_ENGINE_MODEL=gpt-4o``).
"""

from __future__ import annotations

from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PREFIX = "CLAUDE_ENGINE_"


class EngineSettings(BaseSettings):
    """Configuration for :class:`claude_engine.core.engine.ClaudeLikeEngine`.

    Field names and defaults mirror the engine's 18 ``__init__`` parameters
    exactly (SPEC section 2). Environment variables use the
    ``CLAUDE_ENGINE_`` prefix, e.g. ``CLAUDE_ENGINE_MAX_RETRIES=5``.

    ``memory`` and ``tools`` hold live objects rather than primitive
    configuration values; they are typed as ``Any`` so pydantic-settings
    never attempts to parse them from the environment.
    """

    model_config = SettingsConfigDict(
        env_prefix=ENV_PREFIX,
        case_sensitive=False,
        extra="ignore",
    )

    model: str = "gpt-4o-mini"
    provider: str = "openai"  # "openai" | "anthropic"
    api_key: str | None = None
    fallback_provider: str | None = None
    fallback_api_key: str | None = None
    fallback_model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: float = 60.0
    max_retries: int = 3
    retry_backoff: float = 2.0  # exponential base seconds
    circuit_failure_threshold: int = 5
    circuit_window_seconds: float = 60.0
    circuit_half_open_seconds: float = 30.0
    memory: Any = Field(default=None, exclude=True)  # live Memory object, not env-settable
    tools: Any = Field(default=None, exclude=True)  # live list[Tool], not env-settable
    system_prompt: str | None = None
    log_level: str = "INFO"

    @classmethod
    def from_env(cls, **overrides: Any) -> "EngineSettings":
        """Build settings from ``CLAUDE_ENGINE_*`` environment variables.

        Keyword arguments are applied on top of the environment-derived
        values, so explicit code always wins over env configuration.

        Returns:
            A fully populated :class:`EngineSettings` instance.
        """
        return cls(**overrides)
