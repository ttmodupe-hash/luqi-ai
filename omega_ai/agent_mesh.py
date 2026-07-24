#!/usr/bin/env python3
"""
Omega AI Agent Mesh - Distributed Agent Network
Enables multiple AI agents to collaborate and share knowledge.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class AgentNode:
    """Represents an agent in the mesh network."""
    agent_id: str
    name: str
    capabilities: List[str]
    status: str = "active"
    last_seen: Optional[str] = None

class AgentMesh:
    """Manages a network of collaborating AI agents."""
    
    def __init__(self):
        self.agents: Dict[str, AgentNode] = {}
        self.message_queue: List[Dict[str, Any]] = []
        logger.info("Agent Mesh initialized")
    
    def register_agent(self, agent_id: str, name: str, capabilities: List[str]) -> bool:
        """Register a new agent in the mesh."""
        if agent_id in self.agents:
            logger.warning(f"Agent {agent_id} already registered")
            return False
        
        self.agents[agent_id] = AgentNode(
            agent_id=agent_id,
            name=name,
            capabilities=capabilities
        )
        logger.info(f"Agent {name} ({agent_id}) registered")
        return True
    
    def unregister_agent(self, agent_id: str) -> bool:
        """Remove an agent from the mesh."""
        if agent_id not in self.agents:
            return False
        del self.agents[agent_id]
        logger.info(f"Agent {agent_id} unregistered")
        return True
    
    def get_agent(self, agent_id: str) -> Optional[AgentNode]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents."""
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "capabilities": agent.capabilities,
                "status": agent.status
            }
            for agent in self.agents.values()
        ]
    
    def find_agents_by_capability(self, capability: str) -> List[AgentNode]:
        """Find agents with a specific capability."""
        return [
            agent for agent in self.agents.values()
            if capability in agent.capabilities
        ]
    
    def broadcast(self, message: Dict[str, Any]) -> int:
        """Broadcast a message to all agents."""
        self.message_queue.append(message)
        return len(self.agents)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get mesh statistics."""
        return {
            "total_agents": len(self.agents),
            "active_agents": sum(1 for a in self.agents.values() if a.status == "active"),
            "total_messages": len(self.message_queue),
            "agents": self.list_agents()
        }
