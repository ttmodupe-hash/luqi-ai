"""claude_engine -- provider-agnostic AI engine library.

Public API: the :class:`ClaudeLikeEngine` facade, the full exception
hierarchy, :class:`Tool`, :class:`StreamChunk`, personality presets and
provider/memory building blocks. Importing this package requires only
pydantic, pydantic-settings, structlog and tenacity; the openai, anthropic
and redis SDKs are imported lazily by the components that need them.
"""

from __future__ import annotations

from .config.settings import ENV_PREFIX, EngineSettings
from .core.engine import METRICS, ChatResponse, ClaudeLikeEngine
from .core.memory import InMemoryMemory, Memory, RedisMemory
from .core.personality import (
    DEFAULT,
    ENGINEER,
    RESEARCHER,
    TUTOR,
    Personality,
    get_personality,
)
from .core.providers import (
    AnthropicProvider,
    CircuitBreaker,
    OpenAIProvider,
    Provider,
    ProviderResponse,
)
from .core.streaming import StreamChunk, aassemble, assemble
from .core.structured_output import build_retry_prompt, extract
from .core.tools import Tool, ToolRegistry, run_tool_loop
from .utils.errors import (
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

__version__ = "1.0.0"

__all__ = [
    "DEFAULT",
    "ENGINEER",
    "ENV_PREFIX",
    "METRICS",
    "RESEARCHER",
    "TUTOR",
    "AnthropicProvider",
    "AuthenticationError",
    "ChatResponse",
    "CircuitBreaker",
    "CircuitBreakerOpenError",
    "ClaudeEngineError",
    "ClaudeLikeEngine",
    "EngineSettings",
    "InMemoryMemory",
    "Memory",
    "MemoryBackendError",
    "ModelNotFoundError",
    "OpenAIProvider",
    "Personality",
    "Provider",
    "ProviderError",
    "ProviderResponse",
    "RateLimitError",
    "RedisMemory",
    "StreamChunk",
    "StreamingError",
    "StructuredOutputError",
    "Tool",
    "ToolExecutionError",
    "ToolRegistry",
    "__version__",
    "aassemble",
    "assemble",
    "build_retry_prompt",
    "extract",
    "get_personality",
    "run_tool_loop",
]
