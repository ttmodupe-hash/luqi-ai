"""Provider protocol, SDK-backed providers, and circuit breaker.

Implements SPEC sections 4 and 5:

* :class:`Provider` -- the structural protocol every backend satisfies
  (``complete`` / ``stream`` and async twins ``acomplete`` / ``astream``).
* :class:`ProviderResponse` -- normalised completion result.
* :class:`OpenAIProvider` / :class:`AnthropicProvider` -- thin adapters over
  the vendor SDKs. SDK clients are imported LAZILY inside methods, so this
  module imports cleanly with neither SDK installed; actually *using* a
  provider without its SDK raises :class:`ProviderError` with a
  ``pip install`` hint.
* :class:`CircuitBreaker` -- per-provider failure tracking: OPEN after
  ``failure_threshold`` failures inside ``window_seconds``, fast-fail with
  :class:`CircuitBreakerOpenError` while OPEN, a single half-open trial
  after ``half_open_seconds``, and full reset to CLOSED on success.
"""

from __future__ import annotations

import time
from collections import deque
from collections.abc import AsyncIterator, Callable, Iterator
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from ..utils.errors import (
    AuthenticationError,
    CircuitBreakerOpenError,
    ModelNotFoundError,
    ProviderError,
    RateLimitError,
)
from .streaming import StreamChunk

# A chat message in the normalised wire format: {"role": ..., "content": ...}.
Message = dict[str, Any]

_OPENAI_HINT = (
    "The 'openai' package is required for OpenAIProvider. "
    "Install it with: pip install openai"
)
_ANTHROPIC_HINT = (
    "The 'anthropic' package is required for AnthropicProvider. "
    "Install it with: pip install anthropic"
)


@dataclass
class ProviderResponse:
    """Normalised, provider-agnostic completion result.

    Attributes:
        content: The assistant's text reply.
        model: The model identifier that produced the reply (as reported by
            the provider, which may differ from the requested alias).
        usage: Token accounting, e.g. ``{"prompt_tokens": ..., ...}``.
        raw: The provider's raw response as a plain dict, when available,
            for callers that need provider-specific fields.
    """

    content: str
    model: str
    usage: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] | None = None


@runtime_checkable
class Provider(Protocol):
    """Structural protocol for completion backends (SPEC section 5).

    Any object implementing these four members is a valid ``Provider``;
    explicit subclassing is not required.
    """

    def complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Return a single completion for ``messages``."""
        ...

    def stream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> Iterator[StreamChunk]:
        """Yield :class:`StreamChunk` deltas for ``messages``."""
        ...

    async def acomplete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Async twin of :meth:`complete`."""
        ...

    def astream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> AsyncIterator[StreamChunk]:
        """Async twin of :meth:`stream`."""
        ...


def _dump(obj: Any) -> dict[str, Any] | None:
    """Best-effort conversion of an SDK response object to a plain dict."""
    if obj is None:
        return None
    model_dump = getattr(obj, "model_dump", None)
    if callable(model_dump):
        try:
            return model_dump()
        except Exception:  # noqa: BLE001 - raw payload is best-effort only
            return None
    return None


class OpenAIProvider:
    """Provider backed by the OpenAI chat-completions API.

    The ``openai`` SDK is imported lazily inside each method, so importing
    this class never requires the SDK to be installed.
    """

    name = "openai"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        **client_kwargs: Any,
    ) -> None:
        """Initialise the provider (no SDK import happens here).

        Args:
            api_key: OpenAI API key; when ``None`` the SDK falls back to its
                own environment-based configuration.
            base_url: Optional override for the API base URL (proxies,
                OpenAI-compatible servers).
            client_kwargs: Extra keyword arguments forwarded verbatim to the
                ``openai.OpenAI`` / ``openai.AsyncOpenAI`` constructors.
        """
        self.api_key = api_key
        self.base_url = base_url
        self._client_kwargs = client_kwargs
        self._sync_client: Any = None
        self._async_client: Any = None

    # -- lazy SDK plumbing ------------------------------------------------

    @staticmethod
    def _sdk() -> Any:
        """Import and return the ``openai`` module, or raise ProviderError."""
        try:
            import openai
        except ImportError as exc:
            raise ProviderError(_OPENAI_HINT) from exc
        return openai

    def _client_config(self) -> dict[str, Any]:
        config = dict(self._client_kwargs)
        if self.api_key is not None:
            config["api_key"] = self.api_key
        if self.base_url is not None:
            config["base_url"] = self.base_url
        return config

    def _get_sync_client(self) -> Any:
        if self._sync_client is None:
            self._sync_client = self._sdk().OpenAI(**self._client_config())
        return self._sync_client

    def _get_async_client(self) -> Any:
        if self._async_client is None:
            self._async_client = self._sdk().AsyncOpenAI(**self._client_config())
        return self._async_client

    def _wrap_error(self, exc: Exception) -> ProviderError:
        """Map SDK exceptions onto the claude_engine error hierarchy."""
        openai = self._sdk()
        if isinstance(exc, getattr(openai, "RateLimitError", ())):
            return RateLimitError(str(exc), provider=self.name)
        if isinstance(exc, getattr(openai, "AuthenticationError", ())):
            return AuthenticationError(str(exc), provider=self.name)
        if isinstance(exc, getattr(openai, "NotFoundError", ())):
            return ModelNotFoundError(str(exc), provider=self.name)
        return ProviderError(f"OpenAI request failed: {exc}", provider=self.name)

    # -- Provider protocol ------------------------------------------------

    def complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Complete synchronously via ``client.chat.completions.create``."""
        client = self._get_sync_client()
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
        except Exception as exc:
            raise self._wrap_error(exc) from exc
        choice = resp.choices[0]
        usage = _dump(getattr(resp, "usage", None)) or {}
        return ProviderResponse(
            content=choice.message.content or "",
            model=getattr(resp, "model", model),
            usage=usage,
            raw=_dump(resp),
        )

    def stream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> Iterator[StreamChunk]:
        """Yield StreamChunks from a streaming chat completion."""
        client = self._get_sync_client()
        try:
            events = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                stream=True,
            )
            for event in events:
                yield _openai_event_to_chunk(event)
        except Exception as exc:
            raise self._wrap_error(exc) from exc

    async def acomplete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Async twin of :meth:`complete` using ``AsyncOpenAI``."""
        client = self._get_async_client()
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
        except Exception as exc:
            raise self._wrap_error(exc) from exc
        choice = resp.choices[0]
        usage = _dump(getattr(resp, "usage", None)) or {}
        return ProviderResponse(
            content=choice.message.content or "",
            model=getattr(resp, "model", model),
            usage=usage,
            raw=_dump(resp),
        )

    async def astream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> AsyncIterator[StreamChunk]:
        """Async twin of :meth:`stream`."""
        client = self._get_async_client()
        try:
            events = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                stream=True,
            )
            async for event in events:
                yield _openai_event_to_chunk(event)
        except Exception as exc:
            raise self._wrap_error(exc) from exc


def _openai_event_to_chunk(event: Any) -> StreamChunk:
    """Convert one OpenAI stream event into a :class:`StreamChunk`."""
    delta = ""
    finish_reason = None
    choices = getattr(event, "choices", None) or []
    if choices:
        choice = choices[0]
        delta = getattr(getattr(choice, "delta", None), "content", None) or ""
        finish_reason = getattr(choice, "finish_reason", None)
    usage = _dump(getattr(event, "usage", None))
    return StreamChunk(delta=delta, finish_reason=finish_reason, usage=usage)


class AnthropicProvider:
    """Provider backed by the Anthropic messages API.

    The ``anthropic`` SDK is imported lazily inside each method, so
    importing this class never requires the SDK to be installed.
    """

    name = "anthropic"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        **client_kwargs: Any,
    ) -> None:
        """Initialise the provider (no SDK import happens here).

        Args:
            api_key: Anthropic API key; when ``None`` the SDK falls back to
                its own environment-based configuration.
            base_url: Optional override for the API base URL.
            client_kwargs: Extra keyword arguments forwarded verbatim to the
                ``anthropic.Anthropic`` / ``anthropic.AsyncAnthropic``
                constructors.
        """
        self.api_key = api_key
        self.base_url = base_url
        self._client_kwargs = client_kwargs
        self._sync_client: Any = None
        self._async_client: Any = None

    # -- lazy SDK plumbing ------------------------------------------------

    @staticmethod
    def _sdk() -> Any:
        """Import and return the ``anthropic`` module, or raise ProviderError."""
        try:
            import anthropic
        except ImportError as exc:
            raise ProviderError(_ANTHROPIC_HINT) from exc
        return anthropic

    def _client_config(self) -> dict[str, Any]:
        config = dict(self._client_kwargs)
        if self.api_key is not None:
            config["api_key"] = self.api_key
        if self.base_url is not None:
            config["base_url"] = self.base_url
        return config

    def _get_sync_client(self) -> Any:
        if self._sync_client is None:
            self._sync_client = self._sdk().Anthropic(**self._client_config())
        return self._sync_client

    def _get_async_client(self) -> Any:
        if self._async_client is None:
            self._async_client = self._sdk().AsyncAnthropic(**self._client_config())
        return self._async_client

    def _wrap_error(self, exc: Exception) -> ProviderError:
        """Map SDK exceptions onto the claude_engine error hierarchy."""
        anthropic = self._sdk()
        if isinstance(exc, getattr(anthropic, "RateLimitError", ())):
            return RateLimitError(str(exc), provider=self.name)
        if isinstance(exc, getattr(anthropic, "AuthenticationError", ())):
            return AuthenticationError(str(exc), provider=self.name)
        if isinstance(exc, getattr(anthropic, "NotFoundError", ())):
            return ModelNotFoundError(str(exc), provider=self.name)
        return ProviderError(f"Anthropic request failed: {exc}", provider=self.name)

    @staticmethod
    def _split_system(messages: list[Message]) -> tuple[str | None, list[Message]]:
        """Extract system messages; Anthropic takes ``system`` separately."""
        system_parts: list[str] = []
        rest: list[Message] = []
        for message in messages:
            if message.get("role") == "system":
                system_parts.append(str(message.get("content", "")))
            else:
                rest.append(message)
        system = "\n\n".join(system_parts) if system_parts else None
        return system, rest

    def _create_kwargs(
        self,
        messages: list[Message],
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> dict[str, Any]:
        system, rest = self._split_system(messages)
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": rest,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": timeout,
        }
        if system is not None:
            kwargs["system"] = system
        return kwargs

    # -- Provider protocol ------------------------------------------------

    def complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Complete synchronously via ``client.messages.create``."""
        client = self._get_sync_client()
        kwargs = self._create_kwargs(messages, model, temperature, max_tokens, timeout)
        try:
            resp = client.messages.create(**kwargs)
        except Exception as exc:
            raise self._wrap_error(exc) from exc
        return _anthropic_response_to_provider_response(resp, model)

    def stream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> Iterator[StreamChunk]:
        """Yield StreamChunks from a streaming Anthropic message."""
        client = self._get_sync_client()
        kwargs = self._create_kwargs(messages, model, temperature, max_tokens, timeout)
        try:
            for event in client.messages.create(stream=True, **kwargs):
                chunk = _anthropic_event_to_chunk(event)
                if chunk is not None:
                    yield chunk
        except Exception as exc:
            raise self._wrap_error(exc) from exc

    async def acomplete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> ProviderResponse:
        """Async twin of :meth:`complete` using ``AsyncAnthropic``."""
        client = self._get_async_client()
        kwargs = self._create_kwargs(messages, model, temperature, max_tokens, timeout)
        try:
            resp = await client.messages.create(**kwargs)
        except Exception as exc:
            raise self._wrap_error(exc) from exc
        return _anthropic_response_to_provider_response(resp, model)

    async def astream(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> AsyncIterator[StreamChunk]:
        """Async twin of :meth:`stream`."""
        client = self._get_async_client()
        kwargs = self._create_kwargs(messages, model, temperature, max_tokens, timeout)
        try:
            stream = await client.messages.create(stream=True, **kwargs)
            async for event in stream:
                chunk = _anthropic_event_to_chunk(event)
                if chunk is not None:
                    yield chunk
        except Exception as exc:
            raise self._wrap_error(exc) from exc


def _anthropic_response_to_provider_response(resp: Any, model: str) -> ProviderResponse:
    """Normalise an Anthropic ``Message`` into a :class:`ProviderResponse`."""
    parts = []
    for block in getattr(resp, "content", None) or []:
        text = getattr(block, "text", None)
        if text:
            parts.append(text)
    raw_usage = getattr(resp, "usage", None)
    usage: dict[str, Any] = {}
    if raw_usage is not None:
        usage = {
            "input_tokens": getattr(raw_usage, "input_tokens", 0),
            "output_tokens": getattr(raw_usage, "output_tokens", 0),
        }
    return ProviderResponse(
        content="".join(parts),
        model=getattr(resp, "model", model),
        usage=usage,
        raw=_dump(resp),
    )


def _anthropic_event_to_chunk(event: Any) -> StreamChunk | None:
    """Convert one Anthropic stream event into a StreamChunk (or skip it)."""
    event_type = getattr(event, "type", "")
    if event_type == "content_block_delta":
        delta = getattr(event, "delta", None)
        text = getattr(delta, "text", None) or ""
        return StreamChunk(delta=text)
    if event_type == "message_delta":
        delta = getattr(event, "delta", None)
        stop_reason = getattr(delta, "stop_reason", None)
        usage = _dump(getattr(event, "usage", None))
        return StreamChunk(delta="", finish_reason=stop_reason, usage=usage)
    return None


class CircuitBreaker:
    """Per-provider circuit breaker (SPEC section 4).

    State machine:

    * CLOSED -- calls flow through. Each failure is timestamped; once
      ``failure_threshold`` failures sit inside a sliding
      ``window_seconds`` window, the breaker trips OPEN.
    * OPEN -- :meth:`before_call` raises :class:`CircuitBreakerOpenError`
      immediately (fast fail). After ``half_open_seconds`` have elapsed
      since the trip, the breaker becomes half-open and allows one trial
      call through.
    * HALF_OPEN -- the trial call's outcome decides: :meth:`record_success`
      resets everything to CLOSED; :meth:`record_failure` trips the breaker
      OPEN again (restarting the half-open timer).

    The wall clock is injectable via ``clock`` so tests can use a fake
    clock instead of sleeping.
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        *,
        failure_threshold: int = 5,
        window_seconds: float = 60.0,
        half_open_seconds: float = 30.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        """Initialise a CLOSED breaker.

        Args:
            failure_threshold: Failures inside the window that trip OPEN.
            window_seconds: Sliding window in which failures are counted.
            half_open_seconds: Delay after tripping OPEN before a half-open
                trial call is permitted.
            clock: Monotonic time source (seconds); injectable for tests.
        """
        if failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")
        self.failure_threshold = failure_threshold
        self.window_seconds = window_seconds
        self.half_open_seconds = half_open_seconds
        self._clock = clock
        self._failure_times: deque[float] = deque()
        self._state = self.CLOSED
        self._opened_at: float | None = None

    @property
    def state(self) -> str:
        """Current state: ``"closed"``, ``"open"`` or ``"half_open"``.

        An OPEN breaker whose half-open delay has elapsed transitions to
        ``"half_open"`` as a side effect of this property.
        """
        if self._state == self.OPEN and self._opened_at is not None:
            if self._clock() - self._opened_at >= self.half_open_seconds:
                self._state = self.HALF_OPEN
        return self._state

    @property
    def failures(self) -> int:
        """Number of recorded failures still inside the sliding window."""
        self._prune_failures()
        return len(self._failure_times)

    def snapshot(self) -> dict[str, Any]:
        """Return ``{"state": ..., "failures": ...}`` for ``stats()``."""
        return {"state": self.state, "failures": self.failures}

    def before_call(self) -> None:
        """Gate a call through the breaker.

        Raises:
            CircuitBreakerOpenError: If the breaker is OPEN and the
                half-open delay has not yet elapsed.
        """
        if self.state == self.OPEN:
            retry_in = 0.0
            if self._opened_at is not None:
                retry_in = max(
                    0.0,
                    self.half_open_seconds - (self._clock() - self._opened_at),
                )
            raise CircuitBreakerOpenError(
                "The provider circuit breaker is open; call rejected "
                f"(retry in {retry_in:.1f}s).",
                state=self._state,
                retry_in=retry_in,
            )

    def record_success(self) -> None:
        """Record a successful call; resets the breaker to CLOSED."""
        self._failure_times.clear()
        self._state = self.CLOSED
        self._opened_at = None

    def record_failure(self) -> None:
        """Record a failed call; may trip the breaker OPEN.

        A failure during a half-open trial immediately re-opens the
        breaker. In CLOSED state, the breaker trips once the number of
        failures inside the sliding window reaches
        ``failure_threshold``.
        """
        now = self._clock()
        self._failure_times.append(now)
        self._prune_failures()
        if self._state == self.HALF_OPEN:
            self._trip(now)
        elif len(self._failure_times) >= self.failure_threshold:
            self._trip(now)

    def _trip(self, now: float) -> None:
        self._state = self.OPEN
        self._opened_at = now

    def _prune_failures(self) -> None:
        cutoff = self._clock() - self.window_seconds
        while self._failure_times and self._failure_times[0] <= cutoff:
            self._failure_times.popleft()
