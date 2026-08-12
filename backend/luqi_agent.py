"""Luqi Agent - Core AI Agent for LUQI AI v29.1.0"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class AgentMessage:
    role: str  # 'system', 'user', 'assistant', 'tool'
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class AgentTask:
    id: str
    description: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    result: Any = None
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None


class LuqiAgent:
    """Core AI agent with tool use, memory, and task management."""

    def __init__(self, agent_id: str = "luqi-agent-001", model: str = "gpt-4"):
        self.agent_id = agent_id
        self.model = model
        self.memory: List[AgentMessage] = []
        self.tasks: Dict[str, AgentTask] = {}
        self.tools: Dict[str, Callable] = {}
        self._task_counter = 0
        self._lock = asyncio.Lock()

    def register_tool(self, name: str, func: Callable):
        """Register a tool function."""
        self.tools[name] = func

    async def create_task(self, description: str) -> AgentTask:
        """Create a new task."""
        async with self._lock:
            self._task_counter += 1
            task_id = f"task_{self.agent_id}_{self._task_counter:04d}"
            task = AgentTask(id=task_id, description=description, status="pending")
            self.tasks[task_id] = task
            return task

    async def run_task(self, task_id: str) -> AgentTask:
        """Execute a task."""
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        task.status = "running"
        try:
            # Parse task description for tool calls
            result = await self._execute_intent(task.description)
            task.result = result
            task.status = "completed"
            task.completed_at = datetime.utcnow().isoformat()
        except Exception as e:
            task.error = str(e)
            task.status = "failed"
            task.completed_at = datetime.utcnow().isoformat()
        
        return task

    async def _execute_intent(self, intent: str) -> Any:
        """Parse and execute user intent."""
        # Simple intent parsing - in production, use LLM for intent classification
        intent_lower = intent.lower()
        
        # Check for tool calls
        for tool_name, tool_func in self.tools.items():
            if tool_name.lower() in intent_lower:
                return await tool_func(intent)
        
        # Default: return a helpful response
        return {
            "type": "text_response",
            "content": f"I received your request: '{intent}'. I'm working on it!",
        }

    async def chat(self, message: str, context: Dict[str, Any] = None) -> str:
        """Process a chat message and return a response."""
        # Add user message to memory
        self.memory.append(AgentMessage(role="user", content=message))
        
        # Generate response (placeholder - would use actual LLM)
        response = await self._generate_response(message, context)
        
        # Add assistant response to memory
        self.memory.append(AgentMessage(role="assistant", content=response))
        
        # Trim memory if too long
        if len(self.memory) > 100:
            self.memory = self.memory[-100:]
        
        return response

    async def _generate_response(self, message: str, context: Dict[str, Any] = None) -> str:
        """Generate a response using the configured model."""
        # Placeholder - in production, this would call an LLM API
        responses = [
            "I understand. Let me help you with that.",
            "That's an interesting question. Here's what I think...",
            "I can assist with that. Let me process your request.",
            "Great question! Here's my analysis...",
        ]
        import random
        return random.choice(responses)

    def get_memory(self, limit: int = 10) -> List[AgentMessage]:
        """Get recent memory."""
        return self.memory[-limit:]

    def clear_memory(self):
        """Clear agent memory."""
        self.memory.clear()

    def get_task_status(self, task_id: str) -> Optional[AgentTask]:
        """Get task status."""
        return self.tasks.get(task_id)

    def list_tasks(self, status: str = None) -> List[AgentTask]:
        """List all tasks, optionally filtered by status."""
        tasks = list(self.tasks.values())
        if status:
            tasks = [t for t in tasks if t.status == status]
        return tasks

    async def execute_tool(self, tool_name: str, **kwargs) -> Any:
        """Execute a registered tool."""
        if tool_name not in self.tools:
            raise ValueError(f"Tool '{tool_name}' not found")
        return await self.tools[tool_name](**kwargs)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize agent state."""
        return {
            "agent_id": self.agent_id,
            "model": self.model,
            "memory_count": len(self.memory),
            "task_count": len(self.tasks),
            "tool_count": len(self.tools),
            "tasks": [
                {
                    "id": t.id,
                    "description": t.description,
                    "status": t.status,
                    "error": t.error,
                }
                for t in self.tasks.values()
            ],
        }


# ─── Pre-built Tools ─────────────────────────────────────────────────────────

async def search_tool(query: str) -> Dict[str, Any]:
    """Search tool implementation."""
    return {"type": "search", "query": query, "results": []}


async def calculator_tool(expression: str) -> Dict[str, Any]:
    """Calculator tool implementation."""
    try:
        # Safe eval - only allow basic math
        allowed = {"__builtins__": {}}
        result = eval(expression, allowed, {"abs": abs, "round": round, "max": max, "min": min})
        return {"type": "calculation", "expression": expression, "result": result}
    except Exception as e:
        return {"type": "calculation", "expression": expression, "error": str(e)}


async def weather_tool(location: str) -> Dict[str, Any]:
    """Weather tool implementation."""
    return {"type": "weather", "location": location, "temperature": "22°C", "condition": "sunny"}


# Create default agent instance
luqi_agent = LuqiAgent()
luqi_agent.register_tool("search", search_tool)
luqi_agent.register_tool("calculate", calculator_tool)
luqi_agent.register_tool("weather", weather_tool)
