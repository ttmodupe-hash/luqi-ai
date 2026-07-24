"""
web_core.db.documents - Document upload & sandbox run persistence.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from web_core.db.connection import ConnectionPool
from web_core.models import DocumentInfo, SandboxRunResult

logger = logging.getLogger("luqi.db.documents")


class DocumentStore:
    """CRUD for uploaded documents and sandbox execution logs."""

    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def save_document(self, filename: str, ext: str, preview: str, file_path: str) -> int:
        try:
            cur = self.pool.execute(
                "INSERT INTO uploads (filename, ext, content_preview, file_path) VALUES (?, ?, ?, ?)",
                (filename, ext, preview[:1000], file_path)
            )
            return cur.lastrowid or 0
        except Exception as e:
            logger.error("save_document: %s", e)
            return 0

    def get_all(self) -> List[dict]:
        rows = self.pool.fetchall(
            "SELECT id, filename, ext, timestamp FROM uploads ORDER BY timestamp DESC"
        )
        return [dict(r) for r in rows]

    def get_by_id(self, doc_id: int) -> Optional[DocumentInfo]:
        row = self.pool.fetchone("SELECT * FROM uploads WHERE id = ?", (doc_id,))
        if row:
            return DocumentInfo(
                id=row["id"], filename=row["filename"], doc_type=row["ext"],
                content_preview=row["content_preview"], file_path=row["file_path"],
                uploaded_at=row["timestamp"]
            )
        return None

    def count(self) -> int:
        row = self.pool.fetchone("SELECT COUNT(*) as c FROM uploads")
        return row["c"] if row else 0

    # -- Sandbox runs --

    def log_sandbox_run(self, result: SandboxRunResult) -> int:
        try:
            cur = self.pool.execute(
                "INSERT INTO sandbox_runs (filename, exit_code, stdout, stderr, duration_ms) VALUES (?, ?, ?, ?, ?)",
                (result.filename, result.exit_code, result.stdout[:2000], result.stderr[:2000], result.duration_ms)
            )
            return cur.lastrowid or 0
        except Exception as e:
            logger.error("log_sandbox_run: %s", e)
            return 0

    def get_sandbox_runs(self, limit: int = 50) -> List[dict]:
        rows = self.pool.fetchall(
            "SELECT * FROM sandbox_runs ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in rows]
