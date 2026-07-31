"""Tests for config/settings.py and utils/{errors,retries,logging_config}.py.

No network, no real API keys (SPEC section 6).
"""

from __future__ import annotations

import asyncio
import re

import pytest
import structlog

from claude_engine.config.settings import EngineSettings
from claude_engine.utils.errors import (
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
from claude_engine.utils.logging_config import (
    bind_request_id,
    configure_logging,
    get_logger,
)
from claude_engine.utils.retries import (
    aretry_with_backoff,
    compute_delay,
    retry_with_backoff,
)

ALL_EXCEPTIONS = [
    ProviderError,
    RateLimitError,
    AuthenticationError,
    ModelNotFoundError,
    StreamingError,
    ToolExecutionError,
    StructuredOutputError,
    MemoryBackendError,
    CircuitBreakerOpenError,
]


# ---------------------------------------------------------------------------
# settings
# ---------------------------------------------------------------------------


class TestEngineSettings:
    def test_defaults_mirror_engine_init(self) -> None:
        s = EngineSettings()
        assert s.model == "gpt-4o-mini"
        assert s.provider == "openai"
        assert s.api_key is None
        assert s.fallback_provider is None
        assert s.fallback_api_key is None
        assert s.fallback_model is None
        assert s.temperature == 0.7
        assert s.max_tokens == 4096
        assert s.timeout == 60.0
        assert s.max_retries == 3
        assert s.retry_backoff == 2.0
        assert s.circuit_failure_threshold == 5
        assert s.circuit_window_seconds == 60.0
        assert s.circuit_half_open_seconds == 30.0
        assert s.memory is None
        assert s.tools is None
        assert s.system_prompt is None
        assert s.log_level == "INFO"

    def test_env_override_model(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MODEL", "claude-3-5-sonnet-latest")
        assert EngineSettings().model == "claude-3-5-sonnet-latest"

    def test_env_override_numeric(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MAX_RETRIES", "7")
        monkeypatch.setenv("CLAUDE_ENGINE_TEMPERATURE", "0.1")
        s = EngineSettings()
        assert s.max_retries == 7
        assert s.temperature == pytest.approx(0.1)

    def test_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MODEL", "gpt-4o")
        s = EngineSettings.from_env()
        assert s.model == "gpt-4o"
        # Explicit kwargs win over env.
        assert EngineSettings.from_env(model="override").model == "override"


# ---------------------------------------------------------------------------
# errors
# ---------------------------------------------------------------------------


class TestErrors:
    @pytest.mark.parametrize("exc_cls", ALL_EXCEPTIONS)
    def test_all_inherit_base(self, exc_cls: type[ClaudeEngineError]) -> None:
        assert issubclass(exc_cls, ClaudeEngineError)
        assert isinstance(exc_cls(), ClaudeEngineError)

    @pytest.mark.parametrize("exc_cls", ALL_EXCEPTIONS)
    def test_default_message(self, exc_cls: type[ClaudeEngineError]) -> None:
        exc = exc_cls()
        assert str(exc) == exc_cls.default_message
        assert str(exc)  # non-empty

    def test_custom_message_and_context(self) -> None:
        exc = ProviderError("boom", provider="openai")
        assert str(exc) == "boom"
        assert exc.context == {"provider": "openai"}

    def test_provider_subclasses(self) -> None:
        for cls in (RateLimitError, AuthenticationError, ModelNotFoundError):
            assert issubclass(cls, ProviderError)

    def test_rate_limit_retry_after(self) -> None:
        assert RateLimitError().retry_after is None
        assert RateLimitError(retry_after=1.5).retry_after == 1.5

    def test_memory_backend_error_not_builtin_shadow(self) -> None:
        # Catching the builtin MemoryError must NOT catch MemoryBackendError.
        with pytest.raises(MemoryBackendError):
            try:
                raise MemoryBackendError()
            except MemoryError:  # noqa: B036 - intentionally builtin
                pytest.fail("MemoryBackendError must not subclass builtin MemoryError")


# ---------------------------------------------------------------------------
# retries
# ---------------------------------------------------------------------------


class TestComputeDelay:
    def test_exponential_growth_and_jitter_bounds(self) -> None:
        base = 2.0
        for attempt in range(5):
            expected = base * (2 ** attempt)
            samples = [compute_delay(attempt, base) for _ in range(200)]
            assert all(expected * 0.9 <= d <= expected * 1.1 for d in samples)
            # Jitter actually varies the delay.
            assert len(set(samples)) > 1
        # Base delays are exponential: 2, 4, 8, 16, 32.
        means = [
            sum(compute_delay(a, base) for _ in range(200)) / 200
            for a in range(5)
        ]
        assert means == pytest.approx([2.0, 4.0, 8.0, 16.0, 32.0], rel=0.05)

    def test_zero_jitter_is_exact(self) -> None:
        assert compute_delay(3, 1.5, jitter=0.0) == 1.5 * 8


class TestRetryWithBackoff:
    def test_succeeds_after_n_failures(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("claude_engine.utils.retries.time.sleep", lambda _: None)
        calls = {"n": 0}

        def flaky() -> str:
            calls["n"] += 1
            if calls["n"] < 3:
                raise RateLimitError("slow down")
            return "ok"

        assert retry_with_backoff(flaky, 3, 1.0, (RateLimitError,)) == "ok"
        assert calls["n"] == 3

    def test_raises_after_max_retries(self, monkeypatch: pytest.MonkeyPatch) -> None:
        sleeps: list[float] = []
        monkeypatch.setattr(
            "claude_engine.utils.retries.time.sleep", sleeps.append
        )
        calls = {"n": 0}

        def always_fails() -> None:
            calls["n"] += 1
            raise RateLimitError()

        with pytest.raises(RateLimitError):
            retry_with_backoff(always_fails, 3, 1.0, (RateLimitError,))
        assert calls["n"] == 4  # initial call + 3 retries
        assert len(sleeps) == 3

    def test_non_retryable_propagates_immediately(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("claude_engine.utils.retries.time.sleep", lambda _: None)
        calls = {"n": 0}

        def bad() -> None:
            calls["n"] += 1
            raise ToolExecutionError()

        with pytest.raises(ToolExecutionError):
            retry_with_backoff(bad, 5, 1.0, (RateLimitError,))
        assert calls["n"] == 1

    def test_backoff_sleeps_are_exponential(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        sleeps: list[float] = []
        monkeypatch.setattr(
            "claude_engine.utils.retries.time.sleep", sleeps.append
        )

        def always_fails() -> None:
            raise RateLimitError()

        with pytest.raises(RateLimitError):
            retry_with_backoff(always_fails, 3, 2.0, (RateLimitError,))
        # Expected base delays: 2, 4, 8 (with +/-10% jitter).
        assert len(sleeps) == 3
        for got, expected in zip(sleeps, [2.0, 4.0, 8.0]):
            assert expected * 0.9 <= got <= expected * 1.1


class TestAsyncRetryWithBackoff:
    def test_async_succeeds_after_failures(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        async def fake_sleep(_: float) -> None:
            return None

        monkeypatch.setattr(
            "claude_engine.utils.retries.asyncio.sleep", fake_sleep
        )
        calls = {"n": 0}

        async def flaky() -> str:
            calls["n"] += 1
            if calls["n"] < 3:
                raise RateLimitError()
            return "ok"

        result = asyncio.run(aretry_with_backoff(flaky, 3, 1.0, (RateLimitError,)))
        assert result == "ok"
        assert calls["n"] == 3

    def test_async_raises_after_max_retries(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        sleeps: list[float] = []

        async def fake_sleep(d: float) -> None:
            sleeps.append(d)

        monkeypatch.setattr(
            "claude_engine.utils.retries.asyncio.sleep", fake_sleep
        )

        async def always_fails() -> None:
            raise RateLimitError()

        with pytest.raises(RateLimitError):
            asyncio.run(aretry_with_backoff(always_fails, 2, 1.0, (RateLimitError,)))
        assert len(sleeps) == 2


# ---------------------------------------------------------------------------
# logging
# ---------------------------------------------------------------------------


class TestLoggingConfig:
    def test_configure_logging_and_get_logger(self) -> None:
        configure_logging("DEBUG")
        logger = get_logger("test.config_utils")
        assert logger is not None
        logger.info("smoke", key="value")  # must not raise

    def test_bind_request_id_format_and_uniqueness(self) -> None:
        rid1 = bind_request_id()
        rid2 = bind_request_id()
        assert re.fullmatch(r"[0-9a-f]{12}", rid1)
        assert rid1 != rid2

    def test_request_id_bound_to_contextvars(self) -> None:
        structlog.contextvars.clear_contextvars()
        rid = bind_request_id()
        ctx = structlog.contextvars.get_contextvars()
        assert ctx["request_id"] == rid
        structlog.contextvars.clear_contextvars()
