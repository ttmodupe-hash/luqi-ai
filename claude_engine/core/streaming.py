"""Streaming chunk types and stream assembly helpers (SPEC section 5).

Providers yield :class:`StreamChunk` objects; :func:`assemble` and
:func:`aassemble` reduce a (possibly async) stream of chunks into the
final concatenated text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterable, Iterable


@dataclass
class StreamChunk:
    """A single incremental piece of a streamed model response.

    Attributes:
        delta: The text fragment produced in this chunk (may be empty).
        finish_reason: Why generation stopped (e.g. ``"stop"``), set only
            on the terminal chunk, or ``None`` for intermediate chunks.
        usage: Optional token-usage accounting attached by the provider,
            typically only present on the final chunk.
    """

    delta: str
    finish_reason: str | None = None
    usage: dict | None = None


def assemble(chunks: Iterable[StreamChunk]) -> str:
    """Join the deltas of a synchronous chunk stream into one string.

    Args:
        chunks: An iterable of :class:`StreamChunk` objects. An empty
            iterable yields an empty string.

    Returns:
        The concatenation of every chunk's ``delta``, in order.
    """
    return "".join(chunk.delta for chunk in chunks)


async def aassemble(chunks: AsyncIterable[StreamChunk]) -> str:
    """Join the deltas of an asynchronous chunk stream into one string.

    Args:
        chunks: An async iterable of :class:`StreamChunk` objects. An
            empty stream yields an empty string.

    Returns:
        The concatenation of every chunk's ``delta``, in order.
    """
    parts: list[str] = []
    async for chunk in chunks:
        parts.append(chunk.delta)
    return "".join(parts)
