"""Conversation memory backends (SPEC section 5).

* :class:`Memory` -- structural protocol: ``add`` / ``get`` / ``clear`` /
  ``__len__``.
* :class:`InMemoryMemory` -- process-local store capped at ``max_messages``
  (oldest messages are trimmed first).
* :class:`RedisMemory` -- Redis-backed store. The ``redis`` package is
  imported lazily, so importing this module never requires redis to be
  installed; instantiating and *using* :class:`RedisMemory` without the
  package raises :class:`MemoryBackendError` with an install hint.
"""

from __future__ import annotations

import json
from collections import deque
from typing import Any, Protocol, runtime_checkable

from ..utils.errors import MemoryBackendError

_REDIS_HINT = (
    "The 'redis' package is required for RedisMemory. "
    "Install it with: pip install redis"
)


@runtime_checkable
class Memory(Protocol):
    """Structural protocol for conversation memory backends."""

    def add(self, role: str, content: str) -> None:
        """Append a message with ``role`` (e.g. ``"user"``) and ``content``."""
        ...

    def get(self) -> list[dict[str, str]]:
        """Return all stored messages, oldest first, as ``{"role", "content"}`` dicts."""
        ...

    def clear(self) -> None:
        """Drop all stored messages."""
        ...

    def __len__(self) -> int:
        """Return the number of stored messages."""
        ...


class InMemoryMemory:
    """Process-local memory with a fixed maximum size.

    When the store is full, appending a new message silently trims the
    oldest one (FIFO), so ``len(memory)`` never exceeds ``max_messages``.
    """

    def __init__(self, max_messages: int = 200) -> None:
        """Initialise an empty store.

        Args:
            max_messages: Maximum retained messages; oldest are trimmed
                first. Must be >= 1.
        """
        if max_messages < 1:
            raise ValueError("max_messages must be >= 1")
        self.max_messages = max_messages
        self._messages: deque[dict[str, str]] = deque(maxlen=max_messages)

    def add(self, role: str, content: str) -> None:
        """Append a message, trimming the oldest if at capacity."""
        self._messages.append({"role": role, "content": content})

    def get(self) -> list[dict[str, str]]:
        """Return copies of all stored messages, oldest first."""
        return [dict(message) for message in self._messages]

    def clear(self) -> None:
        """Remove all stored messages."""
        self._messages.clear()

    def __len__(self) -> int:
        """Return the number of stored messages."""
        return len(self._messages)


class RedisMemory:
    """Redis-backed conversation memory.

    Messages are stored as JSON entries in a Redis list at
    ``f"{key_prefix}messages"`` with a ``ttl``-second expiry that is
    refreshed on every write.
    """

    def __init__(
        self,
        url: str,
        key_prefix: str = "claude_engine:",
        ttl: int = 86400,
        max_messages: int = 200,
    ) -> None:
        """Initialise the backend (no connection is opened yet).

        Args:
            url: Redis connection URL, e.g. ``"redis://localhost:6379/0"``.
            key_prefix: Prefix for all keys written by this instance.
            ttl: Expiry in seconds applied to the message list on each write.
            max_messages: Maximum retained messages; oldest are trimmed
                first, mirroring :class:`InMemoryMemory`.
        """
        if max_messages < 1:
            raise ValueError("max_messages must be >= 1")
        self.url = url
        self.key_prefix = key_prefix
        self.ttl = ttl
        self.max_messages = max_messages
        self._client: Any = None

    @property
    def _key(self) -> str:
        return f"{self.key_prefix}messages"

    def _get_client(self) -> Any:
        """Return a connected redis client, importing the SDK lazily."""
        if self._client is None:
            try:
                import redis
            except ImportError as exc:
                raise MemoryBackendError(_REDIS_HINT) from exc
            try:
                self._client = redis.Redis.from_url(self.url, decode_responses=True)
            except Exception as exc:
                raise MemoryBackendError(
                    f"Could not create a Redis client for {self.url!r}: {exc}"
                ) from exc
        return self._client

    def add(self, role: str, content: str) -> None:
        """Append a message, trim to ``max_messages``, and refresh the TTL."""
        client = self._get_client()
        payload = json.dumps({"role": role, "content": content})
        try:
            client.rpush(self._key, payload)
            client.ltrim(self._key, -self.max_messages, -1)
            client.expire(self._key, self.ttl)
        except Exception as exc:
            raise MemoryBackendError(f"RedisMemory.add failed: {exc}") from exc

    def get(self) -> list[dict[str, str]]:
        """Return all stored messages, oldest first."""
        client = self._get_client()
        try:
            raw_items = client.lrange(self._key, 0, -1)
        except Exception as exc:
            raise MemoryBackendError(f"RedisMemory.get failed: {exc}") from exc
        messages: list[dict[str, str]] = []
        for item in raw_items:
            if isinstance(item, bytes):
                item = item.decode("utf-8")
            try:
                messages.append(json.loads(item))
            except (ValueError, TypeError) as exc:
                raise MemoryBackendError(
                    f"RedisMemory found an unreadable message payload: {exc}"
                ) from exc
        return messages

    def clear(self) -> None:
        """Delete the message list from Redis."""
        client = self._get_client()
        try:
            client.delete(self._key)
        except Exception as exc:
            raise MemoryBackendError(f"RedisMemory.clear failed: {exc}") from exc

    def __len__(self) -> int:
        """Return the number of stored messages."""
        client = self._get_client()
        try:
            return int(client.llen(self._key))
        except Exception as exc:
            raise MemoryBackendError(f"RedisMemory.__len__ failed: {exc}") from exc
