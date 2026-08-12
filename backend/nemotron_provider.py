"""
LUQI AI — NVIDIA Nemotron 3.5 Lightning Provider
==================================================
FastAPI router providing OpenAI-compatible access to NVIDIA Nemotron 3.5
Lightning with streaming, tool calling, structured output, and 1M context.

Features: 1M context window, speculative decoding (MTP), 4x throughput,
native tool calling, multi-turn excellence, local deployment via vLLM/TGI/NIM.
"""
from __future__ import annotations

import asyncio, json, os, time, uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, Literal, Optional

import structlog
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = structlog.get_logger("luqi.nemotron")

# ── Config ───────────────────────────────────────────────────────────────
NEMOTRON_API_KEY = os.environ.get("NEMOTRON_API_KEY", "")
NEMOTRON_BASE_URL = os.environ.get("NEMOTRON_BASE_URL", "http://localhost:8000/v1")
NEMOTRON_MODEL = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3.5-lightning")
ENABLE_NEMOTRON = os.environ.get("ENABLE_NEMOTRON", "false").lower() in ("1", "true", "yes")
NEMOTRON_MAX_TOKENS = int(os.environ.get("NEMOTRON_MAX_TOKENS", "32768"))
NEMOTRON_CONTEXT_WINDOW = int(os.environ.get("NEMOTRON_CONTEXT_WINDOW", "1048576"))
NEMOTRON_TEMPERATURE = float(os.environ.get("NEMOTRON_TEMPERATURE", "0.7"))
NEMOTRON_TIMEOUT = float(os.environ.get("NEMOTRON_TIMEOUT", "120.0"))
NEMOTRON_MAX_RETRIES = int(os.environ.get("NEMOTRON_MAX_RETRIES", "3"))

NEMOTRON_MODELS = {
    "nvidia/nemotron-3.5-lightning": {
        "id": "nvidia/nemotron-3.5-lightning",
        "name": "Nemotron 3.5 Lightning",
        "context_window": 1_048_576,
        "capabilities": ["chat", "streaming", "tool_calling", "structured_output", "long_context", "multi_turn"],
    },
    "nvidia/nemotron-3.5-8b-instruct": {
        "id": "nvidia/nemotron-3.5-8b-instruct",
        "name": "Nemotron 3.5 8B Instruct",
        "context_window": 131_072,
        "capabilities": ["chat", "streaming", "tool_calling", "structured_output"],
    },
}

# ── OpenAI client (lazy) ─────────────────────────────────────────────────
_openai_client: Any | None = None

def _get_client() -> Any:
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    from openai import AsyncOpenAI
    _openai_client = AsyncOpenAI(
        api_key=NEMOTRON_API_KEY or "not-needed-for-local",
        base_url=NEMOTRON_BASE_URL,
        timeout=NEMOTRON_TIMEOUT,
        max_retries=0,
    )
    logger.info("nemotron_client_initialized", base_url=NEMOTRON_BASE_URL, model=NEMOTRON_MODEL)
    return _openai_client

# ── Circuit breaker ──────────────────────────────────────────────────────
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._last_failure_time = 0.0
        self._state: Literal["closed", "open", "half_open"] = "closed"

    @property
    def state(self) -> Literal["closed", "open", "half_open"]:
        if self._state == "open" and time.time() - self._last_failure_time > self.recovery_timeout:
            self._state = "half_open"
            self._failures = 0
        return self._state

    def record_success(self) -> None:
        self._failures = 0
        self._state = "closed"

    def record_failure(self) -> None:
        self._failures += 1
        self._last_failure_time = time.time()
        if self._failures >= self.failure_threshold:
            self._state = "open"

    def can_execute(self) -> bool:
        return self.state in ("closed", "half_open")

_circuit = CircuitBreaker()

# ── Token estimation ─────────────────────────────────────────────────────
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

def _truncate_messages(messages: list[dict], max_tokens: int = NEMOTRON_CONTEXT_WINDOW, reserve: int = 4096) -> list[dict]:
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

# ── Pydantic models ──────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"] = "user"
    content: str = ""
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[dict]] = None

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = NEMOTRON_MODEL
    temperature: float = Field(default=NEMOTRON_TEMPERATURE, ge=0.0, le=2.0)
    max_tokens: int = Field(default=NEMOTRON_MAX_TOKENS, ge=1, le=1_048_576)
    stream: bool = False
    tools: Optional[list[dict]] = None
    tool_choice: Optional[str | dict] = None
    response_format: Optional[dict] = None

class ChatResponse(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:12]}")
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str = NEMOTRON_MODEL
    choices: list[dict]
    usage: dict[str, int] = Field(default_factory=dict)

class ToolCallRequest(BaseModel):
    messages: list[ChatMessage]
    tools: list[dict]
    model: str = NEMOTRON_MODEL
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)

class StructuredOutputRequest(BaseModel):
    messages: list[ChatMessage]
    schema_json: dict[str, Any]
    model: str = NEMOTRON_MODEL
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    max_tokens: int = Field(default=8192, ge=1, le=1_048_576)

class TokenCountResponse(BaseModel):
    estimated_tokens: int
    context_window: int
    remaining_tokens: int
    truncation_needed: bool
    message_count: int

class HealthResponse(BaseModel):
    status: str
    model: str
    endpoint: str
    circuit_state: str
    timestamp: float
    version: str = "3.5.0"

# ── Retry decorator ──────────────────────────────────────────────────────
_nemotron_retry = lambda f: retry(
    stop=stop_after_attempt(NEMOTRON_MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((Exception,)),
    reraise=True,
)(f)

# ── Core chat logic ──────────────────────────────────────────────────────
async def _chat_completion(request: ChatRequest, stream: bool = False) -> Any:
    if not _circuit.can_execute():
        raise HTTPException(status_code=503, detail="Nemotron circuit breaker is OPEN")

    client = _get_client()
    messages = _truncate_messages([m.model_dump(exclude_none=True) for m in request.messages])

    payload = {
        "model": request.model,
        "messages": messages,
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
        "stream": stream,
    }
    if request.tools:
        payload["tools"] = request.tools
        payload["tool_choice"] = request.tool_choice or "auto"
    if request.response_format:
        payload["response_format"] = request.response_format

    try:
        if stream:
            return await client.chat.completions.create(**payload)
        resp = await client.chat.completions.create(**payload)
        _circuit.record_success()
        return resp
    except Exception as e:
        _circuit.record_failure()
        logger.error("nemotron_chat_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Nemotron error: {e}")

# ── Router ───────────────────────────────────────────────────────────────
nemotron_router = APIRouter(prefix="/nemotron", tags=["nemotron"])

@nemotron_router.post("/chat")
async def nemotron_chat(request: ChatRequest):
    """Chat completion with optional streaming."""
    if not ENABLE_NEMOTRON:
        raise HTTPException(status_code=503, detail="Nemotron is disabled")

    if request.stream:
        async def event_stream() -> AsyncGenerator[str, None]:
            stream_resp = await _chat_completion(request, stream=True)
            async for chunk in stream_resp:
                data = {
                    "id": chunk.id,
                    "object": "chat.completion.chunk",
                    "created": chunk.created,
                    "model": chunk.model,
                    "choices": [{"index": 0, "delta": {"content": c.delta.content or ""}, "finish_reason": c.finish_reason} for c in chunk.choices],
                }
                yield f"data: {json.dumps(data)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(event_stream(), media_type="text/event-stream")

    resp = await _chat_completion(request, stream=False)
    return ChatResponse(
        id=resp.id,
        model=resp.model,
        choices=[{"index": c.index, "message": {"role": "assistant", "content": c.message.content or ""}, "finish_reason": c.finish_reason} for c in resp.choices],
        usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens} if resp.usage else {},
    )

@nemotron_router.post("/chat/async")
async def nemotron_chat_async(request: ChatRequest):
    """Async non-streaming chat completion."""
    request.stream = False
    return await nemotron_chat(request)

@nemotron_router.get("/models")
async def nemotron_models():
    """List available Nemotron models."""
    return {"object": "list", "data": list(NEMOTRON_MODELS.values())}

@nemotron_router.get("/health")
async def nemotron_health():
    """Nemotron health check."""
    healthy = False
    try:
        client = _get_client()
        # Lightweight models list call
        await client.models.list()
        healthy = True
        _circuit.record_success()
    except Exception:
        pass

    return HealthResponse(
        status="healthy" if healthy else "unhealthy",
        model=NEMOTRON_MODEL,
        endpoint=NEMOTRON_BASE_URL,
        circuit_state=_circuit.state,
        timestamp=time.time(),
    )

@nemotron_router.post("/tools")
async def nemotron_tools(request: ToolCallRequest):
    """Tool calling endpoint."""
    if not ENABLE_NEMOTRON:
        raise HTTPException(status_code=503, detail="Nemotron is disabled")

    chat_req = ChatRequest(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        tools=request.tools,
        tool_choice="auto",
        stream=False,
    )
    resp = await _chat_completion(chat_req, stream=False)
    return ChatResponse(
        id=resp.id,
        model=resp.model,
        choices=[{"index": c.index, "message": {"role": "assistant", "content": c.message.content or "", "tool_calls": [tc.model_dump() for tc in c.message.tool_calls] if c.message.tool_calls else None}, "finish_reason": c.finish_reason} for c in resp.choices],
        usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens} if resp.usage else {},
    )

@nemotron_router.post("/structured")
async def nemotron_structured(request: StructuredOutputRequest):
    """Structured output with JSON schema."""
    if not ENABLE_NEMOTRON:
        raise HTTPException(status_code=503, detail="Nemotron is disabled")

    chat_req = ChatRequest(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        response_format={"type": "json_object"},
        stream=False,
    )
    resp = await _chat_completion(chat_req, stream=False)
    content = resp.choices[0].message.content or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON in structured output")
    return {"data": parsed, "usage": {"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens} if resp.usage else {}}

@nemotron_router.post("/token-count")
async def nemotron_token_count(request: ChatRequest):
    """Estimate token count for messages."""
    messages = [m.model_dump(exclude_none=True) for m in request.messages]
    estimated = _estimate_message_tokens(messages)
    return TokenCountResponse(
        estimated_tokens=estimated,
        context_window=NEMOTRON_CONTEXT_WINDOW,
        remaining_tokens=max(0, NEMOTRON_CONTEXT_WINDOW - estimated),
        truncation_needed=estimated > NEMOTRON_CONTEXT_WINDOW,
        message_count=len(messages),
    )

# ── Lifespan ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def nemotron_lifespan(app: Any):
    logger.info("nemotron_lifespan_startup", enabled=ENABLE_NEMOTRON, model=NEMOTRON_MODEL)
    yield
    global _openai_client
    if _openai_client is not None:
        await _openai_client.close()
        _openai_client = None
    logger.info("nemotron_lifespan_shutdown")
