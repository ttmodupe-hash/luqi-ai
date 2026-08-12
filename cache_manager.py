"""Cache Manager — Multi-tier caching with Redis and in-memory fallback."""

import json
import time
from typing import Any, Optional


class CacheManager:
    """Simple in-memory cache with TTL support."""

    def __init__(self):
        self._store: dict = {}
        self._ttl: dict = {}
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            if self._ttl.get(key, 0) > time.time() or key not in self._ttl:
                self.hits += 1
                return self._store[key]
            else:
                del self._store[key]
                del self._ttl[key]
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int = 300):
        self._store[key] = value
        if ttl > 0:
            self._ttl[key] = time.time() + ttl

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            self._ttl.pop(key, None)
            return True
        return False

    def clear(self):
        self._store.clear()
        self._ttl.clear()

    def stats(self) -> dict:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self._store),
            "hit_rate": self.hits / (self.hits + self.misses) if (self.hits + self.misses) > 0 else 0,
        }

    def keys(self) -> list:
        return list(self._store.keys())


if __name__ == "__main__":
    cache = CacheManager()
    cache.set("test", {"data": "value"}, ttl=60)
    print(cache.get("test"))
    print(cache.stats())
