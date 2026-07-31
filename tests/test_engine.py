"""Integration tests for claude_engine.core.engine + compat/legacy (SPEC 2/4/6).

Uses a scriptable FakeProvider implementing the Provider protocol -- no
network, no real API keys. Covers: happy-path chat + memory + metrics,
fallback after retry exhaustion, the full circuit-breaker lifecycle through
the engine (with the breaker's injectable clock), structured output, tool
registration + run_tool_loop, stream assembly, legacy shims, and env-based
settings precedence.
"""

from __future__ import annotations

import asyncio
import inspect
import types
from collections import deque

import pytest
from pydantic import BaseModel

import claude_engine
from claude_engine import ClaudeLikeEngine
from claude_engine.core.engine import METRICS, ChatResponse
from claude_engine.core.providers import Provider, ProviderResponse
from claude_engine.core.streaming import StreamChunk, assemble
from claude_engine.core.tools import Tool, run_tool_loop
from claude_engine.utils.errors import (
    CircuitBreakerOpenError,
    MemoryBackendError,
    ProviderError,
    RateLimitError,
    StructuredOutputError,
    ToolExecutionError,
)

MESSAGES = [{"role": "user", "content": "hello"}]


class FakeClock:
    """Controllable monotonic clock for circuit-breaker tests."""

    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class FakeProvider:
    """Scriptable Provider implementation (SPEC section 6).

    ``script`` is a queue of items consumed one per complete/acomplete call:
    an Exception instance is raised, a string becomes a ProviderResponse with
    that content, and any other object is returned as-is (useful for faking
    responses that carry ``tool_calls``). When the script is exhausted a
    default reply is returned.
    """

    name = "fake"

    def __init__(
        self,
        script: list | None = None,
        *,
        default: str = "fake reply",
        chunks: list[StreamChunk] | None = None,
        stream_error: Exception | None = None,
    ) -> None:
        self.script = deque(script or [])
        self.default = default
        self.chunks = chunks if chunks is not None else [
            StreamChunk(delta="fake "),
            StreamChunk(delta="reply", finish_reason="stop"),
        ]
        self.stream_error = stream_error
        self.calls: list[dict] = []

    def _next(self, messages: list[dict], model: str):
        self.calls.append({"messages": list(messages), "model": model})
        if self.script:
            item = self.script.popleft()
            if isinstance(item, Exception):
                raise item
            if isinstance(item, str):
                return ProviderResponse(content=item, model=model)
            return item
        return ProviderResponse(content=self.default, model=model)

    def complete(self, messages, *, model, temperature, max_tokens, timeout):
        return self._next(messages, model)

    async def acomplete(self, messages, *, model, temperature, max_tokens, timeout):
        return self._next(messages, model)

    def stream(self, messages, *, model, temperature, max_tokens, timeout):
        self.calls.append({"messages": list(messages), "model": model})
        if self.stream_error is not None:
            raise self.stream_error
        yield from self.chunks

    async def astream(self, messages, *, model, temperature, max_tokens, timeout):
        self.calls.append({"messages": list(messages), "model": model})
        if self.stream_error is not None:
            raise self.stream_error
        for chunk in self.chunks:
            yield chunk


def make_engine(provider: FakeProvider | None = None, **kwargs) -> ClaudeLikeEngine:
    """Build an engine wired to a FakeProvider (no real SDK needed)."""
    return ClaudeLikeEngine(provider=provider or FakeProvider(), **kwargs)


# ---------------------------------------------------------------------------
# sacred signature (SPEC section 2)
# ---------------------------------------------------------------------------


class TestSignature:
    EXPECTED = [
        ("model", "gpt-4o-mini"),
        ("provider", "openai"),
        ("api_key", None),
        ("fallback_provider", None),
        ("fallback_api_key", None),
        ("fallback_model", None),
        ("temperature", 0.7),
        ("max_tokens", 4096),
        ("timeout", 60.0),
        ("max_retries", 3),
        ("retry_backoff", 2.0),
        ("circuit_failure_threshold", 5),
        ("circuit_window_seconds", 60.0),
        ("circuit_half_open_seconds", 30.0),
        ("memory", None),
        ("tools", None),
        ("system_prompt", None),
        ("log_level", "INFO"),
    ]

    def test_init_signature_matches_spec(self) -> None:
        params = list(inspect.signature(ClaudeLikeEngine.__init__).parameters.values())
        assert params[0].name == "self"
        actual = [(p.name, p.default) for p in params[1:]]
        assert actual == self.EXPECTED
        assert len(params) - 1 == 18


# ---------------------------------------------------------------------------
# (a) happy-path chat: memory + metrics
# ---------------------------------------------------------------------------


class TestHappyPath:
    def test_chat_returns_normalised_response(self) -> None:
        engine = make_engine()
        response = engine.chat(MESSAGES)
        assert isinstance(response, ChatResponse)
        assert response.content == "fake reply"
        assert response.provider == "fake"

    def test_chat_records_user_and_assistant_to_memory(self) -> None:
        engine = make_engine()
        engine.chat(MESSAGES)
        assert engine.history() == [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "fake reply"},
        ]

    def test_chat_increments_request_metrics(self) -> None:
        engine = make_engine()
        engine.chat(MESSAGES)
        engine.chat(MESSAGES)
        stats = engine.stats()
        assert stats["requests"] == 2
        assert stats["failures"] == 0
        assert stats["fallbacks"] == 0

    def test_metrics_stub_shape(self) -> None:
        assert set(METRICS) == {"requests", "failures", "fallbacks"}
        stats = make_engine().stats()
        for key in METRICS:
            assert key in stats

    def test_clear_memory_and_history(self) -> None:
        engine = make_engine()
        engine.chat(MESSAGES)
        assert len(engine.history()) == 2
        engine.clear_memory()
        assert engine.history() == []

    def test_system_prompt_is_prepended(self) -> None:
        provider = FakeProvider()
        engine = make_engine(provider, system_prompt="You are terse.")
        engine.chat(MESSAGES)
        sent = provider.calls[0]["messages"]
        assert sent[0] == {"role": "system", "content": "You are terse."}
        assert sent[1]["role"] == "user"

    def test_achat_async_twin(self) -> None:
        provider = FakeProvider()
        engine = make_engine(provider)

        async def run() -> ChatResponse:
            return await engine.achat(MESSAGES)

        response = asyncio.run(run())
        assert response.content == "fake reply"
        assert engine.history()[-1] == {"role": "assistant", "content": "fake reply"}


# ---------------------------------------------------------------------------
# (b) fallback after retry exhaustion
# ---------------------------------------------------------------------------


class TestFallback:
    def test_rate_limit_exhausts_retries_then_fallback(self) -> None:
        primary = FakeProvider(script=[RateLimitError("slow down")] * 10)
        fallback = FakeProvider(default="fallback content")
        engine = make_engine(
            primary,
            fallback_provider=fallback,
            max_retries=3,
            retry_backoff=0.0,
        )
        response = engine.chat(MESSAGES)
        assert response.content == "fallback content"
        assert response.provider == "fake"
        # Initial attempt + max_retries retries all hit the primary.
        assert len(primary.calls) == 4
        assert len(fallback.calls) == 1
        assert engine.stats()["fallbacks"] == 1

    def test_fallback_disabled_when_not_configured(self) -> None:
        primary = FakeProvider(script=[ProviderError("boom")])
        engine = make_engine(primary, max_retries=0, retry_backoff=0.0)
        with pytest.raises(ProviderError, match="boom"):
            engine.chat(MESSAGES)
        stats = engine.stats()
        assert stats["fallbacks"] == 0
        assert stats["failures"] == 1

    def test_primary_recovers_within_retries(self) -> None:
        primary = FakeProvider(script=[RateLimitError("rl"), "recovered"])
        engine = make_engine(primary, max_retries=3, retry_backoff=0.0)
        response = engine.chat(MESSAGES)
        assert response.content == "recovered"
        assert len(primary.calls) == 2
        assert engine.stats()["fallbacks"] == 0

    def test_achat_fallback(self) -> None:
        primary = FakeProvider(script=[ProviderError("boom")])
        fallback = FakeProvider(default="async fallback")
        engine = make_engine(
            primary, fallback_provider=fallback, max_retries=0, retry_backoff=0.0
        )

        async def run() -> ChatResponse:
            return await engine.achat(MESSAGES)

        assert asyncio.run(run()).content == "async fallback"
        assert engine.stats()["fallbacks"] == 1


# ---------------------------------------------------------------------------
# (c) circuit breaker lifecycle through the engine
# ---------------------------------------------------------------------------


class TestCircuitThroughEngine:
    def build(self, clock: FakeClock, script: list) -> tuple[ClaudeLikeEngine, FakeProvider]:
        provider = FakeProvider(script=script)
        engine = make_engine(
            provider,
            max_retries=0,
            retry_backoff=0.0,
            circuit_failure_threshold=2,
            circuit_window_seconds=60.0,
            circuit_half_open_seconds=30.0,
        )
        # Inject the fake clock into the engine's breaker before any failures
        # are recorded (CircuitBreaker's clock is injectable for tests).
        engine.circuit_breakers["fake"]._clock = clock
        return engine, provider

    def test_circuit_opens_and_fast_fails_without_provider_call(self) -> None:
        clock = FakeClock()
        engine, provider = self.build(clock, [ProviderError("x"), ProviderError("y")])
        for _ in range(2):
            with pytest.raises(ProviderError):
                engine.chat(MESSAGES)
        assert engine.stats()["circuit"]["fake"]["state"] == "open"
        calls_before = len(provider.calls)
        with pytest.raises(CircuitBreakerOpenError):
            engine.chat(MESSAGES)
        assert len(provider.calls) == calls_before  # no provider call made

    def test_half_open_success_closes_circuit(self) -> None:
        clock = FakeClock()
        engine, _ = self.build(clock, [ProviderError("x"), ProviderError("y")])
        for _ in range(2):
            with pytest.raises(ProviderError):
                engine.chat(MESSAGES)
        with pytest.raises(CircuitBreakerOpenError):
            engine.chat(MESSAGES)
        clock.advance(30.0)
        assert engine.stats()["circuit"]["fake"]["state"] == "half_open"
        response = engine.chat(MESSAGES)  # default reply: half-open trial succeeds
        assert response.content == "fake reply"
        circuit = engine.stats()["circuit"]["fake"]
        assert circuit["state"] == "closed"
        assert circuit["failures"] == 0

    def test_half_open_failure_reopens_circuit(self) -> None:
        clock = FakeClock()
        engine, provider = self.build(
            clock, [ProviderError("x"), ProviderError("y"), ProviderError("z")]
        )
        for _ in range(2):
            with pytest.raises(ProviderError):
                engine.chat(MESSAGES)
        clock.advance(30.0)
        with pytest.raises(ProviderError, match="z"):
            engine.chat(MESSAGES)
        assert engine.stats()["circuit"]["fake"]["state"] == "open"
        calls_before = len(provider.calls)
        with pytest.raises(CircuitBreakerOpenError):
            engine.chat(MESSAGES)
        assert len(provider.calls) == calls_before


# ---------------------------------------------------------------------------
# (d) structured output through the engine
# ---------------------------------------------------------------------------


class Person(BaseModel):
    name: str
    age: int


class TestStructured:
    def test_fenced_json_parses_to_model(self) -> None:
        provider = FakeProvider(script=['```json\n{"name": "Ada", "age": 36}\n```'])
        engine = make_engine(provider)
        result = engine.structured(MESSAGES, Person)
        assert result == Person(name="Ada", age=36)

    def test_one_retry_roundtrip_recovers(self) -> None:
        provider = FakeProvider(script=["garbage", '{"name": "Bob", "age": 41}'])
        engine = make_engine(provider)
        result = engine.structured(MESSAGES, Person)
        assert result == Person(name="Bob", age=41)
        assert len(provider.calls) == 2  # exactly one retry round-trip

    def test_unparseable_output_raises_after_retry(self) -> None:
        provider = FakeProvider(script=["garbage", "still garbage"])
        engine = make_engine(provider)
        with pytest.raises(StructuredOutputError):
            engine.structured(MESSAGES, Person)
        assert len(provider.calls) == 2


# ---------------------------------------------------------------------------
# (e) tool registration + run_tool_loop through the engine
# ---------------------------------------------------------------------------


def _add(a: int, b: int) -> int:
    return a + b


def _make_add_tool() -> Tool:
    return Tool(
        name="add",
        description="Add two integers.",
        parameters={
            "type": "object",
            "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
            "required": ["a", "b"],
        },
        handler=_add,
    )


class TestTools:
    def test_register_tool_populates_registry(self) -> None:
        tool = _make_add_tool()
        engine = make_engine()
        assert engine.register_tool(tool) is tool
        assert engine.tool_registry.get("add") is tool
        schema = engine.tool_registry.as_openai_schema()
        assert schema[0]["function"]["name"] == "add"

    def test_tools_constructor_param(self) -> None:
        engine = make_engine(tools=[_make_add_tool()])
        assert len(engine.tool_registry) == 1

    def test_run_tool_loop_through_engine(self) -> None:
        tool_call = {
            "id": "call_1",
            "type": "function",
            "function": {"name": "add", "arguments": '{"a": 2, "b": 3}'},
        }
        provider = FakeProvider(
            script=[
                types.SimpleNamespace(content=None, tool_calls=[tool_call]),
                "The sum is 5.",
            ]
        )
        engine = make_engine(provider, tools=[_make_add_tool()])
        messages = [{"role": "user", "content": "add 2 and 3"}]
        response = run_tool_loop(engine, messages)
        assert response.content == "The sum is 5."
        tool_messages = [m for m in messages if m["role"] == "tool"]
        assert len(tool_messages) == 1
        assert tool_messages[0]["content"] == "5"

    def test_run_tool_loop_handler_failure_wraps(self) -> None:
        def boom() -> None:
            raise ValueError("kaboom")

        bad_tool = Tool(
            name="boom",
            description="Always fails.",
            parameters={"type": "object", "properties": {}},
            handler=boom,
        )
        tool_call = {"id": "c1", "function": {"name": "boom", "arguments": "{}"}}
        provider = FakeProvider(
            script=[types.SimpleNamespace(content=None, tool_calls=[tool_call])]
        )
        engine = make_engine(provider, tools=[bad_tool])
        with pytest.raises(ToolExecutionError) as excinfo:
            run_tool_loop(engine, [{"role": "user", "content": "go"}])
        assert isinstance(excinfo.value.__cause__, ValueError)


# ---------------------------------------------------------------------------
# (f) streaming through the engine
# ---------------------------------------------------------------------------


class TestStreaming:
    def test_stream_yields_chunks_and_assembles(self) -> None:
        engine = make_engine()
        chunks = list(engine.stream(MESSAGES))
        assert all(isinstance(c, StreamChunk) for c in chunks)
        assert assemble(chunks) == "fake reply"
        assert chunks[-1].finish_reason == "stop"

    def test_stream_records_assembled_reply_to_memory(self) -> None:
        engine = make_engine()
        for _ in engine.stream(MESSAGES):
            pass
        assert engine.history()[-1] == {"role": "assistant", "content": "fake reply"}

    def test_stream_provider_error_records_failure(self) -> None:
        provider = FakeProvider(stream_error=ProviderError("stream boom"))
        engine = make_engine(provider)
        with pytest.raises(ProviderError, match="stream boom"):
            list(engine.stream(MESSAGES))
        stats = engine.stats()
        assert stats["failures"] == 1
        assert stats["circuit"]["fake"]["failures"] == 1

    def test_astream_async_twin(self) -> None:
        engine = make_engine()

        async def run() -> str:
            deltas = [c.delta async for c in engine.astream(MESSAGES)]
            return "".join(deltas)

        assert asyncio.run(run()) == "fake reply"


# ---------------------------------------------------------------------------
# (g) legacy compat shims
# ---------------------------------------------------------------------------


class TestLegacy:
    def test_claude_engine_is_alias(self) -> None:
        from claude_engine.compat.legacy import ClaudeEngine

        assert ClaudeEngine is ClaudeLikeEngine

    def test_memory_error_alias_warns(self) -> None:
        from claude_engine.compat import legacy

        with pytest.warns(DeprecationWarning, match="MemoryBackendError"):
            alias = legacy.MemoryError
        assert alias is MemoryBackendError
        assert alias is not MemoryError  # builtin untouched

    def test_memory_error_import_form_warns(self) -> None:
        with pytest.warns(DeprecationWarning):
            from claude_engine.compat.legacy import MemoryError as LegacyMemoryError

        assert LegacyMemoryError is MemoryBackendError

    def test_create_engine_factory(self) -> None:
        from claude_engine.compat.legacy import create_engine

        engine = create_engine(provider=FakeProvider(), model="m-1")
        assert isinstance(engine, ClaudeLikeEngine)
        assert engine.model == "m-1"
        assert engine.chat(MESSAGES).content == "fake reply"


# ---------------------------------------------------------------------------
# (h) settings env override vs explicit params
# ---------------------------------------------------------------------------


class TestSettingsPrecedence:
    def test_env_override_respected_when_param_not_passed(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MODEL", "env-model")
        engine = make_engine()
        assert engine.model == "env-model"

    def test_explicit_param_beats_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MODEL", "env-model")
        engine = make_engine(model="explicit-model")
        assert engine.model == "explicit-model"

    def test_env_numeric_and_circuit_overrides(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("CLAUDE_ENGINE_MAX_RETRIES", "7")
        monkeypatch.setenv("CLAUDE_ENGINE_CIRCUIT_FAILURE_THRESHOLD", "9")
        engine = make_engine()
        assert engine.max_retries == 7
        assert engine.circuit_breakers["fake"].failure_threshold == 9


# ---------------------------------------------------------------------------
# package surface
# ---------------------------------------------------------------------------


class TestPackageSurface:
    def test_version_and_engine_exported(self) -> None:
        assert claude_engine.__version__ == "1.0.0"
        assert claude_engine.ClaudeLikeEngine is ClaudeLikeEngine

    def test_fake_provider_conforms_to_protocol(self) -> None:
        assert isinstance(FakeProvider(), Provider)

    def test_unknown_provider_name_raises(self) -> None:
        with pytest.raises(ValueError, match="Unknown provider"):
            ClaudeLikeEngine(provider="not-a-provider")
