"""
Omega AI — NVIDIA Nemotron 3.5 Lightning Client
===============================================
Standalone async client wrapping the OpenAI-compatible Nemotron API.

Features: async chat, streaming, tool calling, structured output,
1M context window management, circuit breaker, retry logic.
"""
from __future__ import annotations

import asyncio, json, os, time, uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any, Literal, TypeVar

import structlog
from pydantic import BaseModel, ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = structlog.get_logger("omega_ai.nemotron")

# ── Config ───────────────────────────────────────────────────────────────
DEFAULT_API_KEY = os.environ.get("NEMOTRON_API_KEY", "")
DEFAULT_BASE_URL = os.environ.get("NEMOTRON_BASE_URL", "http://localhost:8000/v1")
DEFAULT_MODEL = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3.5-lightning")
DEFAULT_MAX_TOKENS = int(os.environ.get("NEMOTRON_MAX_TOKENS", "32768"))
DEFAULT_CONTEXT_WINDOW = int(os.environ.get("NEMOTRON_CONTEXT_WINDOW", "1048576"))
DEFAULT_TEMPERATURE = float(os.environ.get("NEMOTRON_TEMPERATURE", "0.7"))
DEFAULT_TIMEOUT = float(os.environ.get("NEMOTRON_TIMEOUT", "120.0"))
DEFAULT_MAX_RETRIES = int(os.environ.get("NEMOTRON_MAX_RETRIES", "3"))

# ── Data classes ─────────────────────────────────────────────────────────
@dataclass
class NemotronUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

@dataclass
class NemotronChoice:
    index: int = 0
    message: dict[str, Any] = field(default_factory=dict)
    finish_reason: str | None = None

@dataclass
class NemotronResponse:
    id: str = field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:12]}")
    object: str = "chat.completion"
    created: int = field(default_factory=lambda: int(time.time()))
    model: str = DEFAULT_MODEL
    choices: list[NemotronChoice] = field(default_factory=list)
    usage: NemotronUsage = field(default_factory=NemotronUsage)

@dataclass
class NemotronStreamChunk:
    content: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    finish_reason: str | None = None
    is_done: bool = False

# ── Token estimator ──────────────────────────────────────────────────────
def _estimate_tokens(text: str) -> int:
    try:
        import tiktoken
        return len(tiktoken.get_encoding("cl100k_base").encode(text))
    except ImportError:
        return len(text) // 4

def _estimate_message_tokens(messages: list[dict]) -> int:
    total = 0
    for msg in messages:
        total += 4
        content = msg.get("content", "")
        if isinstance(content, str):
            total += _estimate_tokens(content)
        if "tool_calls" in msg:
            for tc in msg["tool_calls"]:
                total += _estimate_tokens(json.dumps(tc))
    return total

def _truncate_messages(messages: list[dict], max_tokens: int = DEFAULT_CONTEXT_WINDOW, reserve: int = 4096) -> list[dict]:
    system_msgs = [m for m in messages if m.get("role") == "system"]
    non_system = [m for m in messages if m.get("role") != "system"]
    system_tokens = sum(_estimate_message_tokens([m]) for m in system_msgs)
    available = max_tokens - system_tokens - reserve
    truncated: list[dict] = []
    current = 0
    for msg in reversed(non_system):
        msg_tokens = _estimate_message_tokens([msg])
        if current + msg_tokens > available:
            break
        truncated.insert(0, msg)
        current += msg_tokens
    return system_msgs + truncated

# ── Circuit breaker ──────────────────────────────────────────────────────
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._last_failure_time = 0.0
        self._state: Literal["closed", "open", "half_open"] = "closed"
        self._lock = asyncio.Lock()

    @property
    def state(self) -> Literal["closed", "open", "half_open"]:
        if self._state == "open" and time.time() - self._last_failure_time > self.recovery_timeout:
            self._state = "half_open"
            self._failures = 0
        return self._state

    async def record_success(self) -> None:
        async with self._lock:
            self._failures = 0
            self._state = "closed"

    async def record_failure(self) -> None:
        async with self._lock:
            self._failures += 1
            self._last_failure_time = time.time()
            if self._failures >= self.failure_threshold:
                self._state = "open"

    def can_execute(self) -> bool:
        return self.state in ("closed", "half_open")

# ── Retry decorator ──────────────────────────────────────────────────────
_nemotron_retry = lambda f: retry(
    stop=stop_after_attempt(DEFAULT_MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((Exception,)),
    reraise=True,
)(f)

# ── Client ───────────────────────────────────────────────────────────────
T = TypeVar("T", bound=BaseModel)

class NemotronClient:
    """Async client for NVIDIA Nemotron 3.5 Lightning."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        context_window: int | None = None,
        temperature: float | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
    ):
        self.api_key = api_key or DEFAULT_API_KEY or "not-needed-for-local"
        self.base_url = base_url or DEFAULT_BASE_URL
        self.model = model or DEFAULT_MODEL
        self.max_tokens = max_tokens or DEFAULT_MAX_TOKENS
        self.context_window = context_window or DEFAULT_CONTEXT_WINDOW
        self.temperature = temperature or DEFAULT_TEMPERATURE
        self.timeout = timeout or DEFAULT_TIMEOUT
        self.max_retries = max_retries or DEFAULT_MAX_RETRIES
        self._client: Any | None = None
        self._circuit = CircuitBreaker()

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout,
            max_retries=0,
        )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

    @_nemotron_retry
    async def chat(self, prompt: str, *, system: str | None = None, messages: list[dict] | None = None, **kwargs) -> NemotronResponse:
        """Send a chat completion request."""
        if not self._circuit.can_execute():
            raise RuntimeError("Nemotron circuit breaker is OPEN")

        client = self._get_client()
        msgs: list[dict] = messages or []
        if system:
            msgs.insert(0, {"role": "system", "content": system})
        if prompt:
            msgs.append({"role": "user", "content": prompt})

        msgs = _truncate_messages(msgs, self.context_window)

        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=msgs,
                temperature=kwargs.get("temperature", self.temperature),
                max_tokens=kwargs.get("max_tokens", self.max_tokens),
            )
            await self._circuit.record_success()
            return NemotronResponse(
                id=resp.id,
                model=resp.model,
                choices=[NemotronChoice(
                    index=c.index,
                    message={"role": "assistant", "content": c.message.content or ""},
                    finish_reason=c.finish_reason,
                ) for c in resp.choices],
                usage=NemotronUsage(
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    total_tokens=resp.usage.total_tokens,
                ) if resp.usage else NemotronUsage(),
            )
        except Exception as e:
            await self._circuit.record_failure()
            logger.error("nemotron_chat_error", error=str(e))
            raise

    async def chat_stream(self, prompt: str, *, system: str | None = None, messages: list[dict] | None = None, **kwargs) -> AsyncGenerator[NemotronStreamChunk, None]:
        """Stream chat completion."""
        if not self._circuit.can_execute():
            raise RuntimeError("Nemotron circuit breaker is OPEN")

        client = self._get_client()
        msgs: list[dict] = messages or []
        if system:
            msgs.insert(0, {"role": "system", "content": system})
        if prompt:
            msgs.append({"role": "user", "content": prompt})

        msgs = _truncate_messages(msgs, self.context_window)

        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=msgs,
                temperature=kwargs.get("temperature", self.temperature),
                max_tokens=kwargs.get("max_tokens", self.max_tokens),
                stream=True,
            )
            async for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if choice:
                    yield NemotronStreamChunk(
                        content=choice.delta.content or "",
                        finish_reason=choice.finish_reason,
                    )
            yield NemotronStreamChunk(is_done=True)
            await self._circuit.record_success()
        except Exception as e:
            await self._circuit.record_failure()
            logger.error("nemotron_stream_error", error=str(e))
            raise

    @_nemotron_retry
    async def tool_call(self, prompt: str, tools: list[dict], *, messages: list[dict] | None = None, **kwargs) -> NemotronResponse:
        """Execute tool calling."""
        if not self._circuit.can_execute():
            raise RuntimeError("Nemotron circuit breaker is OPEN")

        client = self._get_client()
        msgs: list[dict] = messages or []
        if prompt:
            msgs.append({"role": "user", "content": prompt})
        msgs = _truncate_messages(msgs, self.context_window)

        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=msgs,
                temperature=kwargs.get("temperature", 0.1),
                max_tokens=kwargs.get("max_tokens", self.max_tokens),
                tools=tools,
                tool_choice="auto",
            )
            await self._circuit.record_success()
            return NemotronResponse(
                id=resp.id,
                model=resp.model,
                choices=[NemotronChoice(
                    index=c.index,
                    message={
                        "role": "assistant",
                        "content": c.message.content or "",
                        "tool_calls": [tc.model_dump() for tc in c.message.tool_calls] if c.message.tool_calls else None,
                    },
                    finish_reason=c.finish_reason,
                ) for c in resp.choices],
                usage=NemotronUsage(
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    total_tokens=resp.usage.total_tokens,
                ) if resp.usage else NemotronUsage(),
            )
        except Exception as e:
            await self._circuit.record_failure()
            logger.error("nemotron_tool_call_error", error=str(e))
            raise

    @_nemotron_retry
    async def structured_output(self, prompt: str, schema: type[T], *, messages: list[dict] | None = None, **kwargs) -> T:
        """Generate structured output matching a Pydantic schema."""
        if not self._circuit.can_execute():
            raise RuntimeError("Nemotron circuit breaker is OPEN")

        client = self._get_client()
        msgs: list[dict] = messages or []
        if prompt:
            msgs.append({"role": "user", "content": prompt})
        msgs = _truncate_messages(msgs, self.context_window)

        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=msgs,
                temperature=kwargs.get("temperature", 0.1),
                max_tokens=kwargs.get("max_tokens", 8192),
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content or "{}"
            parsed = json.loads(content)
            result = schema(**parsed)
            await self._circuit.record_success()
            return result
        except (json.JSONDecodeError, ValidationError) as e:
            await self._circuit.record_failure()
            logger.error("nemotron_structured_error", error=str(e))
            raise
        except Exception as e:
            await self._circuit.record_failure()
            logger.error("nemotron_structured_error", error=str(e))
            raise

    def count_tokens(self, text: str) -> int:
        """Estimate token count for a string."""
        return _estimate_tokens(text)

    def count_message_tokens(self, messages: list[dict]) -> int:
        """Estimate token count for a message list."""
        return _estimate_message_tokens(messages)

    def truncate_to_fit(self, messages: list[dict], reserve: int = 4096) -> list[dict]:
        """Truncate messages to fit context window."""
        return _truncate_messages(messages, self.context_window, reserve)

    @property
    def circuit_state(self) -> str:
        return self._circuit.state

    @property
    def is_healthy(self) -> bool:
        return self._circuit.state in ("closed", "half_open")
