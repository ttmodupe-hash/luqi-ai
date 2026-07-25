"""Omega AI v3.7.0 — Multi-Tenant Workspace Manager
Isolated workspaces per user/organization with separate data, settings, and history.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

from db_engine import DatabaseEngine


class WorkspaceManager:
    """Manages isolated workspaces for multi-tenant deployment."""

    def __init__(self, db: DatabaseEngine | None = None) -> None:
        self._db = db or DatabaseEngine()
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        """Create workspace tables."""
        try:
            self._db.execute("""
                CREATE TABLE IF NOT EXISTS workspaces (
                    workspace_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    owner_key_hash TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    settings TEXT DEFAULT '{}',
                    status TEXT DEFAULT 'active'
                )
            """)
            self._db.execute("""
                CREATE TABLE IF NOT EXISTS workspace_usage (
                    workspace_id TEXT PRIMARY KEY,
                    query_count INTEGER DEFAULT 0,
                    storage_bytes INTEGER DEFAULT 0,
                    last_active REAL
                )
            """)
        except Exception:
            pass

    def create_workspace(self, name: str, owner_api_key: str) -> dict[str, Any]:
        """Create a new workspace."""
        ws_id = f"ws_{hashlib.sha256(f'{name}{time.time()}'.encode()).hexdigest()[:12]}"
        key_hash = hashlib.sha256(owner_api_key.encode()).hexdigest()
        now = time.time()
        try:
            self._db.execute(
                "INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)",
                (ws_id, name, key_hash, now, '{}', 'active')
            )
            self._db.execute(
                "INSERT INTO workspace_usage VALUES (?, ?, ?, ?)",
                (ws_id, 0, 0, now)
            )
        except Exception:
            pass
        return {"workspace_id": ws_id, "name": name, "created_at": now}

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        """Get workspace details."""
        row = self._db.fetch_one("SELECT * FROM workspaces WHERE workspace_id = ?", (workspace_id,))
        if not row:
            return None
        return {
            "workspace_id": row[0],
            "name": row[1],
            "created_at": row[3],
            "settings": json.loads(row[4]) if row[4] else {},
            "status": row[5],
        }

    def update_settings(self, workspace_id: str, settings: dict[str, Any]) -> bool:
        """Update workspace settings."""
        try:
            existing = self.get_workspace(workspace_id)
            if existing:
                merged = {**existing.get("settings", {}), **settings}
                self._db.execute(
                    "UPDATE workspaces SET settings = ? WHERE workspace_id = ?",
                    (json.dumps(merged), workspace_id)
                )
                return True
        except Exception:
            pass
        return False

    def list_workspaces(self) -> list[dict[str, Any]]:
        """List all workspaces."""
        rows = self._db.fetch_all("SELECT * FROM workspaces ORDER BY created_at DESC")
        return [{"workspace_id": r[0], "name": r[1], "status": r[5]} for r in rows]

    def record_usage(self, workspace_id: str) -> None:
        """Record a query for workspace usage tracking."""
        try:
            self._db.execute(
                "UPDATE workspace_usage SET query_count = query_count + 1, last_active = ? WHERE workspace_id = ?",
                (time.time(), workspace_id)
            )
        except Exception:
            pass

    def get_usage(self, workspace_id: str) -> dict[str, Any]:
        """Get workspace usage stats."""
        row = self._db.fetch_one("SELECT * FROM workspace_usage WHERE workspace_id = ?", (workspace_id,))
        if not row:
            return {"query_count": 0, "storage_bytes": 0, "last_active": None}
        return {
            "workspace_id": row[0],
            "query_count": row[1],
            "storage_bytes": row[2],
            "last_active": row[3],
        }

    def get_workspace_db_path(self, workspace_id: str) -> str:
        """Get isolated DB path for a workspace."""
        path = Path(f".omega_sessions/workspaces/{workspace_id}")
        path.mkdir(parents=True, exist_ok=True)
        return str(path / "data.db")

    def get_workspace_memory_path(self, workspace_id: str) -> str:
        """Get isolated memory path for a workspace."""
        path = Path(f".omega_sessions/workspaces/{workspace_id}")
        path.mkdir(parents=True, exist_ok=True)
        return str(path / "memory.json")
