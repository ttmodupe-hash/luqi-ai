"""
web_core.db.conversations - Conversation persistence.
Only chat messages — nothing else.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from web_core.db.connection import ConnectionPool
from web_core.models import ChatMessage

logger = logging.getLogger("luqi.db.conversations")


class ConversationStore:
    """CRUD for chat conversations."""

    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def save(self, role: str, content: str, session_id: str = "default",
             model: Optional[str] = None, tool_calls: Optional[str] = None) -> None:
        try:
            self.pool.execute(
                "INSERT INTO conversations (session_id, role, content, model, tool_calls) VALUES (?, ?, ?, ?, ?)",
                (session_id, role, content, model, tool_calls)
            )
        except Exception as e:
            logger.error("save_message: %s", e)

    def get_recent(self, session_id: str = "default", limit: int = 50) -> List[ChatMessage]:
        try:
            rows = self.pool.fetchall(
                "SELECT role, content, timestamp, model, session_id "
                "FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?",
                (session_id, limit)
            )
            messages = []
            for r in reversed(rows):
                messages.append(ChatMessage(
                    role=r["role"],
                    content=r["content"],
                    timestamp=r["timestamp"],
                    model=r["model"],
                    session_id=r["session_id"]
                ))
            return messages
        except Exception as e:
            logger.error("get_recent: %s", e)
            return []

    def get_all_sessions(self) -> List[dict]:
        rows = self.pool.fetchall(
            "SELECT session_id, COUNT(*) as msg_count, MAX(timestamp) as last_active "
            "FROM conversations GROUP BY session_id ORDER BY last_active DESC"
        )
        return [
            {"session_id": r["session_id"], "message_count": r["msg_count"], "last_active": r["last_active"]}
            for r in rows
        ]

    def clear_session(self, session_id: str) -> None:
        self.pool.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))

    def delete_session(self, session_id: str) -> None:
        self.clear_session(session_id)

    def count(self) -> int:
        row = self.pool.fetchone("SELECT COUNT(*) as c FROM conversations")
        return row["c"] if row else 0
