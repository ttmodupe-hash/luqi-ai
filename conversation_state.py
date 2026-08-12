"""Conversation State — Persistent conversation context management."""

import json
import time
from typing import Any, Dict, List, Optional


class ConversationState:
    """Manages conversation context and state across sessions."""

    def __init__(self, session_id: str = None):
        self.session_id = session_id or f"sess_{int(time.time())}"
        self.turns: List[Dict] = []
        self.context: Dict[str, Any] = {}
        self.created_at = time.time()
        self.last_active = time.time()

    def add_turn(self, role: str, content: str, metadata: Dict = None):
        self.turns.append({
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {},
        })
        self.last_active = time.time()

    def get_context(self, key: str, default: Any = None) -> Any:
        return self.context.get(key, default)

    def set_context(self, key: str, value: Any):
        self.context[key] = value
        self.last_active = time.time()

    def get_history(self, limit: int = 10) -> List[Dict]:
        return self.turns[-limit:]

    def to_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "turns": self.turns,
            "context": self.context,
            "created_at": self.created_at,
            "last_active": self.last_active,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: Dict) -> "ConversationState":
        state = cls(data.get("session_id"))
        state.turns = data.get("turns", [])
        state.context = data.get("context", {})
        state.created_at = data.get("created_at", time.time())
        state.last_active = data.get("last_active", time.time())
        return state


if __name__ == "__main__":
    state = ConversationState()
    state.add_turn("user", "Hello")
    state.add_turn("assistant", "Hi there!")
    state.set_context("topic", "greeting")
    print(state.to_json())
