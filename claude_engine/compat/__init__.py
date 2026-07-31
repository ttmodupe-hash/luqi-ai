"""Compatibility subpackage: legacy aliases and factories."""

from __future__ import annotations

from typing import Any

from ..core.engine import ClaudeLikeEngine
from ..utils.errors import MemoryBackendError
from .legacy import ClaudeEngine, create_engine

__all__ = [
    "ClaudeEngine",
    "ClaudeLikeEngine",
    "MemoryBackendError",
    "MemoryError",
    "create_engine",
]


def __getattr__(name: str) -> Any:
    """Expose the deprecated ``MemoryError`` alias (with warning) here too."""
    if name == "MemoryError":
        from . import legacy

        return legacy.MemoryError  # noqa: F821 - triggers legacy's warning
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
