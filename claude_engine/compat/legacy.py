"""Backward-compatible shims for pre-1.0 import paths (SPEC section 5).

* ``ClaudeEngine`` -- alias for :class:`ClaudeLikeEngine`.
* ``MemoryError`` -- deprecated alias for :class:`MemoryBackendError`. The
  legacy name shadowed the Python builtin, so it was renamed; accessing it
  through this module emits a :class:`DeprecationWarning` (PEP 562 module
  ``__getattr__``).
* ``create_engine(**kwargs)`` -- factory mirroring the legacy constructor.
"""

from __future__ import annotations

import warnings
from typing import Any

from ..core.engine import ClaudeLikeEngine
from ..utils.errors import MemoryBackendError

#: Direct alias: the legacy engine class is the modern engine.
ClaudeEngine = ClaudeLikeEngine

__all__ = [
    "ClaudeEngine",
    "ClaudeLikeEngine",
    "MemoryBackendError",
    "MemoryError",
    "create_engine",
]


def create_engine(**kwargs: Any) -> ClaudeLikeEngine:
    """Create a :class:`ClaudeLikeEngine` (legacy factory).

    Args:
        **kwargs: Forwarded verbatim to
            :meth:`ClaudeLikeEngine.__init__`.

    Returns:
        A configured engine instance.
    """
    return ClaudeLikeEngine(**kwargs)


def __getattr__(name: str) -> Any:
    """Resolve the deprecated ``MemoryError`` alias lazily, with a warning."""
    if name == "MemoryError":
        warnings.warn(
            "claude_engine.compat.legacy.MemoryError is deprecated; it was "
            "renamed to MemoryBackendError to avoid shadowing the Python "
            "builtin. Import MemoryBackendError from claude_engine instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return MemoryBackendError
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
