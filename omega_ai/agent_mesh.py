"""Omega AI v3 — Agent Mesh
Agent-to-agent communication and task delegation between modules.
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Callable


class AgentMesh:
    """Lightweight message bus for inter-module communication."""

    def __init__(self) -> None:
        self.agents: dict[str, Callable] = {}
        self.messages: list[dict[str, Any]] = []
        self.max_messages = 1000

    def register(self, name: str, handler: Callable) -> None:
        """Register an agent handler."""
        self.agents[name] = handler

    def send(self, sender: str, recipient: str, task: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Send a message to another agent."""
        msg = {
            "id": str(uuid.uuid4())[:8],
            "sender": sender,
            "recipient": recipient,
            "task": task,
            "payload": payload or {},
            "timestamp": time.time(),
        }
        self.messages.append(msg)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

        if recipient in self.agents:
            try:
                result = self.agents[recipient](task, payload or {})
                return {"success": True, "result": result, "message_id": msg["id"]}
            except Exception as e:
                return {"success": False, "error": str(e), "message_id": msg["id"]}
        return {"success": False, "error": f"Agent '{recipient}' not registered", "message_id": msg["id"]}

    def broadcast(self, sender: str, task: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Broadcast a message to all registered agents."""
        results = {}
        for name in self.agents:
            if name != sender:
                results[name] = self.send(sender, name, task, payload)
        return {"success": True, "results": results}

    def get_messages(self, agent: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent messages, optionally filtered by agent."""
        msgs = self.messages[-limit:]
        if agent:
            msgs = [m for m in msgs if m["sender"] == agent or m["recipient"] == agent]
        return msgs

    def status(self) -> dict[str, Any]:
        return {
            "registered_agents": list(self.agents.keys()),
            "message_count": len(self.messages),
            "max_messages": self.max_messages,
        }
