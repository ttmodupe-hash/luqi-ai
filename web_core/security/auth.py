"""
web_core.security.auth - API key authentication and admin checks.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from typing import Any, Dict, List, Optional

from web_core.db.connection import ConnectionPool
from web_core.interfaces import Authenticator

logger = logging.getLogger("luqi.security.auth")


class AuthManager(Authenticator):
    """SHA-256 based API key management with admin support."""

    def __init__(self, pool: ConnectionPool, admin_key: str = ""):
        self.pool = pool
        self._admin_key = admin_key

    def _hash(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    def create_key(self, name: str = "default", is_admin: bool = False) -> str:
        raw = "sk-luqi-" + secrets.token_urlsafe(32)
        key_hash = self._hash(raw)
        self.pool.execute(
            "INSERT OR REPLACE INTO api_keys (key_hash, name, is_admin) VALUES (?, ?, ?)",
            (key_hash, name, 1 if is_admin else 0)
        )
        logger.info("Created API key: %s (admin=%s)", name, is_admin)
        return raw

    def validate(self, key: str) -> Optional[Dict[str, Any]]:
        """Return key info or None if invalid."""
        if self._admin_key and key == self._admin_key:
            return {"name": "admin_env", "is_admin": True, "hash": "admin"}
        key_hash = self._hash(key)
        row = self.pool.fetchone("SELECT * FROM api_keys WHERE key_hash = ?", (key_hash,))
        if row:
            self.pool.execute(
                "UPDATE api_keys SET last_used = datetime('now'), request_count = request_count + 1 WHERE key_hash = ?",
                (key_hash,)
            )
            # Re-fetch to get updated count
            updated = self.pool.fetchone("SELECT * FROM api_keys WHERE key_hash = ?", (key_hash,))
            return {"name": updated["name"], "is_admin": bool(updated["is_admin"]), "hash": key_hash, "request_count": updated["request_count"]}
        return None

    def is_admin(self, key: str) -> bool:
        if self._admin_key and key == self._admin_key:
            return True
        info = self.validate(key)
        return info["is_admin"] if info else False

    def list_keys(self) -> List[Dict[str, Any]]:
        rows = self.pool.fetchall(
            "SELECT key_hash, name, created_at, last_used, request_count, is_admin "
            "FROM api_keys ORDER BY created_at DESC"
        )
        return [
            {
                "key_hash": r["key_hash"][:16] + "...",
                "name": r["name"],
                "created_at": r["created_at"],
                "last_used": r["last_used"],
                "requests": r["request_count"],
                "is_admin": bool(r["is_admin"]),
            }
            for r in rows
        ]
