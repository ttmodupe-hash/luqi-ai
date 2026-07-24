"""
web_core.security.audit - Request logging to SQLite.
"""

from __future__ import annotations

import logging
from typing import List

from web_core.db.connection import ConnectionPool
from web_core.interfaces import AuditLogger

logger = logging.getLogger("luqi.security.audit")


class SqliteAuditLogger(AuditLogger):
    """Logs every HTTP request for monitoring and debugging."""

    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def log(self, key_hash: str, method: str, path: str, status_code: int, latency_ms: float) -> None:
        try:
            self.pool.execute(
                "INSERT INTO request_logs (key_hash, method, path, status_code, latency_ms) VALUES (?, ?, ?, ?, ?)",
                (key_hash, method, path, status_code, latency_ms)
            )
        except Exception as e:
            logger.error("Audit log failed: %s", e)

    def get_recent(self, limit: int = 100) -> List[dict]:
        rows = self.pool.fetchall(
            "SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in rows]
