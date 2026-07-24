"""
web_core.security.rate_limit - Token bucket rate limiting.
"""

from __future__ import annotations

import logging
from datetime import datetime

from web_core.db.connection import ConnectionPool
from web_core.interfaces import RateLimiter

logger = logging.getLogger("luqi.security.rate_limit")


class TokenBucketRateLimiter(RateLimiter):
    """Token bucket algorithm with per-key tracking in SQLite."""

    def __init__(self, pool: ConnectionPool, max_tokens: float = 60.0, refill_rate: float = 1.0):
        self.pool = pool
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate

    def check(self, key_hash: str) -> bool:
        row = self.pool.fetchone("SELECT * FROM rate_limits WHERE key_hash = ?", (key_hash,))
        now = datetime.utcnow()
        if row is None:
            self.pool.execute(
                "INSERT INTO rate_limits (key_hash, tokens, last_refill) VALUES (?, ?, ?)",
                (key_hash, self.max_tokens - 1, now.isoformat())
            )
            return True

        tokens = row["tokens"]
        last_refill = datetime.fromisoformat(row["last_refill"])
        elapsed = (now - last_refill).total_seconds()
        tokens = min(self.max_tokens, tokens + elapsed * self.refill_rate)

        if tokens < 1:
            self.pool.execute(
                "UPDATE rate_limits SET tokens = ?, last_refill = ? WHERE key_hash = ?",
                (tokens, now.isoformat(), key_hash)
            )
            return False

        tokens -= 1
        self.pool.execute(
            "UPDATE rate_limits SET tokens = ?, last_refill = ? WHERE key_hash = ?",
            (tokens, now.isoformat(), key_hash)
        )
        return True
