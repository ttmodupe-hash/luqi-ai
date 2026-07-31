"""Core subpackage: engine facade, providers, memory, tools, streaming."""

from __future__ import annotations

from .engine import METRICS, ChatResponse, ClaudeLikeEngine
from .memory import InMemoryMemory, Memory, RedisMemory
from .personality import (
    DEFAULT,
    ENGINEER,
    RESEARCHER,
    TUTOR,
    Personality,
    get_personality,
)
from .providers import (
    AnthropicProvider,
    CircuitBreaker,
    Message,
    OpenAIProvider,
    Provider,
    ProviderResponse,
)
from .streaming import StreamChunk, aassemble, assemble
from .structured_output import build_retry_prompt, extract
from .tools import Tool, ToolRegistry, run_tool_loop

__all__ = [
    "DEFAULT",
    "ENGINEER",
    "METRICS",
    "RESEARCHER",
    "TUTOR",
    "AnthropicProvider",
    "ChatResponse",
    "CircuitBreaker",
    "ClaudeLikeEngine",
    "InMemoryMemory",
    "Memory",
    "Message",
    "OpenAIProvider",
    "Personality",
    "Provider",
    "ProviderResponse",
    "RedisMemory",
    "StreamChunk",
    "Tool",
    "ToolRegistry",
    "aassemble",
    "assemble",
    "build_retry_prompt",
    "extract",
    "get_personality",
    "run_tool_loop",
]
