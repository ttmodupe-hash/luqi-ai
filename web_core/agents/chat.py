"""
web_core.agents.chat - Chat orchestration.
Handles message history, AI model calling, and tool execution.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from web_core.db.conversations import ConversationStore
from web_core.models import ChatMessage

logger = logging.getLogger("luqi.agents.chat")


class ChatAgent:
    """Orchestrates conversations with AI backends."""

    def __init__(self, store: ConversationStore):
        self.store = store
        self.client = None
        self._init_client()

    def _init_client(self):
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if api_key:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                logger.warning("OpenAI init failed: %s", e)

    @property
    def ai_available(self) -> bool:
        return self.client is not None

    async def chat(self, message: str, session_id: str = "default",
                   model: str = "gpt-4o-mini") -> Dict[str, Any]:
        """Process a chat message and return the AI response."""
        self.store.save("user", message, session_id)

        if not self.client:
            reply = (
                "LUQI is running in offline mode. AI features require OPENAI_API_KEY. "
                "I can still: search the web, parse documents, and run tools."
            )
            self.store.save("assistant", reply, session_id, "offline")
            return {"reply": reply, "model": "offline", "tools_used": []}

        try:
            history = self.store.get_recent(session_id, limit=20)
            messages = [{"role": h.role, "content": h.content} for h in history]

            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=4000,
            )
            reply = response.choices[0].message.content or ""
            self.store.save("assistant", reply, session_id, model)
            return {"reply": reply, "model": model, "tools_used": []}

        except Exception as e:
            logger.error("Chat error: %s", e)
            reply = f"I encountered an error: {e}. Let me try a simpler approach."
            self.store.save("assistant", reply, session_id, "error")
            return {"reply": reply, "model": "error", "tools_used": []}

    def get_history(self, session_id: str, limit: int = 50) -> List[ChatMessage]:
        return self.store.get_recent(session_id, limit)

    def clear_session(self, session_id: str):
        self.store.clear_session(session_id)
