"""Utility subpackage: errors, retry helpers and logging configuration."""

from __future__ import annotations

from .errors import (
    AuthenticationError,
    CircuitBreakerOpenError,
    ClaudeEngineError,
    MemoryBackendError,
    ModelNotFoundError,
    ProviderError,
    RateLimitError,
    StreamingError,
    StructuredOutputError,
    ToolExecutionError,
)
from .logging_config import bind_request_id, configure_logging, get_logger
from .retries import aretry_with_backoff, compute_delay, retry_with_backoff

__all__ = [
    "AuthenticationError",
    "CircuitBreakerOpenError",
    "ClaudeEngineError",
    "MemoryBackendError",
    "ModelNotFoundError",
    "ProviderError",
    "RateLimitError",
    "StreamingError",
    "StructuredOutputError",
    "ToolExecutionError",
    "aretry_with_backoff",
    "bind_request_id",
    "compute_delay",
    "configure_logging",
    "get_logger",
    "retry_with_backoff",
]
