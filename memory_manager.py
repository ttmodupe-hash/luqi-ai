"""Memory Manager — Conversation and context memory management."""

import json
from typing import Dict, List


class MemoryManager:
    """Manages conversation memory and context."""

    def __init__(self, max_turns: int = 20):
        self.max_turns = max_turns
        self.sessions = {}

    def create_session(self, session_id: str) -> Dict:
        self.sessions[session_id] = {
            "turns": [],
            "context": {},
            "created": json.dumps("now"),
        }
        return self.sessions[session_id]

    def add_turn(self, session_id: str, role: str, content: str):
        if session_id not in self.sessions:
            self.create_session(session_id)
        self.sessions[session_id]["turns"].append({"role": role, "content": content})
        if len(self.sessions[session_id]["turns"]) > self.max_turns:
            self.sessions[session_id]["turns"] = self.sessions[session_id]["turns"][-self.max_turns:]

    def get_context(self, session_id: str) -> List[Dict]:
        return self.sessions.get(session_id, {}).get("turns", [])

    def set_context_var(self, session_id: str, key: str, value: any):
        if session_id not in self.sessions:
            self.create_session(session_id)
        self.sessions[session_id]["context"][key] = value

    def get_context_var(self, session_id: str, key: str):
        return self.sessions.get(session_id, {}).get("context", {}).get(key)

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id]["turns"] = []
            self.sessions[session_id]["context"] = {}

    def summarize(self, session_id: str) -> str:
        turns = self.get_context(session_id)
        if not turns:
            return "No conversation history"
        return f"Session has {len(turns)} turns. Last message: {turns[-1]['content'][:100]}..."


if __name__ == "__main__":
    mm = MemoryManager()
    mm.add_turn("sess1", "user", "Hello")
    mm.add_turn("sess1", "assistant", "Hi there!")
    mm.set_context_var("sess1", "topic", "greeting")
    print(json.dumps(mm.get_context("sess1"), indent=2))
    print(mm.summarize("sess1"))
