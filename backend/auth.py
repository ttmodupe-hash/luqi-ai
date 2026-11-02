"""JWT Authentication system for LUQI AI"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import hmac
import re
import sqlite3
from contextlib import closing
import jwt
from fastapi import HTTPException, Request

# Config
JWT_ISSUER = "luqi-ai-legacy-backend"
JWT_AUDIENCE = "luqi-ai-legacy-user"
PASSWORD_ITERATIONS = 600_000


def _signing_key() -> str:
    key = os.environ.get("JWT_SECRET", "")
    if len(key.encode("utf-8")) < 32 or key == "luqi-dev-secret-change-in-production":
        raise ValueError("Authentication unavailable")
    return key


def _credential_version(key: str, row: tuple) -> str:
    # Revoke tokens after password, email or role changes; never expose the hash.
    import json
    identity = json.dumps([row[0], row[1], row[3], row[4]], separators=(",", ":"))
    return hmac.new(key.encode(), identity.encode(), hashlib.sha256).hexdigest()


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7


# Simple in-memory rate limiter for auth endpoints
_rate_limit_store: dict = {}  # ip -> [(timestamp, count)]

def rate_limit(max_requests: int = 5, window: int = 60):
    """Rate limit decorator: max_requests per window (seconds)."""
    from functools import wraps
    from fastapi import HTTPException
    import time

    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            ip = request.client.host if request.client else "unknown"
            now = time.time()
            key = f"{ip}:{func.__name__}"

            # Clean old entries
            if key in _rate_limit_store:
                _rate_limit_store[key] = [
                    t for t in _rate_limit_store[key] if now - t < window
                ]
            else:
                _rate_limit_store[key] = []

            if len(_rate_limit_store[key]) >= max_requests:
                raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

            _rate_limit_store[key].append(now)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


class AuthManager:
    """Manages user authentication with JWT tokens and SQLite storage."""

    def __init__(self, db_path: str = "data/users.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Create users table if not exists."""
        import sqlite3
        import os

        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            """CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            last_login TEXT
        )"""
        )
        # Schema creation must never provision an administrator. Preserve all
        # existing accounts; administrator enrollment is a separate reviewed flow.
        conn.commit()
        conn.close()

    def _hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), PASSWORD_ITERATIONS
        ).hex()
        return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"

    def _verify_password(self, password: str, stored: str) -> bool:
        if not isinstance(password, str) or not 1 <= len(password.encode()) <= 1024:
            return False
        if not isinstance(stored, str):
            return False
        if re.fullmatch(r"[a-f0-9]{64}", stored):
            # Existing passwords remain usable and are upgraded on successful login.
            expected = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), b"luqi-salt-v1", 100_000
            ).hex()
        else:
            parts = stored.split("$")
            if (len(parts) != 4 or parts[0] != "pbkdf2_sha256"
                    or parts[1] != str(PASSWORD_ITERATIONS)
                    or not re.fullmatch(r"[a-f0-9]{32}", parts[2])
                    or not re.fullmatch(r"[a-f0-9]{64}", parts[3])):
                return False
            expected = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), parts[2].encode(), PASSWORD_ITERATIONS
            ).hex()
            stored = parts[3]
        return hmac.compare_digest(expected, stored)

    def _account(self, user_id: int) -> Optional[tuple]:
        with closing(sqlite3.connect(self.db_path)) as conn:
            return conn.execute(
                "SELECT id,email,full_name,role,password_hash,is_active FROM users WHERE id=?",
                (user_id,),
            ).fetchone()

    def register(self, email: str, password: str, full_name: str = "") -> dict:
        """Register a new user. Returns user dict or error dict."""
        import sqlite3

        try:
            _signing_key()
        except ValueError:
            return {"success": False, "error": "Authentication unavailable"}
        if (not isinstance(email, str) or len(email) > 254
                or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip())
                or not isinstance(password, str) or len(password) < 12
                or len(password.encode()) > 1024):
            return {"success": False, "error": "Valid email and password of at least 12 characters and at most 1024 bytes are required"}
        email = email.strip().lower()

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        try:
            c.execute(
                "INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?, ?, ?, ?)",
                (email, self._hash_password(password), full_name, datetime.now().isoformat()),
            )
            conn.commit()
            user_id = c.lastrowid
            conn.close()
            return {
                "success": True,
                "user_id": user_id,
                "email": email,
                "message": "Registration successful",
            }
        except sqlite3.IntegrityError:
            conn.close()
            return {"success": False, "error": "Email already registered"}

    def login(self, email: str, password: str) -> dict:
        """Authenticate against current account state, upgrading legacy hashes."""
        try:
            _signing_key()
        except ValueError:
            return {"success": False, "error": "Authentication unavailable"}
        if not isinstance(email, str) or len(email) > 254:
            return {"success": False, "error": "Invalid email or password"}
        with closing(sqlite3.connect(self.db_path)) as conn:
            row = conn.execute(
                "SELECT id,email,full_name,role,password_hash,is_active FROM users WHERE email=?",
                (email.strip().lower(),),
            ).fetchone()
            if not row or row[5] != 1 or not self._verify_password(password, row[4]):
                return {"success": False, "error": "Invalid email or password"}
            if re.fullmatch(r"[a-f0-9]{64}", row[4]):
                # Compare-and-swap preserves concurrent recovery/disable changes.
                upgraded_hash = self._hash_password(password)
                result = conn.execute(
                    "UPDATE users SET password_hash=? WHERE id=? AND password_hash=? AND is_active=1",
                    (upgraded_hash, row[0], row[4]),
                )
                conn.commit()
                if result.rowcount != 1:
                    return {"success": False, "error": "Invalid email or password"}
                row = (*row[:4], upgraded_hash, row[5])
        try:
            cv = _credential_version(_signing_key(), row)
            access = self._create_token(row[0], row[1], row[3], "access", cv)
            refresh = self._create_token(row[0], row[1], row[3], "refresh", cv)
        except ValueError:
            return {"success": False, "error": "Authentication unavailable"}
        return {
            "success": True, "access_token": access, "refresh_token": refresh,
            "token_type": "bearer",
            "user": {"id": row[0], "email": row[1], "full_name": row[2], "role": row[3]},
        }

    def _create_token(self, user_id: int, email: str, role: str, token_type: str, expected_cv: str) -> str:
        key = _signing_key()
        row = self._account(user_id)
        if (not row or row[5] != 1 or row[1] != email or row[3] != role
                or token_type not in {"access", "refresh"}
                or not hmac.compare_digest(expected_cv, _credential_version(key, row))):
            raise ValueError("Invalid account")
        from datetime import timezone
        now = datetime.now(timezone.utc)
        duration = (timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                    if token_type == "access" else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
        return jwt.encode({
            "sub": str(user_id), "type": token_type,
            "iss": JWT_ISSUER, "aud": JWT_AUDIENCE,
            "cv": _credential_version(key, row), "exp": now + duration, "iat": now,
        }, key, algorithm=ALGORITHM)

    def verify_token(self, token: str, expected_type: str = "access") -> dict:
        try:
            key = _signing_key()
        except ValueError:
            return {"valid": False, "error": "Authentication unavailable"}
        if not isinstance(token, str) or len(token) > 4096:
            return {"valid": False, "error": "Invalid token"}
        try:
            payload = jwt.decode(token, key, algorithms=[ALGORITHM],
                                 issuer=JWT_ISSUER, audience=JWT_AUDIENCE,
                                 options={"require": ["sub", "type", "cv", "exp", "iat", "iss", "aud"]})
            if (expected_type not in {"access", "refresh"}
                    or payload["type"] != expected_type
                    or not re.fullmatch(r"[1-9][0-9]{0,18}", payload["sub"])
                    or type(payload["iat"]) is not int or type(payload["exp"]) is not int
                    or not isinstance(payload["cv"], str)
                    or not re.fullmatch(r"[a-f0-9]{64}", payload["cv"])):
                raise ValueError("Invalid claims")
            max_age = (ACCESS_TOKEN_EXPIRE_MINUTES * 60 if expected_type == "access"
                       else REFRESH_TOKEN_EXPIRE_DAYS * 86400)
            if not 0 < payload["exp"] - payload["iat"] <= max_age:
                raise ValueError("Invalid lifetime")
            row = self._account(int(payload["sub"]))
            if not row or row[5] != 1 or not hmac.compare_digest(payload["cv"], _credential_version(key, row)):
                raise ValueError("Invalid account")
            return {"valid": True, "user_id": row[0], "email": row[1], "role": row[3], "type": expected_type, "credential_version": payload["cv"]}
        except (jwt.InvalidTokenError, ValueError, TypeError, KeyError, sqlite3.Error):
            return {"valid": False, "error": "Invalid token"}

    def refresh_access_token(self, refresh_token: str) -> dict:
        result = self.verify_token(refresh_token, expected_type="refresh")
        if not result["valid"]:
            return {"success": False, "error": result["error"]}
        try:
            token = self._create_token(result["user_id"], result["email"], result["role"], "access", result["credential_version"])
        except (ValueError, sqlite3.Error):
            return {"success": False, "error": "Authentication unavailable"}
        return {"success": True, "access_token": token, "token_type": "bearer"}

    def get_user(self, user_id: int) -> dict:
        """Get user details by ID."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        row = c.fetchone()
        conn.close()
        if not row:
            return {"success": False, "error": "User not found"}
        return {
            "success": True,
            "user": {
                "id": row[0],
                "email": row[1],
                "full_name": row[2],
                "role": row[3],
                "is_active": bool(row[4]),
                "created_at": row[5],
            },
        }

    def list_users(self) -> list:
        """List all users."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id"
        )
        rows = c.fetchall()
        conn.close()
        return [
            {
                "id": r[0],
                "email": r[1],
                "full_name": r[2],
                "role": r[3],
                "is_active": bool(r[4]),
                "created_at": r[5],
            }
            for r in rows
        ]

    def update_user(self, user_id: int, **kwargs) -> dict:
        """Update user fields."""
        import sqlite3

        allowed = {"email", "full_name", "role", "is_active"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return {"success": False, "error": "No valid fields to update"}

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user_id]
        c.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
        conn.commit()
        updated = c.rowcount
        conn.close()
        return {"success": updated > 0, "updated": updated}

    def delete_user(self, user_id: int) -> dict:
        """Soft-delete a user."""
        return self.update_user(user_id, is_active=0)


# FastAPI dependency
async def get_current_user(request: Request) -> dict:
    """Extract and verify JWT from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if len(auth) > 4103 or not re.fullmatch(r"Bearer [^\s]+", auth):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth[7:]
    auth_manager = AuthManager()
    result = auth_manager.verify_token(token)
    if not result["valid"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result


async def require_admin(request: Request) -> dict:
    """Require admin role."""
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
