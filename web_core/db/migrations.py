"""
web_core.db.migrations - Versioned database schema migrations.

Provides an ABC for migrations, a manager for apply/rollback operations,
and built-in migrations for the initial LUQI schema.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

logger = logging.getLogger("luqi.db.migrations")


# -- Migration ABC ------------------------------------------------------------

class Migration(ABC):
    """Base class for a single schema migration.

    Subclasses must define *version*, *description*, and implement
    :meth:`up` and :meth:`down`.
    """

    version: str = ""
    description: str = ""

    @abstractmethod
    def up(self, pool: Any) -> None:
        """Apply this migration."""
        ...

    @abstractmethod
    def down(self, pool: Any) -> None:
        """Rollback this migration."""
        ...


# -- Built-in migrations ------------------------------------------------------

class InitialSchema(Migration):
    """Creates all tables for a fresh LUQI installation.

    This migration is always considered applied; it represents the
    baseline schema.  Rollback is a no-op.
    """

    version = "00000000_000"
    description = "Initial LUQI schema"

    _SQL = """
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

    CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        ext TEXT,
        content_preview TEXT,
        file_path TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sandbox_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        exit_code INTEGER,
        stdout TEXT,
        stderr TEXT,
        duration_ms INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS capabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        status TEXT,
        description TEXT,
        updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT PRIMARY KEY,
        name TEXT DEFAULT 'default',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_used TEXT,
        request_count INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
        key_hash TEXT PRIMARY KEY,
        tokens REAL DEFAULT 60.0,
        last_refill TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_hash TEXT,
        method TEXT,
        path TEXT,
        status_code INTEGER,
        latency_ms REAL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        event_type TEXT DEFAULT '*',
        secret TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    def up(self, pool: Any) -> None:
        _exec_multi(pool, self._SQL)
        logger.debug("InitialSchema applied (idempotent)")

    def down(self, pool: Any) -> None:
        logger.debug("InitialSchema rollback is a no-op")


class AddTelemetryTable(Migration):
    """Adds the telemetry_events table for request/performance tracking."""

    version = "20240725_001"
    description = "Add telemetry_events table"

    def up(self, pool: Any) -> None:
        _exec_multi(pool, """
        CREATE TABLE IF NOT EXISTS telemetry_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
        """)
        logger.info("AddTelemetryTable applied")

    def down(self, pool: Any) -> None:
        pool.execute("DROP TABLE IF EXISTS telemetry_events")
        logger.info("AddTelemetryTable rolled back")


# -- Manager ------------------------------------------------------------------

class MigrationManager:
    """Controls migration apply / rollback lifecycle.

    Usage::

        mgr = MigrationManager(pool, Path("./migrations"))
        mgr.migrate()           # apply all pending
        mgr.rollback(steps=1)   # rollback last
        print(mgr.status())
    """

    def __init__(self, pool: Any, migrations_dir: Optional[Path] = None):
        self.pool = pool
        self.migrations_dir = migrations_dir or Path(".")
        self._migrations: List[Migration] = []
        self._lock = threading.Lock()
        self._ensure_migration_table()
        self._register_builtin_migrations()

    # -- public API ------------------------------------------------------------

    def get_applied_migrations(self) -> List[str]:
        """Return list of applied version strings."""
        rows = self.pool.fetchall(
            "SELECT version FROM schema_migrations WHERE rolled_back = 0 ORDER BY applied_at"
        )
        return [r["version"] for r in rows]

    def get_pending_migrations(self) -> List[Migration]:
        """Return migrations not yet applied."""
        applied = set(self.get_applied_migrations())
        return [m for m in self._migrations if m.version not in applied]

    def migrate(self, target: str = "latest") -> List[str]:
        """Apply all pending migrations up to *target*.

        Returns list of applied version strings.
        """
        with self._lock:
            pending = self.get_pending_migrations()
            if target != "latest":
                pending = [m for m in pending if m.version <= target]

            applied: List[str] = []
            for migration in pending:
                logger.info("Applying migration %s: %s", migration.version, migration.description)
                migration.up(self.pool)
                self.pool.execute(
                    """INSERT INTO schema_migrations (version, description, applied_at, rolled_back)
                        VALUES (?, ?, ?, 0)
                        ON CONFLICT(version) DO UPDATE SET
                            description=excluded.description,
                            applied_at=excluded.applied_at,
                            rolled_back=0""",
                    (migration.version, migration.description, datetime.utcnow().isoformat()),
                )
                applied.append(migration.version)
            return applied

    def rollback(self, steps: int = 1) -> List[str]:
        """Rollback *steps* most recent migrations.

        Returns list of rolled-back version strings.
        The InitialSchema (00000000_000) is never rolled back.
        """
        with self._lock:
            rows = self.pool.fetchall(
                "SELECT version FROM schema_migrations WHERE rolled_back = 0 AND version != '00000000_000' ORDER BY applied_at DESC LIMIT ?",
                (steps,),
            )
            versions = [r["version"] for r in rows]
            rolled: List[str] = []
            for v in versions:
                migration = self._get_migration(v)
                if migration is None:
                    continue
                logger.info("Rolling back migration %s", v)
                migration.down(self.pool)
                self.pool.execute(
                    "UPDATE schema_migrations SET rolled_back = 1 WHERE version = ?",
                    (v,),
                )
                rolled.append(v)
            return rolled

    def status(self) -> Dict[str, Any]:
        """Return current migration status."""
        applied = self.get_applied_migrations()
        pending = self.get_pending_migrations()
        last = applied[-1] if applied else None
        return {
            "current_version": last,
            "pending_count": len(pending),
            "applied_count": len(applied),
            "last_applied": last,
            "pending_versions": [m.version for m in pending],
        }

    # -- internal -------------------------------------------------------------

    def _ensure_migration_table(self) -> None:
        self.pool.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                description TEXT,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
                rolled_back INTEGER DEFAULT 0
            )
        """)

    def _register_builtin_migrations(self) -> None:
        """Register built-in migrations in version order."""
        builtins: List[Type[Migration]] = [InitialSchema, AddTelemetryTable]
        for cls in builtins:
            inst = cls()
            self._migrations.append(inst)
        self._migrations.sort(key=lambda m: m.version)

    def _get_migration(self, version: str) -> Optional[Migration]:
        for m in self._migrations:
            if m.version == version:
                return m
        return None


# -- Helpers ------------------------------------------------------------------

def _exec_multi(pool: Any, sql: str) -> None:
    """Execute a multi-statement SQL script via the pool."""
    for stmt in sql.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            pool.execute(stmt)
