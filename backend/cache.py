"""Cache layer for LUQI AI - Redis fallback to in-memory LRU"""
import os
import json
import time
import hashlib
from typing import Any, Optional
from functools import wraps

# Try Redis, fall back to in-memory dict
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class LRUCache:
    """Simple in-memory LRU cache with TTL support."""

    def __init__(self, maxsize: int = 1000):
        self.maxsize = maxsize
        self._data: dict = {}
        self._access_order: list = []
        self._lock = None  # async lock initialized on demand

    async def _get_lock(self):
        if self._lock is None:
            import asyncio
            self._lock = asyncio.Lock()
        return self._lock

    def _touch(self, key: str):
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)

    def _evict(self):
        while len(self._data) > self.maxsize and self._access_order:
            oldest = self._access_order.pop(0)
            self._data.pop(oldest, None)

    async def get(self, key: str) -> Optional[Any]:
        import asyncio
        async with await self._get_lock():
            item = self._data.get(key)
            if item is None:
                return None
            if item["expires"] and time.time() > item["expires"]:
                self._data.pop(key, None)
                if key in self._access_order:
                    self._access_order.remove(key)
                return None
            self._touch(key)
            return item["value"]

    async def set(self, key: str, value: Any, ttl: int = 300):
        import asyncio
        async with await self._get_lock():
            self._evict()
            self._data[key] = {
                "value": value,
                "expires": time.time() + ttl if ttl else None,
            }
            self._touch(key)

    async def delete(self, key: str):
        import asyncio
        async with await self._get_lock():
            self._data.pop(key, None)
            if key in self._access_order:
                self._access_order.remove(key)

    async def clear(self):
        import asyncio
        async with await self._get_lock():
            self._data.clear()
            self._access_order.clear()


class CacheManager:
    """Unified cache manager with Redis primary and in-memory fallback."""

    def __init__(self):
        self.redis: Optional[Any] = None
        self.lru = LRUCache(maxsize=1000)
        self._redis_url = os.environ.get("REDIS_URL")
        self._enabled = os.environ.get("CACHE_ENABLED", "true").lower() == "true"

    async def connect(self):
        if REDIS_AVAILABLE and self._redis_url and not self.redis:
            try:
                self.redis = await aioredis.from_url(self._redis_url, decode_responses=True)
                await self.redis.ping()
            except Exception:
                self.redis = None

    async def get(self, key: str) -> Optional[Any]:
        if not self._enabled:
            return None
        await self.connect()
        if self.redis:
            try:
                val = await self.redis.get(key)
                if val:
                    return json.loads(val)
            except Exception:
                pass
        return await self.lru.get(key)

    async def set(self, key: str, value: Any, ttl: int = 300):
        if not self._enabled:
            return
        await self.connect()
        if self.redis:
            try:
                await self.redis.set(key, json.dumps(value), ex=ttl)
                return
            except Exception:
                pass
        await self.lru.set(key, value, ttl)

    async def delete(self, key: str):
        await self.connect()
        if self.redis:
            try:
                await self.redis.delete(key)
            except Exception:
                pass
        await self.lru.delete(key)

    async def clear(self):
        await self.connect()
        if self.redis:
            try:
                await self.redis.flushdb()
            except Exception:
                pass
        await self.lru.clear()


# Global cache instance
cache = CacheManager()


def cached(ttl: int = 300, key_prefix: str = ""):
    """Decorator to cache function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name + args hash
            key_parts = [key_prefix or func.__name__]
            if args:
                key_parts.append(str(args))
            if kwargs:
                key_parts.append(str(sorted(kwargs.items())))
            key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
            key = f"luqi:cache:{key}"

            cached_val = await cache.get(key)
            if cached_val is not None:
                return cached_val

            result = await func(*args, **kwargs)
            await cache.set(key, result, ttl)
            return result
        return wrapper
    return decorator


def cache_key(*parts) -> str:
    """Generate a cache key from parts."""
    raw = "|".join(str(p) for p in parts)
    return f"luqi:{hashlib.md5(raw.encode()).hexdigest()}"
