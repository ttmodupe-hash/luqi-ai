"""Omega AI v3.7.0 — Blockchain-Style Audit Log
Immutable tamper-proof interaction records using hash chains.
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any


class BlockchainAuditLog:
    """Append-only audit log with cryptographic hash chaining."""

    def __init__(self, db: Any = None) -> None:
        self._db = db
        self._ensure_table()

    def _ensure_table(self) -> None:
        try:
            self._db.execute("""
                CREATE TABLE IF NOT EXISTS blockchain_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action TEXT NOT NULL,
                    actor TEXT,
                    data_json TEXT,
                    data_hash TEXT NOT NULL,
                    prev_hash TEXT,
                    timestamp REAL NOT NULL
                )
            """)
        except Exception:
            pass

    def _compute_hash(self, data: dict[str, Any], prev_hash: str | None = None) -> str:
        content = json.dumps(data, sort_keys=True, separators=(",", ":"))
        if prev_hash:
            content = prev_hash + content
        return hashlib.sha256(content.encode()).hexdigest()

    def _get_last_hash(self) -> str | None:
        try:
            row = self._db.fetch_one("SELECT data_hash FROM blockchain_audit ORDER BY id DESC LIMIT 1")
            return row[0] if row else None
        except Exception:
            return None

    def append(self, action: str, actor: str = "", data: dict[str, Any] | None = None) -> dict[str, Any]:
        prev_hash = self._get_last_hash()
        entry_data = {"action": action, "actor": actor, "data": data or {}, "timestamp": time.time()}
        data_hash = self._compute_hash(entry_data, prev_hash)
        try:
            self._db.execute(
                "INSERT INTO blockchain_audit (action, actor, data_json, data_hash, prev_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (action, actor, json.dumps(data or {}), data_hash, prev_hash, time.time())
            )
            return {"success": True, "hash": data_hash, "previous": prev_hash, "action": action}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def verify_chain(self) -> dict[str, Any]:
        try:
            rows = self._db.fetch_all("SELECT id, data_json, data_hash, prev_hash, timestamp FROM blockchain_audit ORDER BY id")
        except Exception:
            return {"valid": False, "error": "Could not read audit log"}
        broken = []
        prev_hash = None
        for row in rows:
            entry_id, data_json, stored_hash, stored_prev, ts = row
            if stored_prev != prev_hash:
                broken.append(entry_id)
            data = {"data": json.loads(data_json), "timestamp": ts}
            computed = self._compute_hash(data, stored_prev)
            if computed != stored_hash:
                broken.append(entry_id)
            prev_hash = stored_hash
        return {"valid": len(broken) == 0, "total_entries": len(rows), "broken_entries": broken, "integrity": "100%" if len(broken) == 0 else f"{((len(rows)-len(broken))/len(rows)*100):.1f}%"}

    def get_recent(self, limit: int = 50) -> list[dict[str, Any]]:
        rows = self._db.fetch_all("SELECT * FROM blockchain_audit ORDER BY id DESC LIMIT ?", (limit,))
        return [{"id": r[0], "action": r[1], "actor": r[2], "data": json.loads(r[3]) if r[3] else {}, "hash": r[4], "previous": r[5], "timestamp": r[6]} for r in rows]

    def stats(self) -> dict[str, Any]:
        return {**self.verify_chain(), "recent_actions": len(self.get_recent(10))}
