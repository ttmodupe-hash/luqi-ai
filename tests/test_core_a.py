"""Tests for core/personality.py, core/memory.py and core/providers.py.

Covers (SPEC sections 4-6): personality presets + lookup errors, InMemoryMemory
add/get/clear/trim/len, the full CircuitBreaker lifecycle with a fake clock,
Provider protocol conformance of a scriptable FakeProvider, and lazy SDK
imports (the providers/memory modules must import with no openai, anthropic
or redis packages installed). No network, no real API keys.
"""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types

import pytest

from claude_engine.core.memory import InMemoryMemory, Memory, RedisMemory
from claude_engine.core.personality import (
    DEFAULT,
    ENGINEER,
    RESEARCHER,
    TUTOR,
    Personality,
    get_personality,
)
from claude_engine.core.providers import (
    AnthropicProvider,
    CircuitBreaker,
    OpenAIProvider,
    Provider,
    ProviderResponse,
)
from claude_engine.core.streaming import StreamChunk
from claude_engine.utils.errors import (
    CircuitBreakerOpenError,
    MemoryBackendError,
    ProviderError,
)


class FakeClock:
    """Controllable monotonic clock for CircuitBreaker tests."""

    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class FakeProvider:
    """Scriptable Provider implementation (SPEC section 6)."""

    def __init__(
        self,
        response: ProviderResponse | None = None,
        error: Exception | None = None,
        chunks: list[StreamChunk] | None = None,
    ) -> None:
        self.response = response or ProviderResponse(
            content="fake reply", model="fake-model", usage={"tokens": 1}
        )
        self.error = error
        self.chunks = chunks or [StreamChunk(delta="fake "), StreamChunk(delta="reply")]
        self.calls: list[dict] = []

    def _record(self, messages: list[dict], **kw: object) -> None:
        self.calls.append({"messages": list(messages), **kw})

    def _maybe_raise(self) -> None:
        if self.error is not None:
            raise self.error

    def complete(self, messages, *, model, temperature, max_tokens, timeout):
        self._record(messages, model=model)
        self._maybe_raise()
        return self.response

    def stream(self, messages, *, model, temperature, max_tokens, timeout):
        self._record(messages, model=model)
        self._maybe_raise()
        yield from self.chunks

    async def acomplete(self, messages, *, model, temperature, max_tokens, timeout):
        self._record(messages, model=model)
        self._maybe_raise()
        return self.response

    async def astream(self, messages, *, model, temperature, max_tokens, timeout):
        self._record(messages, model=model)
        self._maybe_raise()
        for chunk in self.chunks:
            yield chunk


# ---------------------------------------------------------------------------
# personality.py
# ---------------------------------------------------------------------------


class TestPersonality:
    def test_presets_are_personality_dataclasses(self):
        for preset in (DEFAULT, RESEARCHER, TUTOR, ENGINEER):
            assert isinstance(preset, Personality)
            assert preset.name
            assert isinstance(preset.system_prompt, str)
            assert preset.system_prompt.strip()

    def test_preset_names_are_unique(self):
        names = [p.name for p in (DEFAULT, RESEARCHER, TUTOR, ENGINEER)]
        assert len(names) == len(set(names))

    def test_get_personality_returns_each_preset(self):
        assert get_personality("default") is DEFAULT
        assert get_personality("researcher") is RESEARCHER
        assert get_personality("tutor") is TUTOR
        assert get_personality("engineer") is ENGINEER

    def test_get_personality_unknown_raises_keyerror_with_available_names(self):
        with pytest.raises(KeyError) as excinfo:
            get_personality("nope")
        message = str(excinfo.value)
        assert "nope" in message
        for name in ("default", "researcher", "tutor", "engineer"):
            assert name in message


# ---------------------------------------------------------------------------
# memory.py
# ---------------------------------------------------------------------------


class TestInMemoryMemory:
    def test_add_get_returns_oldest_first(self):
        memory = InMemoryMemory()
        memory.add("user", "hello")
        memory.add("assistant", "hi there")
        assert memory.get() == [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi there"},
        ]

    def test_len_and_clear(self):
        memory = InMemoryMemory()
        assert len(memory) == 0
        memory.add("user", "a")
        memory.add("assistant", "b")
        assert len(memory) == 2
        memory.clear()
        assert len(memory) == 0
        assert memory.get() == []

    def test_trims_oldest_at_max_messages(self):
        memory = InMemoryMemory(max_messages=3)
        for i in range(5):
            memory.add("user", f"msg-{i}")
        assert len(memory) == 3
        contents = [m["content"] for m in memory.get()]
        assert contents == ["msg-2", "msg-3", "msg-4"]

    def test_default_max_messages_is_200(self):
        memory = InMemoryMemory()
        assert memory.max_messages == 200
        for i in range(250):
            memory.add("user", str(i))
        assert len(memory) == 200

    def test_get_returns_copies(self):
        memory = InMemoryMemory()
        memory.add("user", "original")
        memory.get()[0]["content"] = "mutated"
        assert memory.get()[0]["content"] == "original"

    def test_invalid_max_messages_raises(self):
        with pytest.raises(ValueError):
            InMemoryMemory(max_messages=0)

    def test_conforms_to_memory_protocol(self):
        assert isinstance(InMemoryMemory(), Memory)


class TestRedisMemory:
    def test_conforms_to_memory_protocol(self):
        assert isinstance(RedisMemory("redis://localhost:6379/0"), Memory)

    def test_missing_redis_package_raises_backend_error_with_hint(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        # Force the "redis not installed" path even if it happens to be.
        monkeypatch.setitem(sys.modules, "redis", None)
        memory = RedisMemory("redis://localhost:6379/0")
        with pytest.raises(MemoryBackendError, match="pip install redis"):
            memory.add("user", "hello")

    def test_default_key_prefix_and_ttl(self):
        memory = RedisMemory("redis://localhost:6379/0")
        assert memory.key_prefix == "claude_engine:"
        assert memory.ttl == 86400


# ---------------------------------------------------------------------------
# providers.py -- CircuitBreaker
# ---------------------------------------------------------------------------


class TestCircuitBreaker:
    def make_breaker(self, clock: FakeClock, **overrides: object) -> CircuitBreaker:
        kwargs = {"clock": clock, **overrides}
        return CircuitBreaker(**kwargs)  # type: ignore[arg-type]

    def test_starts_closed_with_no_failures(self):
        breaker = self.make_breaker(FakeClock())
        assert breaker.state == "closed"
        assert breaker.failures == 0
        assert breaker.snapshot() == {"state": "closed", "failures": 0}

    def test_opens_after_threshold_failures_in_window(self):
        clock = FakeClock()
        breaker = self.make_breaker(
            clock, failure_threshold=5, window_seconds=60.0, half_open_seconds=30.0
        )
        for _ in range(4):
            breaker.record_failure()
        assert breaker.state == "closed"
        breaker.record_failure()  # 5th failure inside the window
        assert breaker.state == "open"

    def test_open_rejects_calls_immediately(self):
        clock = FakeClock()
        breaker = self.make_breaker(clock, failure_threshold=5)
        for _ in range(5):
            breaker.record_failure()
        assert breaker.state == "open"
        # No time has passed: the call must fail fast.
        with pytest.raises(CircuitBreakerOpenError):
            breaker.before_call()

    def test_failures_outside_window_do_not_trip(self):
        clock = FakeClock()
        breaker = self.make_breaker(
            clock, failure_threshold=5, window_seconds=60.0, half_open_seconds=30.0
        )
        for _ in range(4):
            breaker.record_failure()
        clock.advance(61.0)  # all previous failures fall out of the window
        breaker.record_failure()
        assert breaker.state == "closed"
        assert breaker.failures == 1

    def test_half_open_trial_success_resets_to_closed(self):
        clock = FakeClock()
        breaker = self.make_breaker(
            clock, failure_threshold=5, window_seconds=60.0, half_open_seconds=30.0
        )
        for _ in range(5):
            breaker.record_failure()
        assert breaker.state == "open"
        clock.advance(30.0)
        assert breaker.state == "half_open"
        breaker.before_call()  # trial call is allowed through
        breaker.record_success()
        assert breaker.state == "closed"
        assert breaker.failures == 0
        breaker.before_call()  # closed: calls flow again

    def test_half_open_trial_failure_reopens(self):
        clock = FakeClock()
        breaker = self.make_breaker(
            clock, failure_threshold=5, window_seconds=60.0, half_open_seconds=30.0
        )
        for _ in range(5):
            breaker.record_failure()
        clock.advance(30.0)
        assert breaker.state == "half_open"
        breaker.before_call()
        breaker.record_failure()  # trial failed
        assert breaker.state == "open"
        with pytest.raises(CircuitBreakerOpenError):
            breaker.before_call()
        # The half-open timer restarts after re-tripping.
        clock.advance(29.9)
        with pytest.raises(CircuitBreakerOpenError):
            breaker.before_call()
        clock.advance(0.1)
        assert breaker.state == "half_open"

    def test_success_in_closed_state_resets_failure_count(self):
        clock = FakeClock()
        breaker = self.make_breaker(clock, failure_threshold=5)
        for _ in range(4):
            breaker.record_failure()
        breaker.record_success()
        assert breaker.failures == 0
        for _ in range(4):
            breaker.record_failure()
        assert breaker.state == "closed"

    def test_invalid_threshold_raises(self):
        with pytest.raises(ValueError):
            CircuitBreaker(failure_threshold=0)


# ---------------------------------------------------------------------------
# providers.py -- Provider protocol + lazy SDK imports
# ---------------------------------------------------------------------------


class TestProviderProtocol:
    KW = dict(model="m", temperature=0.5, max_tokens=16, timeout=1.0)

    def test_fake_provider_conforms_to_protocol(self):
        assert isinstance(FakeProvider(), Provider)

    def test_incomplete_provider_is_rejected(self):
        class NotAProvider:
            def complete(self, messages, *, model, temperature, max_tokens, timeout):
                raise NotImplementedError

        assert not isinstance(NotAProvider(), Provider)

    def test_concrete_providers_conform_to_protocol(self):
        assert isinstance(OpenAIProvider(api_key="sk-fake"), Provider)
        assert isinstance(AnthropicProvider(api_key="sk-fake"), Provider)

    def test_fake_provider_is_scriptable(self):
        provider = FakeProvider()
        response = provider.complete([{"role": "user", "content": "hi"}], **self.KW)
        assert response.content == "fake reply"
        assert [c.delta for c in provider.stream([], **self.KW)] == ["fake ", "reply"]

        async def run_async() -> tuple[str, list[str]]:
            resp = await provider.acomplete([], **self.KW)
            deltas = [c.delta async for c in provider.astream([], **self.KW)]
            return resp.content, deltas

        content, deltas = asyncio.run(run_async())
        assert content == "fake reply"
        assert deltas == ["fake ", "reply"]

    def test_fake_provider_raises_scripted_error(self):
        provider = FakeProvider(error=ProviderError("boom"))
        with pytest.raises(ProviderError, match="boom"):
            provider.complete([], **self.KW)


class TestProviderResponse:
    def test_defaults(self):
        response = ProviderResponse(content="c", model="m")
        assert response.content == "c"
        assert response.model == "m"
        assert response.usage == {}
        assert response.raw is None


class TestLazySdkImports:
    """The providers/memory modules import with no vendor SDKs installed."""

    def test_importing_providers_did_not_import_sdks(self):
        # openai/anthropic are not installed in the test environment; the very
        # fact that this module (and its top-level providers import) loaded
        # proves lazy importing. Guard against accidental eager imports if the
        # SDKs ever are installed.
        if importlib.util.find_spec("openai") is None:
            assert "openai" not in sys.modules
        if importlib.util.find_spec("anthropic") is None:
            assert "anthropic" not in sys.modules
        if importlib.util.find_spec("redis") is None:
            assert "redis" not in sys.modules

    def test_openai_provider_without_sdk_raises_provider_error(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        # Force the "openai not installed" path even if it happens to be.
        monkeypatch.setitem(sys.modules, "openai", None)
        provider = OpenAIProvider(api_key="sk-fake")
        with pytest.raises(ProviderError, match="pip install openai"):
            provider.complete(
                [{"role": "user", "content": "hi"}],
                model="gpt-4o-mini",
                temperature=0.7,
                max_tokens=16,
                timeout=1.0,
            )

    def test_anthropic_provider_without_sdk_raises_provider_error(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setitem(sys.modules, "anthropic", None)
        provider = AnthropicProvider(api_key="sk-fake")
        with pytest.raises(ProviderError, match="pip install anthropic"):
            provider.complete(
                [{"role": "user", "content": "hi"}],
                model="claude-3-haiku",
                temperature=0.7,
                max_tokens=16,
                timeout=1.0,
            )

    def test_openai_complete_with_fake_sdk(self, monkeypatch: pytest.MonkeyPatch):
        """Exercise the lazy-client code path with a stubbed openai module."""

        class _FakeMessage:
            content = "hello from fake openai"

        class _FakeChoice:
            message = _FakeMessage()
            finish_reason = "stop"

        class _FakeUsage:
            def model_dump(self) -> dict:
                return {"prompt_tokens": 3, "completion_tokens": 2}

        class _FakeResponse:
            model = "gpt-4o-mini"
            choices = [_FakeChoice()]
            usage = _FakeUsage()

            def model_dump(self) -> dict:
                return {"id": "chatcmpl-fake"}

        class _FakeCompletions:
            @staticmethod
            def create(**kwargs: object) -> _FakeResponse:
                return _FakeResponse()

        class _FakeChat:
            completions = _FakeCompletions()

        class _FakeClient:
            chat = _FakeChat()

            def __init__(self, **kwargs: object) -> None:
                self.kwargs = kwargs

        fake_openai = types.ModuleType("openai")
        fake_openai.OpenAI = _FakeClient  # type: ignore[attr-defined]
        monkeypatch.setitem(sys.modules, "openai", fake_openai)

        provider = OpenAIProvider(api_key="sk-fake")
        response = provider.complete(
            [{"role": "user", "content": "hi"}],
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=16,
            timeout=1.0,
        )
        assert response.content == "hello from fake openai"
        assert response.model == "gpt-4o-mini"
        assert response.usage == {"prompt_tokens": 3, "completion_tokens": 2}
        assert response.raw == {"id": "chatcmpl-fake"}
