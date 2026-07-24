"""Omega AI v3.3 — Authentication & Authorization Middleware
API key-based auth using only Python stdlib (hmac, secrets, hashlib).

No external dependencies. SQLite-backed key storage.
"""
from __future__ import annotations

import hashlib
import logging
import os
import secrets
import sqlite3
import threading
import time
from collections import defaultdict
from datetime import datetime, timezone

# ── Logging ──
logger = logging.getLogger("omega.auth")


# ── Constants ──
KEY_PREFIX = "oa_"
ROLE_HIERARCHY = {"readonly": 0, "user": 1, "admin": 2}
ANONYMOUS_ROLE_LEVEL = -1  # below readonly


def _utc_now() -> str:
    """ISO-8601 UTC timestamp string."""
    return datetime.now(timezone.utc).isoformat()


def _hash_key(key: str) -> str:
    """SHA-256 hash of an API key — what we store."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _key_id(key: str) -> str:
    """Deterministic short ID derived from key hash (for referencing without storing the key)."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def _mask_key(key: str) -> str:
    """Return first 8 chars + '...' for safe logging."""
    if not key:
        return "<empty>"
    if len(key) <= 12:
        return key[:4] + "..."
    return key[:8] + "..."


class AuthManager:
    """Manage API keys and request authentication.

    Usage:
        auth = AuthManager(auth_required=True, db_path="omega_keys.db")
        key = auth.generate_key(name="my-app", role="user")
        ok, err = auth.authenticate_request(headers)
    """

    def __init__(self, auth_required: bool = False, db_path: str = "") -> None:
        self.auth_required = auth_required
        self._db_path = db_path or os.environ.get("OMEGA_AUTH_DB", "omega_keys.db")
        self._local = threading.local()
        self._ensure_table()
        # Rate-limit state: key_id -> list of timestamps
        self._rate_lock = threading.Lock()
        self._rate_requests: dict[str, list[float]] = defaultdict(list)

    # ── Internal: DB connection per thread ──
    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "db"):
            self._local.db = sqlite3.connect(self._db_path, check_same_thread=False)
            self._local.db.row_factory = sqlite3.Row
        return self._local.db

    def _ensure_table(self) -> None:
        """Create the api_keys table if it doesn't exist."""
        with self._conn() as c:
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    key_hash TEXT UNIQUE NOT NULL,
                    role TEXT DEFAULT 'user',
                    created_at TEXT NOT NULL,
                    last_used TEXT,
                    request_count INTEGER DEFAULT 0,
                    active INTEGER DEFAULT 1
                )
                """
            )
            c.commit()

    # ── API Key Management ──
    def generate_key(self, name: str = "", role: str = "user") -> str:
        """Generate a new API key. Returns the key — save it, it's shown only once."""
        if role not in ROLE_HIERARCHY:
            raise ValueError(f"Invalid role '{role}'. Must be one of {list(ROLE_HIERARCHY)}")
        raw = secrets.token_urlsafe(32)
        key = KEY_PREFIX + raw
        k_hash = _hash_key(key)
        kid = _key_id(key)
        now = _utc_now()
        with self._conn() as c:
            c.execute(
                "INSERT INTO api_keys (id, name, key_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (kid, name or "Unnamed", k_hash, role, now),
            )
            c.commit()
        logger.info("Generated API key %s (role=%s, name=%s)", kid, role, name)
        return key

    def validate_key(self, key: str) -> bool:
        """Validate an API key by checking its hash against stored hashes."""
        if not key or not key.startswith(KEY_PREFIX):
            return False
        k_hash = _hash_key(key)
        with self._conn() as c:
            row = c.execute(
                "SELECT id, active FROM api_keys WHERE key_hash = ?", (k_hash,)
            ).fetchone()
        if row is None:
            return False
        if not row["active"]:
            return False
        now = _utc_now()
        with self._conn() as c:
            c.execute(
                "UPDATE api_keys SET last_used = ?, request_count = request_count + 1 WHERE id = ?",
                (now, row["id"]),
            )
            c.commit()
        return True

    def get_key_info(self, key: str) -> dict | None:
        """Return metadata about a key (by key value). Returns None if invalid."""
        if not key or not key.startswith(KEY_PREFIX):
            return None
        k_hash = _hash_key(key)
        with self._conn() as c:
            row = c.execute(
                "SELECT id, name, role, created_at, last_used, request_count, active FROM api_keys WHERE key_hash = ?",
                (k_hash,),
            ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "created_at": row["created_at"],
            "last_used": row["last_used"],
            "request_count": row["request_count"],
            "active": bool(row["active"]),
        }

    def revoke_key(self, key_id: str) -> bool:
        """Revoke (deactivate) an API key by its ID. Returns True if found."""
        with self._conn() as c:
            cur = c.execute("UPDATE api_keys SET active = 0 WHERE id = ?", (key_id,))
            c.commit()
            if cur.rowcount == 0:
                return False
        logger.info("Revoked API key %s", key_id)
        return True

    def list_keys(self) -> list[dict]:
        """List all API keys."""
        with self._conn() as c:
            rows = c.execute(
                "SELECT id, name, role, created_at, last_used, request_count, active FROM api_keys ORDER BY created_at DESC"
            ).fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "role": r["role"],
                "created": r["created_at"],
                "last_used": r["last_used"],
                "request_count": r["request_count"],
                "active": bool(r["active"]),
            }
            for r in rows
        ]

    # ── Request Auth ──
    def extract_key(self, headers: dict) -> str:
        """Extract API key from headers."""
        key = headers.get("X-API-Key", "")
        if key:
            return key.strip()
        auth = headers.get("Authorization", "")
        if auth:
            parts = auth.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1].strip()
        return ""

    def authenticate_request(self, headers: dict) -> tuple[bool, str]:
        """Authenticate a request. Returns (is_authenticated, error_message)."""
        if not self.auth_required:
            return True, ""
        key = self.extract_key(headers)
        if not key:
            return False, "Missing API key. Provide X-API-Key or Authorization: Bearer <key> header."
        if not self.validate_key(key):
            return False, f"Invalid or revoked API key: {_mask_key(key)}"
        kid = _key_id(key)
        info = self.get_key_info(key)
        if info and not info["active"]:
            return False, f"API key revoked: {kid}"
        return True, ""

    def get_request_role(self, headers: dict) -> str:
        """Return the role of the authenticated key, or empty string if none."""
        key = self.extract_key(headers)
        if not key:
            return ""
        info = self.get_key_info(key)
        return info["role"] if info else ""

    # ── Roles ──
    def check_permission(self, key: str, required_role: str) -> bool:
        """Check if a key has at least the required role."""
        if required_role not in ROLE_HIERARCHY:
            raise ValueError(f"Invalid required_role '{required_role}'")
        info = self.get_key_info(key)
        if info is None:
            return False
        key_level = ROLE_HIERARCHY.get(info["role"], ANONYMOUS_ROLE_LEVEL)
        required_level = ROLE_HIERARCHY[required_role]
        return key_level >= required_level

    def check_request_permission(self, headers: dict, required_role: str) -> bool:
        """Check if the request's key has sufficient permissions."""
        key = self.extract_key(headers)
        return self.check_permission(key, required_role)

    # ── Rate Limiting (per-key) ──
    def check_rate_limit(self, key: str, max_requests: int = 100) -> bool:
        """Check if a key is within its rate limit."""
        if not key:
            return True
        kid = _key_id(key) if key.startswith(KEY_PREFIX) else key
        now = time.time()
        with self._rate_lock:
            reqs = self._rate_requests[kid]
            reqs[:] = [t for t in reqs if now - t < 60]
            if len(reqs) >= max_requests:
                return False
            reqs.append(now)
        return True

    def log_request(self, headers: dict, endpoint: str, method: str, status: int = 200) -> None:
        """Log an authenticated request."""
        key = self.extract_key(headers)
        kid = _key_id(key) if key else "anonymous"
        masked = _mask_key(key) if key else "<none>"
        logger.info(
            "[%s] %s %s -> %d | key=%s (%s)",
            _utc_now(), method, endpoint, status, masked, kid,
        )

    def create_default_admin_key(self) -> str | None:
        """Create a default admin key if no keys exist."""
        existing = self.list_keys()
        if existing:
            return None
        key = self.generate_key(name="default-admin", role="admin")
        logger.warning("No API keys found. Created default admin key: %s (SAVE THIS!)", _mask_key(key))
        return key
