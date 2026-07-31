# SPEC.md — claude_engine (provider-agnostic AI engine library)

Single source of truth. Sacred contracts below — implement faithfully, no unilateral changes.
Repo root: `/mnt/agents/output/project/` (git, branch `main`). Package: `claude_engine/`.

## 1. Package layout (13 modules)
```
claude_engine/
  __init__.py            # public API re-exports + __version__ = "1.0.0"
  config/__init__.py
  config/settings.py     # EngineSettings (pydantic-settings, env prefix CLAUDE_ENGINE_)
  utils/__init__.py
  utils/errors.py        # 10 custom exceptions
  utils/retries.py       # exponential backoff helpers
  utils/logging_config.py# structlog setup + request-id propagation
  core/__init__.py
  core/personality.py    # system-prompt personalities
  core/providers.py      # Provider protocol + OpenAIProvider + AnthropicProvider (lazy client imports)
  core/memory.py         # Memory protocol + InMemoryMemory + RedisMemory (lazy redis import)
  core/tools.py          # Tool dataclass + registry + tool-call loop helpers
  core/structured_output.py # Pydantic schema extraction/validation
  core/streaming.py      # chunk types + sync/async stream assembly
  core/engine.py         # ClaudeLikeEngine (facade wiring everything)
  compat/__init__.py
  compat/legacy.py       # backward-compatible shims
tests/                   # pytest suite (no network, no real API keys — FakeProvider)
pyproject.toml
requirements.txt         # openai>=1.30.0, anthropic>=0.28.0, pydantic>=2.0, pydantic-settings>=2.0, redis>=5.0, tenacity>=8.0, structlog>=24.0
```

## 2. Sacred interface — engine signature (18 params, EXACT)
```python
class ClaudeLikeEngine:
    def __init__(
        self,
        model: str = "gpt-4o-mini",
        provider: str = "openai",                  # "openai" | "anthropic"
        api_key: str | None = None,
        fallback_provider: str | None = None,
        fallback_api_key: str | None = None,
        fallback_model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_backoff: float = 2.0,                # exponential base seconds
        circuit_failure_threshold: int = 5,
        circuit_window_seconds: float = 60.0,
        circuit_half_open_seconds: float = 30.0,
        memory: "Memory | None" = None,            # default InMemoryMemory()
        tools: "list[Tool] | None" = None,
        system_prompt: str | None = None,
        log_level: str = "INFO",
    ) -> None: ...
```
Public methods: `chat(messages, **kw) -> ChatResponse`; `achat(...)`; `stream(messages, **kw)` (sync generator of StreamChunk); `astream(...)`; `structured(messages, schema: type[BaseModel], **kw)`; `register_tool(tool)`; `clear_memory()`; `history() -> list[dict]`; `stats() -> dict` (counters + circuit state).

## 3. The 10 exceptions (utils/errors.py)
`ClaudeEngineError` (base) -> `ProviderError`, `RateLimitError`, `AuthenticationError`, `ModelNotFoundError`, `StreamingError`, `ToolExecutionError`, `StructuredOutputError`, `MemoryBackendError`, `CircuitBreakerOpenError`.
(NOTE: deviation from legacy name "MemoryError" — renamed `MemoryBackendError` to avoid shadowing the Python builtin. Documented in legacy shim.)

## 4. Provider fallback + circuit breaker (core/providers.py + engine)
- Primary provider raises ProviderError/RateLimitError -> retry with exponential backoff (`max_retries`, base `retry_backoff`, jitter +/-10%) -> then fallback provider if configured.
- Circuit breaker per provider: `circuit_failure_threshold` (default 5) failures inside `circuit_window_seconds` (60s) -> OPEN; while OPEN, calls raise `CircuitBreakerOpenError` immediately; after `circuit_half_open_seconds` (30s) -> half-open trial call; success -> CLOSED (counters reset); failure -> OPEN again.
- `stats()["circuit"]` exposes `{provider: {"state": "closed"|"open"|"half_open", "failures": n}}`.

## 5. Module contracts
- **settings**: pydantic-settings `BaseSettings`, `model_config = SettingsConfigDict(env_prefix="CLAUDE_ENGINE_")`; fields mirror all 18 init params; `EngineSettings.from_env()`.
- **personality**: `Personality` dataclass (name, system_prompt); presets: `DEFAULT`, `RESEARCHER`, `TUTOR`, `ENGINEER`; `get_personality(name)`.
- **providers**: `Provider` protocol: `complete(messages, *, model, temperature, max_tokens, timeout) -> ProviderResponse`; `stream(...) -> Iterator[StreamChunk]`; async twins `acomplete`/`astream`. `ProviderResponse(content, model, usage: dict, raw: dict | None)`. OpenAI/Anthropic SDK clients imported LAZILY inside methods — `import claude_engine` must work with neither SDK installed; using a provider without its SDK raises `ProviderError` with install hint.
- **memory**: `Memory` protocol: `add(role, content)`, `get() -> list[dict]`, `clear()`, `__len__`. `InMemoryMemory(max_messages=200)` trims oldest. `RedisMemory(url, key_prefix="claude_engine:", ttl=86400)` lazy redis import.
- **tools**: `Tool` dataclass: `name`, `description`, `parameters: dict` (JSON schema), `handler: Callable`. `ToolRegistry`: register/get/list/as_openai_schema(). `run_tool_loop(engine, messages, max_rounds=5)`: executes tool calls, appends results, raises `ToolExecutionError` on handler failure (wraps original).
- **structured_output**: `extract(text, schema) -> BaseModel` — parse JSON from model text (tolerate ```json fences), validate with pydantic, raise `StructuredOutputError` after 1 retry prompt.
- **streaming**: `StreamChunk` dataclass: `delta: str`, `finish_reason: str | None = None`, `usage: dict | None = None`. `assemble(chunks) -> str` joins deltas. Sync + async assembly helpers.
- **engine**: wires settings <- explicit params override; owns primary/fallback providers, circuit breakers, memory, registry; `chat` records user+assistant messages to memory; request-id (uuid4 hex[:12]) bound to structlog context per call; Prometheus metrics stub: `METRICS = {"requests": 0, "failures": 0, "fallbacks": 0}` counters incremented in stats().
- **compat/legacy**: `ClaudeEngine = ClaudeLikeEngine` alias; `MemoryError = MemoryBackendError` alias with DeprecationWarning on use; `create_engine(**kw)` factory.

## 6. Tests (tests/, pytest, NO network, NO real keys)
`FakeProvider(Provider)` scriptable (responses / raised exceptions / streamed chunks). Minimum coverage:
- fallback: primary raises RateLimitError x max_retries -> fallback returns content; `stats()["fallbacks"] == 1`.
- circuit: 5 failures in window -> OPEN -> immediate `CircuitBreakerOpenError`; advance fake clock -> half-open success -> CLOSED.
- retries: backoff delays called with exponential values (monkeypatch sleep).
- memory: add/get/clear/trim at max_messages.
- tools: register, schema shape, run_tool_loop success + ToolExecutionError path.
- structured: extract from fenced + raw JSON; bad JSON -> StructuredOutputError.
- streaming: assemble sync + async.
- settings: CLAUDE_ENGINE_MODEL env var respected.
- legacy: alias + deprecation warning.
All tests must PASS; package must import with `pip install` of ONLY pydantic + pydantic-settings + structlog + tenacity (no openai/anthropic/redis needed for tests).

## 7. Style
Python 3.10+ (`from __future__ import annotations` where needed), type hints throughout, docstrings on public API, no emoji, ASCII source. Commit per module-group branch; integration on `main`.
