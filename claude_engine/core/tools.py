"""Tool definitions, registry, and tool-call loop helpers (SPEC section 5).

A :class:`Tool` wraps a callable handler with an OpenAI-compatible JSON
schema description. :class:`ToolRegistry` stores tools for an engine, and
:func:`run_tool_loop` drives multi-round tool calling against any
engine-like object exposing ``chat(messages, tools=...)``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Protocol, runtime_checkable

from claude_engine.utils.errors import ToolExecutionError


@dataclass
class Tool:
    """A callable tool that a model may invoke.

    Attributes:
        name: Unique tool name used by the model to request a call.
        description: Human/model-facing summary of what the tool does.
        parameters: JSON-schema dict describing the tool's arguments.
        handler: The callable executed when the model calls the tool.
            It receives the parsed argument dict as keyword arguments.
    """

    name: str
    description: str
    parameters: dict
    handler: Callable[..., Any]


@runtime_checkable
class _ChatResponseLike(Protocol):
    """Duck-typed shape returned by an engine's ``chat`` method."""

    content: str | None
    tool_calls: list | None


@runtime_checkable
class _EngineLike(Protocol):
    """Duck-typed engine interface required by :func:`run_tool_loop`."""

    def chat(self, messages: list[dict], **kwargs: Any) -> Any:
        """Send messages (and optionally tools) and return a response."""
        ...


class ToolRegistry:
    """In-memory registry of :class:`Tool` instances keyed by name."""

    def __init__(self, tools: Iterable[Tool] | None = None) -> None:
        """Initialise the registry, optionally pre-registering tools.

        Args:
            tools: Optional iterable of tools to register immediately.
        """
        self._tools: dict[str, Tool] = {}
        for tool in tools or ():
            self.register(tool)

    def register(self, tool: Tool) -> Tool:
        """Register a tool, replacing any existing tool with the same name.

        Args:
            tool: The tool to register.

        Returns:
            The registered tool (for fluent use).
        """
        self._tools[tool.name] = tool
        return tool

    def get(self, name: str) -> Tool | None:
        """Look up a tool by name.

        Args:
            name: The tool name to look up.

        Returns:
            The matching :class:`Tool`, or ``None`` if not registered.
        """
        return self._tools.get(name)

    def list(self) -> list[Tool]:
        """Return all registered tools in registration order."""
        return list(self._tools.values())

    def as_openai_schema(self) -> list[dict]:
        """Render all tools in OpenAI function-calling schema format.

        Returns:
            A list of ``{"type": "function", "function": {...}}`` dicts
            suitable for passing as the ``tools`` request parameter.
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in self.list()
        ]

    def __len__(self) -> int:
        """Return the number of registered tools."""
        return len(self._tools)


def _normalise_tool_call(call: Any) -> tuple[str, dict, Any]:
    """Extract (name, arguments, raw call id) from a tool-call object.

    Supports both OpenAI-style objects/dicts with a nested ``function``
    payload and flat objects/dicts with ``name``/``arguments`` keys.
    """
    if isinstance(call, dict):
        call_id = call.get("id")
        payload = call.get("function", call)
        name = payload.get("name", "")
        raw_args = payload.get("arguments", {})
    else:
        call_id = getattr(call, "id", None)
        payload = getattr(call, "function", call)
        name = getattr(payload, "name", "")
        raw_args = getattr(payload, "arguments", {})

    if isinstance(raw_args, str):
        try:
            arguments = json.loads(raw_args) if raw_args.strip() else {}
        except json.JSONDecodeError:
            arguments = {}
    elif isinstance(raw_args, dict):
        arguments = raw_args
    else:
        arguments = {}
    return name, arguments, call_id


def run_tool_loop(
    engine: Any,
    messages: list[dict],
    max_rounds: int = 5,
) -> Any:
    """Drive tool-call rounds against an engine-like object.

    Repeatedly calls ``engine.chat(messages, tools=...)`` while the
    response carries ``tool_calls``. Each requested tool is executed and
    its result appended to ``messages`` as a ``role="tool"`` entry, then
    the engine is called again. Returns the final response once no more
    tool calls are requested or ``max_rounds`` is exhausted.

    Args:
        engine: Duck-typed engine with a ``chat(messages, tools=...)``
            method returning an object with ``.content`` and an optional
            ``.tool_calls`` list. May also expose a ``tool_registry``
            attribute; otherwise tools are resolved from the engine's
            ``tools`` attribute when present.
        messages: Conversation messages; mutated in place by appending
            assistant tool-call requests and tool results.
        max_rounds: Maximum number of tool-execution rounds before the
            last response is returned as-is.

    Returns:
        The final engine response (an object with ``.content``).

    Raises:
        ToolExecutionError: If a requested tool is unknown or its handler
            raises; the original exception is available as ``__cause__``.
    """
    registry = getattr(engine, "tool_registry", None)
    if registry is None:
        registry = ToolRegistry(getattr(engine, "tools", None) or [])

    working = messages
    response: Any = None
    for _ in range(max_rounds):
        response = engine.chat(working, tools=registry.as_openai_schema())
        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            return response

        working.append(
            {
                "role": "assistant",
                "content": getattr(response, "content", None),
                "tool_calls": [
                    call if isinstance(call, dict) else repr(call)
                    for call in tool_calls
                ],
            }
        )

        for call in tool_calls:
            name, arguments, call_id = _normalise_tool_call(call)
            tool = registry.get(name)
            if tool is None:
                raise ToolExecutionError(
                    f"Unknown tool requested by the model: {name!r}.",
                    tool=name,
                )
            try:
                result = tool.handler(**arguments)
            except Exception as exc:
                raise ToolExecutionError(
                    f"Tool {name!r} raised {type(exc).__name__}: {exc}",
                    tool=name,
                ) from exc
            working.append(
                {
                    "role": "tool",
                    "name": name,
                    "tool_call_id": call_id,
                    "content": result if isinstance(result, str) else json.dumps(result),
                }
            )
    return response
