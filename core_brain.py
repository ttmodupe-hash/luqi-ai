"""Core Brain — Central intelligence orchestrator."""

import json
from typing import Any, Dict, List

from agent_mesh import AgentMesh
from ai_brain import AIBrain
from knowledge_base import KnowledgeBase
from memory_manager import MemoryManager


class CoreBrain:
    """Central orchestrator for all Omega AI capabilities."""

    def __init__(self):
        self.ai = AIBrain()
        self.memory = MemoryManager()
        self.knowledge = KnowledgeBase()
        self.mesh = AgentMesh()
        self.version = "29.1.0"
        self.status = "ready"

    def process(self, query: str, context: Dict = None) -> Dict:
        """Process a user query through the full pipeline."""
        context = context or {}

        # 1. Check memory for previous context
        mem = self.memory.recall(query)

        # 2. Query knowledge base
        kb_results = self.knowledge.query(query)

        # 3. Use AI brain for reasoning
        ai_response = self.ai.think(query, context=json.dumps({"memory": mem, "kb": kb_results}))

        # 4. Store in memory
        self.memory.store(query, ai_response)

        return {
            "query": query,
            "response": ai_response,
            "memory_used": mem is not None,
            "kb_results": kb_results,
            "version": self.version,
        }

    def register_agent(self, name: str, capability: str) -> str:
        return self.mesh.register(name, capability)

    def get_status(self) -> Dict:
        return {
            "version": self.version,
            "status": self.status,
            "agents": len(self.mesh.agents),
            "memory_entries": len(self.memory._store),
            "kb_entries": len(self.knowledge._store),
        }


if __name__ == "__main__":
    brain = CoreBrain()
    print(json.dumps(brain.get_status(), indent=2))
    result = brain.process("What is the weather in Johannesburg?")
    print(json.dumps(result, indent=2))
