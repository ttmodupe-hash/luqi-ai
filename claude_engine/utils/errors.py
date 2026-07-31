"""Custom exception hierarchy for claude_engine (SPEC section 3).

All 10 exceptions inherit from :class:`ClaudeEngineError`, so callers can
catch a single base class. Every exception supports a useful default
message when constructed with no arguments.

NOTE: the legacy name ``MemoryError`` was renamed to
:class:`MemoryBackendError` to avoid shadowing the Python builtin; the
compat shim re-exports the old name with a DeprecationWarning.
"""

from __future__ import annotations

from typing import Any


class ClaudeEngineError(Exception):
    """Base class for all claude_engine errors."""

    default_message = "An error occurred in claude_engine."

    def __init__(self, message: str | None = None, **context: Any) -> None:
        """Initialise with an optional message and arbitrary context data.

        Args:
            message: Human-readable error description. Falls back to the
                class-level ``default_message`` when omitted.
            context: Extra structured details attached to the exception as
                the ``context`` attribute (e.g. provider, model).
        """
        super().__init__(message or self.default_message)
        self.context = context


class ProviderError(ClaudeEngineError):
    """A provider API call failed (network, 5xx, malformed response, ...)."""

    default_message = "The provider request failed."


class RateLimitError(ProviderError):
    """The provider rejected the request due to rate limiting."""

    default_message = "The provider rate limit was exceeded."

    def __init__(
        self,
        message: str | None = None,
        retry_after: float | None = None,
        **context: Any,
    ) -> None:
        """Initialise, optionally recording the provider's retry hint.

        Args:
            message: Human-readable error description.
            retry_after: Seconds the provider asked us to wait, if known.
            context: Extra structured details.
        """
        super().__init__(message, **context)
        self.retry_after = retry_after


class AuthenticationError(ProviderError):
    """The provider rejected the credentials (bad or missing API key)."""

    default_message = "Authentication with the provider failed; check the API key."


class ModelNotFoundError(ProviderError):
    """The requested model does not exist or is not accessible."""

    default_message = "The requested model was not found."


class StreamingError(ClaudeEngineError):
    """A streaming response failed mid-stream or could not be assembled."""

    default_message = "The streaming response failed."


class ToolExecutionError(ClaudeEngineError):
    """A registered tool handler raised while being executed."""

    default_message = "A tool execution failed."


class StructuredOutputError(ClaudeEngineError):
    """Model output could not be parsed/validated into the target schema."""

    default_message = "Structured output extraction failed."


class MemoryBackendError(ClaudeEngineError):
    """The memory backend (in-memory or Redis) failed.

    Renamed from the legacy ``MemoryError`` to avoid shadowing the builtin.
    """

    default_message = "The memory backend operation failed."


class CircuitBreakerOpenError(ClaudeEngineError):
    """The provider circuit breaker is OPEN; the call was rejected fast."""

    default_message = "The provider circuit breaker is open; call rejected."
