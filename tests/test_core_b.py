"""Tests for mod-core-b: streaming, tools, structured output (SPEC 5/6)."""

from __future__ import annotations

import asyncio

import pytest
from pydantic import BaseModel

from claude_engine.core.streaming import StreamChunk, aassemble, assemble
from claude_engine.core.structured_output import build_retry_prompt, extract
from claude_engine.core.tools import Tool, ToolRegistry, run_tool_loop
from claude_engine.utils.errors import StructuredOutputError, ToolExecutionError


# ---------------------------------------------------------------------------
# streaming
# ---------------------------------------------------------------------------


class TestStreamChunk:
    def test_defaults(self) -> None:
        chunk = StreamChunk(delta="hello")
        assert chunk.delta == "hello"
        assert chunk.finish_reason is None
        assert chunk.usage is None

    def test_full_fields(self) -> None:
        chunk = StreamChunk(delta="", finish_reason="stop", usage={"total": 3})
        assert chunk.finish_reason == "stop"
        assert chunk.usage == {"total": 3}


class TestAssemble:
    def test_sync_assembly(self) -> None:
        chunks = [StreamChunk("a"), StreamChunk("b"), StreamChunk("c", "stop")]
        assert assemble(chunks) == "abc"

    def test_sync_empty_stream(self) -> None:
        assert assemble([]) == ""

    def test_async_assembly(self) -> None:
        async def gen():
            for piece in ("x", "y", "z"):
                yield StreamChunk(piece)

        assert asyncio.run(aassemble(gen())) == "xyz"

    def test_async_empty_stream(self) -> None:
        async def gen():
            return
            yield  # pragma: no cover - makes this an async generator

        assert asyncio.run(aassemble(gen())) == ""


# ---------------------------------------------------------------------------
# tools
# ---------------------------------------------------------------------------


def _add(a: int, b: int) -> int:
    return a + b


def _boom() -> None:
    raise ValueError("kaboom")


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


class TestToolAndRegistry:
    def test_tool_dataclass(self) -> None:
        tool = _make_add_tool()
        assert tool.name == "add"
        assert tool.description == "Add two integers."
        assert tool.parameters["type"] == "object"
        assert tool.handler is _add

    def test_register_get_list(self) -> None:
        registry = ToolRegistry()
        tool = _make_add_tool()
        registry.register(tool)
        assert registry.get("add") is tool
        assert registry.get("missing") is None
        assert registry.list() == [tool]

    def test_as_openai_schema_shape(self) -> None:
        registry = ToolRegistry([_make_add_tool()])
        schema = registry.as_openai_schema()
        assert len(schema) == 1
        entry = schema[0]
        assert entry["type"] == "function"
        assert entry["function"]["name"] == "add"
        assert entry["function"]["description"] == "Add two integers."
        assert entry["function"]["parameters"]["required"] == ["a", "b"]


class _StubResponse:
    """Duck-typed engine chat response."""

    def __init__(self, content: str | None, tool_calls: list | None = None) -> None:
        self.content = content
        self.tool_calls = tool_calls


class _StubEngine:
    """Scriptable engine double exposing chat(messages, tools=...)."""

    def __init__(self, responses: list[_StubResponse], tools: list[Tool]) -> None:
        self._responses = list(responses)
        self.tools = tools
        self.calls: list[list[dict]] = []

    def chat(self, messages: list[dict], tools: list | None = None) -> _StubResponse:
        self.calls.append([dict(m) for m in messages])
        return self._responses.pop(0)


class TestRunToolLoop:
    def test_success_path(self) -> None:
        tool_call = {
            "id": "call_1",
            "type": "function",
            "function": {"name": "add", "arguments": '{"a": 2, "b": 3}'},
        }
        engine = _StubEngine(
            [
                _StubResponse(None, [tool_call]),
                _StubResponse("The sum is 5."),
            ],
            tools=[_make_add_tool()],
        )
        messages = [{"role": "user", "content": "add 2 and 3"}]
        response = run_tool_loop(engine, messages)

        assert response.content == "The sum is 5."
        assert len(engine.calls) == 2
        tool_messages = [m for m in messages if m["role"] == "tool"]
        assert len(tool_messages) == 1
        assert tool_messages[0]["name"] == "add"
        assert tool_messages[0]["content"] == "5"

    def test_no_tool_calls_returns_first_response(self) -> None:
        engine = _StubEngine([_StubResponse("plain answer")], tools=[])
        response = run_tool_loop(engine, [{"role": "user", "content": "hi"}])
        assert response.content == "plain answer"
        assert len(engine.calls) == 1

    def test_handler_failure_wrapped(self) -> None:
        bad_tool = Tool(
            name="boom",
            description="Always fails.",
            parameters={"type": "object", "properties": {}},
            handler=_boom,
        )
        tool_call = {"id": "c1", "function": {"name": "boom", "arguments": "{}"}}
        engine = _StubEngine([_StubResponse(None, [tool_call])], tools=[bad_tool])

        with pytest.raises(ToolExecutionError) as exc_info:
            run_tool_loop(engine, [{"role": "user", "content": "go"}])
        assert isinstance(exc_info.value.__cause__, ValueError)
        assert "kaboom" in str(exc_info.value)

    def test_unknown_tool_raises(self) -> None:
        tool_call = {"id": "c1", "function": {"name": "nope", "arguments": "{}"}}
        engine = _StubEngine([_StubResponse(None, [tool_call])], tools=[])
        with pytest.raises(ToolExecutionError):
            run_tool_loop(engine, [{"role": "user", "content": "go"}])


# ---------------------------------------------------------------------------
# structured_output
# ---------------------------------------------------------------------------


class Person(BaseModel):
    """Simple extraction target."""

    name: str
    age: int


class TestExtract:
    def test_raw_json(self) -> None:
        result = extract('{"name": "Ada", "age": 36}', Person)
        assert result == Person(name="Ada", age=36)

    def test_fenced_json(self) -> None:
        text = 'Here you go:\n```json\n{"name": "Bob", "age": 41}\n```\nDone.'
        assert extract(text, Person) == Person(name="Bob", age=41)

    def test_json_embedded_in_prose(self) -> None:
        text = 'The answer is {"name": "Cleo", "age": 28} as requested.'
        assert extract(text, Person) == Person(name="Cleo", age=28)

    def test_bad_json_raises(self) -> None:
        with pytest.raises(StructuredOutputError):
            extract("totally not json at all", Person)

    def test_schema_violation_raises(self) -> None:
        with pytest.raises(StructuredOutputError):
            extract('{"name": "Ada"}', Person)

    def test_retry_callback_recovers(self) -> None:
        def fake_model(prompt: str) -> str:
            assert "name" in prompt and "age" in prompt
            return '{"name": "Dan", "age": 50}'

        result = extract("garbage", Person, retry=fake_model)
        assert result == Person(name="Dan", age=50)

    def test_retry_failure_raises(self) -> None:
        with pytest.raises(StructuredOutputError):
            extract("garbage", Person, retry=lambda prompt: "still garbage")


class TestBuildRetryPrompt:
    def test_prompt_contains_schema_fields(self) -> None:
        prompt = build_retry_prompt("bad", Person, ValueError("nope"))
        assert "name" in prompt
        assert "age" in prompt
        assert "Person" in prompt
        assert "nope" in prompt
        assert "bad" in prompt
