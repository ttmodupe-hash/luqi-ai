"""Agent Mesh — Multi-agent orchestration topology.
Coordinates specialized agents for complex task decomposition.
"""

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set


@dataclass
class Agent:
    id: str
    name: str
    capability: str
    priority: int = 5
    status: str = "idle"  # idle, busy, offline
    last_ping: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Task:
    id: str
    description: str
    required_capability: str
    priority: int = 5
    status: str = "pending"  # pending, assigned, running, completed, failed
    assigned_to: Optional[str] = None
    result: Any = None
    error: Optional[str] = None


class AgentMesh:
    """Mesh topology for multi-agent coordination."""

    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}
        self.history: List[Dict] = []
        self._lock = asyncio.Lock()

    def register(self, name: str, capability: str, priority: int = 5) -> str:
        agent_id = str(uuid.uuid4())[:8]
        self.agents[agent_id] = Agent(
            id=agent_id,
            name=name,
            capability=capability,
            priority=priority,
        )
        return agent_id

    def deregister(self, agent_id: str) -> bool:
        if agent_id in self.agents:
            del self.agents[agent_id]
            return True
        return False

    def submit_task(self, description: str, required_capability: str, priority: int = 5) -> str:
        task_id = str(uuid.uuid4())[:8]
        self.tasks[task_id] = Task(
            id=task_id,
            description=description,
            required_capability=required_capability,
            priority=priority,
        )
        return task_id

    def assign_task(self, task_id: str, agent_id: str) -> bool:
        if task_id not in self.tasks or agent_id not in self.agents:
            return False
        task = self.tasks[task_id]
        agent = self.agents[agent_id]
        if agent.status == "offline":
            return False
        task.assigned_to = agent_id
        task.status = "assigned"
        agent.status = "busy"
        return True

    def complete_task(self, task_id: str, result: Any) -> bool:
        if task_id not in self.tasks:
            return False
        task = self.tasks[task_id]
        task.status = "completed"
        task.result = result
        if task.assigned_to and task.assigned_to in self.agents:
            self.agents[task.assigned_to].status = "idle"
        self.history.append({
            "task": task_id,
            "agent": task.assigned_to,
            "result": result,
        })
        return True

    def fail_task(self, task_id: str, error: str) -> bool:
        if task_id not in self.tasks:
            return False
        task = self.tasks[task_id]
        task.status = "failed"
        task.error = error
        if task.assigned_to and task.assigned_to in self.agents:
            self.agents[task.assigned_to].status = "idle"
        return True

    def find_best_agent(self, capability: str) -> Optional[str]:
        candidates = [
            a for a in self.agents.values()
            if a.capability == capability and a.status == "idle"
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda a: a.priority).id

    def auto_assign(self, task_id: str) -> bool:
        if task_id not in self.tasks:
            return False
        task = self.tasks[task_id]
        agent_id = self.find_best_agent(task.required_capability)
        if agent_id:
            return self.assign_task(task_id, agent_id)
        return False

    def get_status(self) -> Dict:
        return {
            "agents": {a.id: {"name": a.name, "capability": a.capability, "status": a.status}
                       for a in self.agents.values()},
            "tasks": {t.id: {"description": t.description, "status": t.status, "assigned_to": t.assigned_to}
                      for t in self.tasks.values()},
            "history_count": len(self.history),
        }

    def to_json(self) -> str:
        return json.dumps(self.get_status(), indent=2)


if __name__ == "__main__":
    mesh = AgentMesh()
    mesh.register("FinanceBot", "finance", priority=3)
    mesh.register("HealthBot", "health", priority=2)
    tid = mesh.submit_task("Calculate tax liability", "finance", priority=1)
    mesh.auto_assign(tid)
    print(mesh.to_json())
