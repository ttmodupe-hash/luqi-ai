"""Omega AI v3 — Rate Limiter
Token-bucket rate limiter with per-module, per-user buckets.
"""
from __future__ import annotations

import time
from threading import Lock
from typing import Callable


class TokenBucket:
    """Thread-safe token bucket for rate limiting."""

    def __init__(self, rate: float, capacity: float) -> None:
        self.rate = rate          # tokens per second
        self.capacity = capacity  # max burst
        self.tokens = capacity
        self.last_update = time.monotonic()
        self.lock = Lock()

    def consume(self, tokens: float = 1.0) -> bool:
        """Try to consume tokens. Returns True if allowed."""
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_update = now
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def wait_time(self, tokens: float = 1.0) -> float:
        """Seconds to wait before tokens are available."""
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            available = min(self.capacity, self.tokens + elapsed * self.rate)
            if available >= tokens:
                return 0.0
            return (tokens - available) / self.rate


class RateLimiter:
    """Multi-bucket rate limiter for Omega AI modules."""

    def __init__(self, default_rate: float = 10.0, default_capacity: float = 20.0) -> None:
        self.default_rate = default_rate
        self.default_capacity = default_capacity
        self.buckets: dict[str, TokenBucket] = {}
        self.lock = Lock()

    def _get_bucket(self, key: str) -> TokenBucket:
        with self.lock:
            if key not in self.buckets:
                self.buckets[key] = TokenBucket(self.default_rate, self.default_capacity)
            return self.buckets[key]

    def allow(self, module: str, user: str = "default", tokens: float = 1.0) -> bool:
        """Check if a request is allowed."""
        key = f"{module}:{user}"
        return self._get_bucket(key).consume(tokens)

    def wait_time(self, module: str, user: str = "default", tokens: float = 1.0) -> float:
        """Get wait time for a module:user pair."""
        key = f"{module}:{user}"
        return self._get_bucket(key).wait_time(tokens)

    def set_limit(self, module: str, rate: float, capacity: float) -> None:
        """Set custom rate limit for a module."""
        with self.lock:
            self.buckets[module] = TokenBucket(rate, capacity)

    def status(self) -> dict[str, dict[str, float]]:
        """Current status of all buckets."""
        with self.lock:
            return {
                key: {"tokens": b.tokens, "rate": b.rate, "capacity": b.capacity}
                for key, b in self.buckets.items()
            }


def rate_limited(limiter: RateLimiter, module: str, user: str = "default"):
    """Decorator to rate-limit a function."""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            if not limiter.allow(module, user):
                wait = limiter.wait_time(module, user)
                raise RuntimeError(f"Rate limited. Retry in {wait:.1f}s")
            return func(*args, **kwargs)
        return wrapper
    return decorator
