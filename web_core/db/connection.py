"""
web_core.db.connection - Thread-safe SQLite connection pool.
Every store gets connections from here.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger("luqi.db")


class ConnectionPool:
    """Thread-local SQLite connection pool.
    Each thread gets its own connection via `_conn()`.
    Database schema is auto-initialized on first use.
    """

    _SCHEMA = """
    -- Conversations
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT DEFAULT 'default',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        tool_calls TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations(session_id);

    -- Uploaded documents
    CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        ext TEXT,
        content_preview TEXT,
        file_path TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sandbox execution logs
    CREATE TABLE IF NOT EXISTS sandbox_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        exit_code INTEGER,
        stdout TEXT,
        stderr TEXT,
        duration_ms INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Capabilities registry
    CREATE TABLE IF NOT EXISTS capabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        status TEXT,
        description TEXT,
        updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- API keys
    CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT PRIMARY KEY,
        name TEXT DEFAULT 'default',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_used TEXT,
        request_count INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    );

    -- Rate limiting
    CREATE TABLE IF NOT EXISTS rate_limits (
        key_hash TEXT PRIMARY KEY,
        tokens REAL DEFAULT 60.0,
        last_refill TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Request logs
    CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_hash TEXT,
        method TEXT,
        path TEXT,
        status_code INTEGER,
        latency_ms REAL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Webhooks
    CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        event_type TEXT DEFAULT '*',
        secret TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- YouTube campaigns
    CREATE TABLE IF NOT EXISTS youtube_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        niche TEXT,
        target_audience TEXT,
        content_pillars TEXT,
        upload_schedule TEXT,
        seo_strategy TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Wealth funnels
    CREATE TABLE IF NOT EXISTS wealth_funnels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        funnel_type TEXT,
        price_tier TEXT,
        estimated_revenue REAL,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """

    def __init__(self, db_path: Path | str):
        self.db_path = str(db_path)
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        """Get (or create) a thread-local connection."""
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        """Run schema creation — safe to call multiple times."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(self._SCHEMA)
            logger.debug("Database schema initialized: %s", self.db_path)

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute SQL and commit. Returns cursor."""
        conn = self._conn()
        try:
            cur = conn.execute(sql, params)
            conn.commit()
            return cur
        except sqlite3.Error:
            conn.rollback()
            raise

    def fetchone(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """Fetch a single row."""
        return self._conn().execute(sql, params).fetchone()

    def fetchall(self, sql: str, params: tuple = ()) -> list:
        """Fetch all rows."""
        return self._conn().execute(sql, params).fetchall()

    def close(self):
        """Close the thread-local connection if open."""
        if hasattr(self._local, "conn") and self._local.conn:
            self._local.conn.close()
            self._local.conn = None
