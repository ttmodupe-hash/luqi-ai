"""Omega AI — Main entry point and orchestrator."""

import json
from typing import Dict, List

from core_brain import CoreBrain
from memory_manager import MemoryManager
from logger import Logger


class OmegaAI:
    """Omega AI v29.1.0 — Main orchestrator."""

    VERSION = "29.1.0"

    def __init__(self):
        self.brain = CoreBrain()
        self.memory = MemoryManager()
        self.logger = Logger()
        self.plugins = {}
        self.initialized = False

    def initialize(self):
        self.logger.info("Omega AI initializing...")
        self.brain.initialize()
        self.initialized = True
        self.logger.info(f"Omega AI v{self.VERSION} ready")
        return {"status": "initialized", "version": self.VERSION}

    def process(self, user_input: str, session_id: str = "default") -> Dict:
        if not self.initialized:
            self.initialize()
        self.memory.add_turn(session_id, "user", user_input)
        response = self.brain.process(user_input, session_id)
        self.memory.add_turn(session_id, "assistant", response)
        return {
            "input": user_input,
            "response": response,
            "session": session_id,
            "version": self.VERSION,
        }

    def register_plugin(self, name: str, plugin):
        self.plugins[name] = plugin
        self.logger.info(f"Plugin registered: {name}")

    def get_status(self) -> Dict:
        return {
            "version": self.VERSION,
            "initialized": self.initialized,
            "plugins_loaded": len(self.plugins),
            "active_sessions": len(self.memory.sessions),
        }

    def health_check(self) -> Dict:
        return {
            "status": "healthy",
            "brain": "active",
            "memory": "active",
            "logger": "active",
        }


if __name__ == "__main__":
    omega = OmegaAI()
    omega.initialize()
    print(json.dumps(omega.get_status(), indent=2))
    print(json.dumps(omega.process("Hello Omega!"), indent=2))
