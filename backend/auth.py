"""JWT Authentication system for LUQI AI"""
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import jwt
from fastapi import HTTPException, Header, Request

# Config
SECRET_KEY = secrets.token_hex(32)  # In production: from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7


class AuthManager:
    """Manages user authentication with JWT tokens and SQLite storage."""

    def __init__(self, db_path: str = "data/users.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Create users table if not exists."""
        import sqlite3
        import os

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
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
        # Create default admin
        c.execute(
            """INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, created_at)
            VALUES (1, 'admin@luqi.ai', ?, 'System Admin', 'admin', ?)""",
            (self._hash_password("admin123"), datetime.now().isoformat()),
        )
        conn.commit()
        conn.close()

    def _hash_password(self, password: str) -> str:
        """Hash password using PBKDF2-HMAC-SHA256."""
        salt = "luqi-salt-v1"
        return hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), 100000
        ).hex()

    def register(self, email: str, password: str, full_name: str = "") -> dict:
        """Register a new user. Returns user dict or error dict."""
        import sqlite3

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
        """Authenticate user and return JWT tokens."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "SELECT id, email, full_name, role, password_hash FROM users WHERE email = ? AND is_active = 1",
            (email,),
        )
        row = c.fetchone()
        conn.close()

        if not row or row[4] != self._hash_password(password):
            return {"success": False, "error": "Invalid email or password"}

        user_id, email, full_name, role, _ = row
        access_token = self._create_token(user_id, email, role, "access")
        refresh_token = self._create_token(user_id, email, role, "refresh")

        return {
            "success": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": role,
            },
        }

    def _create_token(self, user_id: int, email: str, role: str, token_type: str) -> str:
        """Create a JWT token (access or refresh)."""
        now = datetime.utcnow()
        if token_type == "access":
            expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        else:
            expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": token_type,
            "exp": expire,
            "iat": now,
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    def verify_token(self, token: str) -> dict:
        """Verify a JWT token and return user info."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return {
                "valid": True,
                "user_id": int(payload["sub"]),
                "email": payload["email"],
                "role": payload["role"],
                "type": payload.get("type", "access"),
            }
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token expired"}
        except jwt.InvalidTokenError:
            return {"valid": False, "error": "Invalid token"}

    def refresh_access_token(self, refresh_token: str) -> dict:
        """Create a new access token from a valid refresh token."""
        result = self.verify_token(refresh_token)
        if not result["valid"]:
            return {"success": False, "error": result["error"]}
        if result["type"] != "refresh":
            return {"success": False, "error": "Invalid token type"}
        new_token = self._create_token(
            result["user_id"], result["email"], result["role"], "access"
        )
        return {"success": True, "access_token": new_token, "token_type": "bearer"}

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

    def list_users(self) -> dict:
        """List all registered users (admin only)."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            "SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id"
        )
        rows = c.fetchall()
        conn.close()
        return {
            "success": True,
            "users": [
                {
                    "id": r[0],
                    "email": r[1],
                    "full_name": r[2],
                    "role": r[3],
                    "is_active": bool(r[4]),
                    "created_at": r[5],
                }
                for r in rows
            ],
            "count": len(rows),
        }

    def deactivate_user(self, user_id: int) -> dict:
        """Deactivate a user account (soft delete)."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"success": True, "message": f"User {user_id} deactivated"}

    def delete_user(self, user_id: int) -> dict:
        """Permanently delete a user."""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"success": True, "message": f"User {user_id} deleted"}


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def get_current_user(x_token: str = Header(None)):
    """FastAPI dependency: verify JWT token from X-Token header."""
    if not x_token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    auth = AuthManager()
    result = auth.verify_token(x_token)
    if not result["valid"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result


async def require_admin(x_token: str = Header(None)):
    """FastAPI dependency: require admin role."""
    if not x_token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    auth = AuthManager()
    result = auth.verify_token(x_token)
    if not result["valid"]:
        raise HTTPException(status_code=401, detail=result["error"])
    if result["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return result


# Standalone (non-async) token checker for synchronous code paths
def verify_token_sync(token: str) -> dict:
    """Verify a JWT token synchronously."""
    auth = AuthManager()
    return auth.verify_token(token)
