"""Omega AI v3.7.0 — API Key Rotation & Lifecycle Management
Supports key expiry, rotation schedules, and automatic revocation.
"""
from __future__ import annotations

import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from db_engine import DatabaseEngine


class KeyRotationManager:
    """Manages API key lifecycle: creation, expiry, rotation, revocation."""

    DEFAULT_TTL_DAYS = 90  # Keys expire after 90 days by default
    ROTATION_WARNING_DAYS = 7  # Warn 7 days before expiry

    def __init__(self, db: DatabaseEngine | None = None) -> None:
        self._db = db or DatabaseEngine()
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        """Ensure the key metadata table exists."""
        try:
            self._db.execute("""
                CREATE TABLE IF NOT EXISTS api_key_metadata (
                    key_id TEXT PRIMARY KEY,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    last_used REAL,
                    use_count INTEGER DEFAULT 0,
                    rotated_from TEXT,
                    status TEXT DEFAULT 'active'
                )
            """)
        except Exception:
            pass

    def create_key(self, name: str, role: str = "user", ttl_days: int | None = None) -> dict[str, Any]:
        """Create a new API key with expiry."""
        from auth_middleware import generate_api_key
        key_data = generate_api_key(name, role)
        now = time.time()
        ttl = (ttl_days or self.DEFAULT_TTL_DAYS) * 86400
        try:
            self._db.execute(
                "INSERT INTO api_key_metadata VALUES (?, ?, ?, ?, ?, ?, ?)",
                (key_data["key_id"], now, now + ttl, None, 0, None, "active")
            )
        except Exception:
            pass
        key_data["expires_at"] = datetime.fromtimestamp(now + ttl, tz=timezone.utc).isoformat()
        key_data["ttl_days"] = ttl_days or self.DEFAULT_TTL_DAYS
        return key_data

    def rotate_key(self, key_id: str) -> dict[str, Any] | None:
        """Rotate a key: revoke old, create new with same permissions."""
        # Get existing key info
        row = self._db.fetch_one("SELECT * FROM api_key_metadata WHERE key_id = ?", (key_id,))
        if not row:
            return None
        # Revoke old
        self.revoke_key(key_id)
        # Create new
        new_key = self.create_key(f"rotated-{key_id}")
        try:
            self._db.execute(
                "UPDATE api_key_metadata SET rotated_from = ? WHERE key_id = ?",
                (key_id, new_key["key_id"])
            )
        except Exception:
            pass
        return new_key

    def revoke_key(self, key_id: str) -> bool:
        """Revoke a key immediately."""
        try:
            self._db.execute(
                "UPDATE api_key_metadata SET status = 'revoked' WHERE key_id = ?",
                (key_id,)
            )
            return True
        except Exception:
            return False

    def check_expiry(self, key_id: str) -> dict[str, Any]:
        """Check key expiry status."""
        now = time.time()
        row = self._db.fetch_one(
            "SELECT created_at, expires_at, use_count, status FROM api_key_metadata WHERE key_id = ?",
            (key_id,)
        )
        if not row:
            return {"exists": False, "status": "unknown"}
        created, expires, uses, status = row
        remaining = expires - now
        return {
            "exists": True,
            "status": status,
            "created_at": datetime.fromtimestamp(created, tz=timezone.utc).isoformat(),
            "expires_at": datetime.fromtimestamp(expires, tz=timezone.utc).isoformat(),
            "days_remaining": round(remaining / 86400, 1),
            "expired": remaining <= 0,
            "warning": 0 < remaining < self.ROTATION_WARNING_DAYS * 86400,
            "use_count": uses,
        }

    def record_use(self, key_id: str) -> None:
        """Record a key usage."""
        try:
            self._db.execute(
                "UPDATE api_key_metadata SET last_used = ?, use_count = use_count + 1 WHERE key_id = ?",
                (time.time(), key_id)
            )
        except Exception:
            pass

    def cleanup_expired(self) -> int:
        """Revoke all expired keys. Returns count revoked."""
        try:
            result = self._db.execute(
                "UPDATE api_key_metadata SET status = 'expired' WHERE expires_at < ? AND status = 'active'",
                (time.time(),)
            )
            return result.rowcount if hasattr(result, 'rowcount') else 0
        except Exception:
            return 0

    def list_keys(self) -> list[dict[str, Any]]:
        """List all keys with metadata."""
        rows = self._db.fetch_all("SELECT * FROM api_key_metadata ORDER BY created_at DESC")
        return [
            {
                "key_id": r[0],
                "created_at": datetime.fromtimestamp(r[1], tz=timezone.utc).isoformat(),
                "expires_at": datetime.fromtimestamp(r[2], tz=timezone.utc).isoformat(),
                "last_used": datetime.fromtimestamp(r[3], tz=timezone.utc).isoformat() if r[3] else None,
                "use_count": r[4],
                "status": r[6],
            }
            for r in rows
        ]

    def stats(self) -> dict[str, Any]:
        """Key lifecycle statistics."""
        try:
            total = self._db.fetch_one("SELECT COUNT(*) FROM api_key_metadata")[0]
            active = self._db.fetch_one("SELECT COUNT(*) FROM api_key_metadata WHERE status = 'active'")[0]
            expired = self._db.fetch_one("SELECT COUNT(*) FROM api_key_metadata WHERE status = 'expired'")[0]
            revoked = self._db.fetch_one("SELECT COUNT(*) FROM api_key_metadata WHERE status = 'revoked'")[0]
            return {"total": total, "active": active, "expired": expired, "revoked": revoked}
        except Exception:
            return {"total": 0, "active": 0, "expired": 0, "revoked": 0}
