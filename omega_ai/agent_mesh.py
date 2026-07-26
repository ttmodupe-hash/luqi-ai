"""AgentMesh — Multi-agent task delegation system.

Manages a registry of specialised agents and a queue of tasks. Tasks are
matched to the best-fitting agent based on required capabilities.

Usage::

    >>> from omega_ai.agent_mesh import AgentMesh
    >>> mesh = AgentMesh()          # pre-seeded with 5 default agents
    >>> mesh.delegate_task("Write a Python decorator tutorial",
    ...                    required_capabilities=["coding", "teaching"])
    {"task_id": "t-abc123", "assigned_to": "agent-code-writer", "status": "delegated"}
"""

from __future__ import annotations

import time
import uuid
from typing import Any


class AgentMesh:
    """Multi-agent task delegation and management system.

    The mesh maintains a registry of *agents* (each with a unique role and
    capability list) and a history of *tasks*.  When a task is delegated the
    system scores every available agent by overlap with the task's required
    capabilities and assigns the task to the best match.

    Attributes
    ----------
    agents : dict[str, dict[str, Any]]
        Mapping of ``agent_id -> agent metadata``.
    tasks : list[dict[str, Any]]
        Chronological list of all tasks (pending and completed).
    """

    def __init__(self) -> None:
        """Initialise the AgentMesh and seed it with 5 default agents."""
        self.agents: dict[str, dict[str, Any]] = {}
        self.tasks: list[dict[str, Any]] = []
        self._seed_default_agents()

    # ------------------------------------------------------------------
    # Public API — Agents
    # ------------------------------------------------------------------

    def list_agents(self) -> list[dict[str, Any]]:
        """Return a list of all registered agents.

        Returns
        -------
        list[dict]
            Each dict contains:
            ::

                {
                    "id": str,
                    "name": str,
                    "role": str,
                    "status": str,
                    "capabilities": list[str]
                }
        """
        result = []
        for agent_id, meta in self.agents.items():
            result.append({
                "id": agent_id,
                "name": meta["name"],
                "role": meta["role"],
                "status": meta.get("status", "idle"),
                "capabilities": meta.get("capabilities", []),
            })
        return result

    def register_agent(
        self,
        name: str,
        role: str,
        capabilities: list[str],
    ) -> dict[str, Any]:
        """Register a new agent in the mesh.

        Parameters
        ----------
        name : str
            Human-readable agent name.
        role : str
            Short descriptor of the agent's primary function.
        capabilities : list[str]
            Tags describing what the agent can do (e.g. ``["research", "writing"]``).

        Returns
        -------
        dict
            ::

                {
                    "agent_id": str,
                    "name": str,
                    "role": str,
                    "capabilities": list[str],
                    "status": "registered"
                }
        """
        agent_id = f"agent-{name.lower().replace(' ', '-')}"
        self.agents[agent_id] = {
            "name": name,
            "role": role,
            "capabilities": list(capabilities),
            "status": "idle",
            "registered_at": time.time(),
        }
        return {
            "agent_id": agent_id,
            "name": name,
            "role": role,
            "capabilities": list(capabilities),
            "status": "registered",
        }

    # ------------------------------------------------------------------
    # Public API — Tasks
    # ------------------------------------------------------------------

    def list_tasks(self, agent_id: str | None = None) -> list[dict[str, Any]]:
        """List tasks, optionally filtered by assigned agent.

        Parameters
        ----------
        agent_id : str, optional
            If provided, only tasks assigned to this agent are returned.

        Returns
        -------
        list[dict]
            Each dict contains:
            ::

                {
                    "id": str,
                    "description": str,
                    "status": str,
                    "assigned_to": str | None,
                    "created_at": float,
                    "completed_at": float | None,
                    "result": str | None
                }
        """
        result = []
        for task in self.tasks:
            if agent_id is not None and task.get("assigned_to") != agent_id:
                continue
            result.append({
                "id": task["id"],
                "description": task["description"],
                "status": task["status"],
                "assigned_to": task.get("assigned_to"),
                "created_at": task.get("created_at"),
                "completed_at": task.get("completed_at"),
                "result": task.get("result"),
            })
        return result

    def delegate_task(
        self,
        description: str,
        required_capabilities: list[str],
    ) -> dict[str, Any]:
        """Delegate a task to the best-matching agent.

        Scoring algorithm:

        1. Count how many *required_capabilities* each agent possesses.
        2. Break ties by total capability count (fewer = more specialised).
        3. If no agent matches any capability the task is left *unassigned*.

        Parameters
        ----------
        description : str
            Human-readable task description.
        required_capabilities : list[str]
            Capabilities the task demands.

        Returns
        -------
        dict
            ::

                {
                    "task_id": str,
                    "assigned_to": str | None,
                    "status": "delegated" | "unassigned"
                }
        """
        if not self.agents:
            task_id = f"t-{uuid.uuid4().hex[:8]}"
            self.tasks.append({
                "id": task_id,
                "description": description,
                "status": "unassigned",
                "assigned_to": None,
                "required_capabilities": list(required_capabilities),
                "created_at": time.time(),
                "completed_at": None,
                "result": None,
            })
            return {
                "task_id": task_id,
                "assigned_to": None,
                "status": "unassigned",
                "reason": "No agents registered.",
            }

        best_agent: str | None = None
        best_score: float = -1.0

        required_set = set(c.lower() for c in required_capabilities)

        for agent_id, meta in self.agents.items():
            agent_caps = set(c.lower() for c in meta.get("capabilities", []))
            overlap = len(required_set & agent_caps)
            total_caps = len(agent_caps)

            # Score: primary = overlap count, tie-breaker = fewer total caps (specialist)
            score = overlap - (total_caps * 0.01)

            if score > best_score:
                best_score = score
                best_agent = agent_id

        task_id = f"t-{uuid.uuid4().hex[:8]}"

        if best_agent is None or best_score <= 0:
            self.tasks.append({
                "id": task_id,
                "description": description,
                "status": "unassigned",
                "assigned_to": None,
                "required_capabilities": list(required_capabilities),
                "created_at": time.time(),
                "completed_at": None,
                "result": None,
            })
            return {
                "task_id": task_id,
                "assigned_to": None,
                "status": "unassigned",
                "reason": "No agent matched the required capabilities.",
            }

        # Update agent status
        self.agents[best_agent]["status"] = "busy"

        self.tasks.append({
            "id": task_id,
            "description": description,
            "status": "delegated",
            "assigned_to": best_agent,
            "required_capabilities": list(required_capabilities),
            "created_at": time.time(),
            "completed_at": None,
            "result": None,
        })

        return {
            "task_id": task_id,
            "assigned_to": best_agent,
            "status": "delegated",
        }

    def complete_task(self, task_id: str, result: str) -> dict[str, Any]:
        """Mark a task as complete and free the assigned agent.

        Parameters
        ----------
        task_id : str
            The ID of the task to complete.
        result : str
            The completion result / output.

        Returns
        -------
        dict
            ::

                {
                    "task_id": str,
                    "status": "completed" | "not_found",
                    "assigned_to": str | None,
                    "result": str | None
                }
        """
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "completed"
                task["result"] = result
                task["completed_at"] = time.time()
                agent_id = task.get("assigned_to")

                # Free the agent
                if agent_id and agent_id in self.agents:
                    self.agents[agent_id]["status"] = "idle"

                return {
                    "task_id": task_id,
                    "status": "completed",
                    "assigned_to": agent_id,
                    "result": result,
                }

        return {
            "task_id": task_id,
            "status": "not_found",
            "assigned_to": None,
            "result": None,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _seed_default_agents(self) -> None:
        """Pre-seed the mesh with 5 default specialised agents."""
        defaults = [
            {
                "name": "Researcher",
                "role": "Information gathering and fact-finding",
                "capabilities": [
                    "research",
                    "data-collection",
                    "fact-checking",
                    "summarisation",
                    "web-search",
                ],
            },
            {
                "name": "CodeWriter",
                "role": "Software development and code generation",
                "capabilities": [
                    "coding",
                    "debugging",
                    "refactoring",
                    "testing",
                    "code-review",
                ],
            },
            {
                "name": "Analyst",
                "role": "Data analysis and pattern recognition",
                "capabilities": [
                    "analysis",
                    "statistics",
                    "pattern-recognition",
                    "forecasting",
                    "visualisation",
                ],
            },
            {
                "name": "Teacher",
                "role": "Educational content creation and tutoring",
                "capabilities": [
                    "teaching",
                    "curriculum-design",
                    "explanation",
                    "assessment",
                    "simplification",
                ],
            },
            {
                "name": "Translator",
                "role": "Language translation and localisation",
                "capabilities": [
                    "translation",
                    "localisation",
                    "language-detection",
                    "proofreading",
                    "cultural-adaptation",
                ],
            },
        ]

        for agent_def in defaults:
            self.register_agent(
                name=agent_def["name"],
                role=agent_def["role"],
                capabilities=agent_def["capabilities"],
            )
