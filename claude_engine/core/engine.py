"""ClaudeLikeEngine -- the facade wiring everything together (SPEC sections 2, 4, 5).

The engine owns the primary provider (plus an optional fallback provider), a
per-provider :class:`CircuitBreaker`, conversation memory, a
:class:`ToolRegistry`, a structlog logger with a per-call request id, and a
Prometheus-style metrics stub surfaced via :meth:`ClaudeLikeEngine.stats`.

Configuration precedence: explicit ``__init__`` parameters always win over
``CLAUDE_ENGINE_*`` environment variables loaded through
:class:`claude_engine.config.settings.EngineSettings`.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass, field
from typing import Any, TypeVar

import structlog
from pydantic import BaseModel

from ..config.settings import EngineSettings
from ..utils.errors import ProviderError, RateLimitError
from ..utils.logging_config import bind_request_id, configure_logging, get_logger
from ..utils.retries import aretry_with_backoff, retry_with_backoff
from .memory import InMemoryMemory, Memory
from .providers import (
    AnthropicProvider,
    CircuitBreaker,
    Message,
    OpenAIProvider,
    Provider,
)
from .streaming import StreamChunk
from .structured_output import extract
from .tools import Tool, ToolRegistry

T = TypeVar("T", bound=BaseModel)

#: Prometheus metrics stub (SPEC section 5). Each engine instance gets its own
#: copy of these counters, surfaced via :meth:`ClaudeLikeEngine.stats`.
METRICS: dict[str, int] = {"requests": 0, "failures": 0, "fallbacks": 0}

#: Exceptions that trigger a backoff retry (SPEC section 4).
_RETRYABLE: tuple[type[BaseException], ...] = (ProviderError, RateLimitError)

#: Declared defaults of the sacred 18-param signature, used to distinguish
#: "caller passed an explicit value" from "left at the default" so that
#: environment configuration only applies when a parameter was not passed.
_SIGNATURE_DEFAULTS: dict[str, Any] = {
    "model": "gpt-4o-mini",
    "provider": "openai",
    "api_key": None,
    "fallback_provider": None,
    "fallback_api_key": None,
    "fallback_model": None,
    "temperature": 0.7,
    "max_tokens": 4096,
    "timeout": 60.0,
    "max_retries": 3,
    "retry_backoff": 2.0,
    "circuit_failure_threshold": 5,
    "circuit_window_seconds": 60.0,
    "circuit_half_open_seconds": 30.0,
    "memory": None,
    "tools": None,
    "system_prompt": None,
    "log_level": "INFO",
}


@dataclass
class ChatResponse:
    """Normalised engine-level chat result.

    Attributes:
        content: The assistant's text reply.
        model: The model identifier that produced the reply.
        usage: Token accounting reported by the provider.
        raw: The provider's raw response payload, when available.
        tool_calls: Tool calls requested by the model, when any.
        provider: Name of the provider that produced this response
            (``"openai"``, ``"anthropic"``, ...); useful for observing
            fallbacks.
    """

    content: str
    model: str
    usage: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] | None = None
    tool_calls: list[Any] | None = None
    provider: str | None = None


def _provider_name(provider: Any) -> str:
    """Return a stable circuit-breaker key for a provider instance."""
    name = getattr(provider, "name", None)
    if isinstance(name, str) and name:
        return name
    return type(provider).__name__.lower()


def _build_provider(name: str, api_key: str | None) -> Provider:
    """Construct an SDK-backed provider by name.

    Raises:
        ValueError: If ``name`` is not a known provider.
    """
    if name == "openai":
        return OpenAIProvider(api_key=api_key)
    if name == "anthropic":
        return AnthropicProvider(api_key=api_key)
    raise ValueError(
        f"Unknown provider {name!r}. Expected 'openai' or 'anthropic', or "
        "pass a Provider instance directly."
    )


class ClaudeLikeEngine:
    """Provider-agnostic chat engine with retries, fallback and circuits.

    Explicit constructor parameters override environment configuration
    (``CLAUDE_ENGINE_*`` variables via :class:`EngineSettings`). The
    ``provider``/``fallback_provider`` parameters accept the strings
    ``"openai"``/``"anthropic"`` (SDK-backed providers are constructed
    internally) or any object implementing the :class:`Provider` protocol,
    which is how tests inject fakes.
    """

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        provider: str = "openai",
        api_key: str | None = None,
        fallback_provider: str | None = None,
        fallback_api_key: str | None = None,
        fallback_model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_backoff: float = 2.0,
        circuit_failure_threshold: int = 5,
        circuit_window_seconds: float = 60.0,
        circuit_half_open_seconds: float = 30.0,
        memory: Memory | None = None,
        tools: list[Tool] | None = None,
        system_prompt: str | None = None,
        log_level: str = "INFO",
    ) -> None:
        """Initialise the engine (18 sacred parameters, SPEC section 2).

        Any parameter left at its declared default falls back to the value
        from :meth:`EngineSettings.from_env` (i.e. the matching
        ``CLAUDE_ENGINE_*`` environment variable, or the library default).
        Explicitly passed values always win.
        """
        explicit = {
            "model": model,
            "provider": provider,
            "api_key": api_key,
            "fallback_provider": fallback_provider,
            "fallback_api_key": fallback_api_key,
            "fallback_model": fallback_model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": timeout,
            "max_retries": max_retries,
            "retry_backoff": retry_backoff,
            "circuit_failure_threshold": circuit_failure_threshold,
            "circuit_window_seconds": circuit_window_seconds,
            "circuit_half_open_seconds": circuit_half_open_seconds,
            "system_prompt": system_prompt,
            "log_level": log_level,
        }
        overrides = {
            key: value
            for key, value in explicit.items()
            if value != _SIGNATURE_DEFAULTS[key]
        }
        # ``provider``/``fallback_provider`` may be live Provider instances
        # rather than strings; only strings flow through EngineSettings.
        if not isinstance(provider, str):
            overrides.pop("provider", None)
        if not isinstance(fallback_provider, str):
            overrides.pop("fallback_provider", None)
        settings = EngineSettings.from_env(**overrides)

        if not structlog.is_configured():
            configure_logging(settings.log_level)
        self._log = get_logger("claude_engine.engine")

        # Scalar configuration (explicit params already folded into settings).
        self.model = settings.model
        self.temperature = settings.temperature
        self.max_tokens = settings.max_tokens
        self.timeout = settings.timeout
        self.max_retries = settings.max_retries
        self.retry_backoff = settings.retry_backoff
        self.system_prompt = settings.system_prompt
        self.log_level = settings.log_level
        self.settings = settings

        # Providers: strings name SDK-backed providers; anything else is
        # treated as a Provider-protocol instance and used directly.
        if isinstance(provider, str):
            self.primary_provider: Provider = _build_provider(
                settings.provider, settings.api_key
            )
        else:
            self.primary_provider = provider
        self._primary_name = _provider_name(self.primary_provider)

        self.fallback_provider: Provider | None = None
        self.fallback_model = settings.fallback_model
        self._fallback_name: str | None = None
        if isinstance(fallback_provider, str):
            fallback_spec: str | None = fallback_provider
        elif fallback_provider is None:
            fallback_spec = (
                settings.fallback_provider
                if "fallback_provider" not in overrides
                else None
            )
        else:
            fallback_spec = None
            self.fallback_provider = fallback_provider
            self._fallback_name = _provider_name(fallback_provider)
        if fallback_spec is not None:
            self.fallback_provider = _build_provider(
                fallback_spec, settings.fallback_api_key
            )
            self._fallback_name = _provider_name(self.fallback_provider)

        # Per-provider circuit breakers (SPEC section 4).
        self.circuit_breakers: dict[str, CircuitBreaker] = {}
        for name in {self._primary_name, self._fallback_name} - {None}:
            self.circuit_breakers[name] = CircuitBreaker(
                failure_threshold=settings.circuit_failure_threshold,
                window_seconds=settings.circuit_window_seconds,
                half_open_seconds=settings.circuit_half_open_seconds,
            )

        # Memory and tools.
        self.memory: Memory = memory if memory is not None else InMemoryMemory()
        self.tool_registry = ToolRegistry(tools)

        # Metrics stub (per-instance copy of the module-level template).
        self._metrics: dict[str, int] = dict(METRICS)

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _apply_system_prompt(self, messages: list[Message]) -> list[Message]:
        """Prepend the configured system prompt unless one is present."""
        if not self.system_prompt:
            return messages
        if any(message.get("role") == "system" for message in messages):
            return messages
        return [{"role": "system", "content": self.system_prompt}, *messages]

    def _call_provider(
        self,
        provider: Provider,
        name: str,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> Any:
        """Call ``provider.complete`` guarded by its circuit breaker.

        The breaker gates every attempt; retryable provider failures are
        retried with exponential backoff. :class:`CircuitBreakerOpenError`
        is not retryable and propagates immediately while the breaker is
        OPEN.
        """
        breaker = self.circuit_breakers[name]

        def attempt() -> Any:
            breaker.before_call()
            return provider.complete(
                messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

        try:
            response = retry_with_backoff(
                attempt, self.max_retries, self.retry_backoff, _RETRYABLE
            )
        except _RETRYABLE:
            breaker.record_failure()
            raise
        breaker.record_success()
        return response

    async def _acall_provider(
        self,
        provider: Provider,
        name: str,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> Any:
        """Async twin of :meth:`_call_provider` using ``acomplete``."""
        breaker = self.circuit_breakers[name]

        def attempt() -> Any:
            breaker.before_call()
            return provider.acomplete(
                messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

        try:
            response = await aretry_with_backoff(
                attempt, self.max_retries, self.retry_backoff, _RETRYABLE
            )
        except _RETRYABLE:
            breaker.record_failure()
            raise
        breaker.record_success()
        return response

    def _to_chat_response(self, response: Any, provider_name: str) -> ChatResponse:
        """Normalise any provider result into a :class:`ChatResponse`."""
        if isinstance(response, ChatResponse):
            return response
        return ChatResponse(
            content=getattr(response, "content", "") or "",
            model=getattr(response, "model", None) or self.model,
            usage=getattr(response, "usage", None) or {},
            raw=getattr(response, "raw", None),
            tool_calls=getattr(response, "tool_calls", None),
            provider=provider_name,
        )

    def _record_exchange(self, messages: list[Message], assistant_content: str) -> None:
        """Append user messages and the assistant reply to memory."""
        for message in messages:
            if message.get("role") == "user":
                self.memory.add("user", str(message.get("content", "")))
        self.memory.add("assistant", assistant_content)

    def _complete_with_fallback(
        self, messages: list[Message], **kw: Any
    ) -> ChatResponse:
        """Synchronously complete, falling back to the secondary provider.

        On retry exhaustion of the primary provider (ProviderError /
        RateLimitError), the fallback provider is tried when configured and
        the ``fallbacks`` counter is incremented.
        """
        request = self._apply_system_prompt(list(messages))
        call_kw = {
            "model": kw.get("model", self.model),
            "temperature": kw.get("temperature", self.temperature),
            "max_tokens": kw.get("max_tokens", self.max_tokens),
            "timeout": kw.get("timeout", self.timeout),
        }
        try:
            response = self._call_provider(
                self.primary_provider, self._primary_name, request, **call_kw
            )
            return self._to_chat_response(response, self._primary_name)
        except _RETRYABLE as exc:
            self._metrics["failures"] += 1
            if self.fallback_provider is None or self._fallback_name is None:
                raise
            self._metrics["fallbacks"] += 1
            self._log.warning(
                "primary provider failed; using fallback",
                provider=self._primary_name,
                fallback=self._fallback_name,
                error=str(exc),
            )
            fallback_kw = dict(call_kw)
            fallback_kw["model"] = self.fallback_model or call_kw["model"]
            response = self._call_provider(
                self.fallback_provider, self._fallback_name, request, **fallback_kw
            )
            return self._to_chat_response(response, self._fallback_name)

    async def _acomplete_with_fallback(
        self, messages: list[Message], **kw: Any
    ) -> ChatResponse:
        """Async twin of :meth:`_complete_with_fallback`."""
        request = self._apply_system_prompt(list(messages))
        call_kw = {
            "model": kw.get("model", self.model),
            "temperature": kw.get("temperature", self.temperature),
            "max_tokens": kw.get("max_tokens", self.max_tokens),
            "timeout": kw.get("timeout", self.timeout),
        }
        try:
            response = await self._acall_provider(
                self.primary_provider, self._primary_name, request, **call_kw
            )
            return self._to_chat_response(response, self._primary_name)
        except _RETRYABLE as exc:
            self._metrics["failures"] += 1
            if self.fallback_provider is None or self._fallback_name is None:
                raise
            self._metrics["fallbacks"] += 1
            self._log.warning(
                "primary provider failed; using fallback",
                provider=self._primary_name,
                fallback=self._fallback_name,
                error=str(exc),
            )
            fallback_kw = dict(call_kw)
            fallback_kw["model"] = self.fallback_model or call_kw["model"]
            response = await self._acall_provider(
                self.fallback_provider, self._fallback_name, request, **fallback_kw
            )
            return self._to_chat_response(response, self._fallback_name)

    # ------------------------------------------------------------------
    # public API (SPEC section 2)
    # ------------------------------------------------------------------

    def chat(self, messages: list[Message], **kw: Any) -> ChatResponse:
        """Send ``messages`` and return the assistant's reply.

        User messages and the assistant reply are appended to memory.
        Retryable provider failures are retried with exponential backoff;
        once retries are exhausted the fallback provider is used when
        configured. A per-provider circuit breaker fast-fails with
        :class:`CircuitBreakerOpenError` while OPEN.

        Extra keyword arguments may override ``model``, ``temperature``,
        ``max_tokens`` and ``timeout`` for this call; unrecognised keys
        (e.g. ``tools`` from the tool-call loop) are accepted and ignored.
        """
        request_id = bind_request_id()
        self._metrics["requests"] += 1
        self._log.info("chat request", request_id=request_id, provider=self._primary_name)
        response = self._complete_with_fallback(messages, **kw)
        self._record_exchange(list(messages), response.content)
        return response

    async def achat(self, messages: list[Message], **kw: Any) -> ChatResponse:
        """Async twin of :meth:`chat`."""
        request_id = bind_request_id()
        self._metrics["requests"] += 1
        self._log.info(
            "achat request", request_id=request_id, provider=self._primary_name
        )
        response = await self._acomplete_with_fallback(messages, **kw)
        self._record_exchange(list(messages), response.content)
        return response

    def stream(self, messages: list[Message], **kw: Any) -> Iterator[StreamChunk]:
        """Yield :class:`StreamChunk` deltas for ``messages``.

        The stream is guarded by the primary provider's circuit breaker.
        On clean completion the assembled reply is recorded to memory.
        """
        request_id = bind_request_id()
        self._metrics["requests"] += 1
        self._log.info(
            "stream request", request_id=request_id, provider=self._primary_name
        )
        breaker = self.circuit_breakers[self._primary_name]
        request = self._apply_system_prompt(list(messages))
        breaker.before_call()
        deltas: list[str] = []
        try:
            for chunk in self.primary_provider.stream(
                request,
                model=kw.get("model", self.model),
                temperature=kw.get("temperature", self.temperature),
                max_tokens=kw.get("max_tokens", self.max_tokens),
                timeout=kw.get("timeout", self.timeout),
            ):
                deltas.append(chunk.delta)
                yield chunk
        except _RETRYABLE:
            breaker.record_failure()
            self._metrics["failures"] += 1
            raise
        breaker.record_success()
        self._record_exchange(list(messages), "".join(deltas))

    async def astream(
        self, messages: list[Message], **kw: Any
    ) -> AsyncIterator[StreamChunk]:
        """Async twin of :meth:`stream`."""
        request_id = bind_request_id()
        self._metrics["requests"] += 1
        self._log.info(
            "astream request", request_id=request_id, provider=self._primary_name
        )
        breaker = self.circuit_breakers[self._primary_name]
        request = self._apply_system_prompt(list(messages))
        breaker.before_call()
        deltas: list[str] = []
        try:
            async for chunk in self.primary_provider.astream(
                request,
                model=kw.get("model", self.model),
                temperature=kw.get("temperature", self.temperature),
                max_tokens=kw.get("max_tokens", self.max_tokens),
                timeout=kw.get("timeout", self.timeout),
            ):
                deltas.append(chunk.delta)
                yield chunk
        except _RETRYABLE:
            breaker.record_failure()
            self._metrics["failures"] += 1
            raise
        breaker.record_success()
        self._record_exchange(list(messages), "".join(deltas))

    def structured(
        self, messages: list[Message], schema: type[T], **kw: Any
    ) -> T:
        """Extract a pydantic ``schema`` instance from the model's reply.

        The first completion is parsed with
        :func:`claude_engine.core.structured_output.extract` (tolerating
        ```json fences and surrounding prose). On failure exactly one retry
        round-trip is made: the retry prompt is sent back through
        :meth:`chat` and the fresh reply is parsed once more.

        Raises:
            StructuredOutputError: If both attempts fail to parse/validate.
        """
        bind_request_id()
        first = self.chat(list(messages), **kw)

        def retry(prompt: str) -> str:
            follow_up = list(messages) + [{"role": "user", "content": prompt}]
            return self.chat(follow_up, **kw).content

        return extract(first.content, schema, retry=retry)

    def register_tool(self, tool: Tool) -> Tool:
        """Register ``tool`` with the engine's tool registry.

        Returns:
            The registered tool (for fluent use).
        """
        return self.tool_registry.register(tool)

    def clear_memory(self) -> None:
        """Drop all stored conversation messages."""
        self.memory.clear()

    def history(self) -> list[dict[str, str]]:
        """Return the stored conversation messages, oldest first."""
        return self.memory.get()

    def stats(self) -> dict[str, Any]:
        """Return metrics counters plus per-provider circuit state.

        Shape::

            {
                "requests": int,
                "failures": int,
                "fallbacks": int,
                "circuit": {provider: {"state": ..., "failures": int}},
            }
        """
        return {
            **self._metrics,
            "circuit": {
                name: breaker.snapshot()
                for name, breaker in self.circuit_breakers.items()
            },
        }
