"""Luqi Unified - Unified API and orchestration layer for LUQI AI v29.1.0"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.luqi_agent import luqi_agent, LuqiAgent
from backend.search_engine import search as search_engine
from backend.cache import cache

router = APIRouter(prefix="/unified", tags=["Unified API"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class UnifiedQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    max_results: int = 10


class UnifiedResponse(BaseModel):
    query: str
    response_type: str  # 'direct', 'search', 'agent', 'error'
    content: Any
    sources: List[Dict[str, Any]] = []
    confidence: float
    processing_time_ms: int
    timestamp: str


class AgentTaskRequest(BaseModel):
    description: str
    tools: List[str] = []
    timeout_seconds: int = 60


# ─── Query Router ─────────────────────────────────────────────────────────────

@router.post("/query")
async def unified_query(request: UnifiedQuery):
    """Process a unified query - routes to search, agent, or direct response."""
    start_time = __import__('time').time()
    
    # Check cache first
    cache_key = f"unified_query:{hash(request.query)}"
    cached = await cache.get(cache_key)
    if cached:
        return UnifiedResponse(**cached)
    
    # Determine query type and route
    query_lower = request.query.lower()
    
    # Search queries
    search_keywords = ["search", "find", "look up", "where", "what is", "who is", "how to"]
    if any(kw in query_lower for kw in search_keywords):
        response = await _handle_search_query(request)
    # Agent tasks
    elif any(kw in query_lower for kw in ["do", "run", "execute", "task", "help me"]):
        response = await _handle_agent_query(request)
    # Direct response
    else:
        response = await _handle_direct_query(request)
    
    processing_time = int((__import__('time').time() - start_time) * 1000)
    response.processing_time_ms = processing_time
    
    # Cache result
    await cache.set(cache_key, response.dict(), ttl=300)
    
    return response


async def _handle_search_query(request: UnifiedQuery) -> UnifiedResponse:
    """Handle search-based queries."""
    results = await search_engine(request.query, limit=request.max_results)
    return UnifiedResponse(
        query=request.query,
        response_type="search",
        content={"results": results},
        sources=[{"type": "search", "count": len(results)}],
        confidence=0.85,
        processing_time_ms=0,
        timestamp=datetime.utcnow().isoformat(),
    )


async def _handle_agent_query(request: UnifiedQuery) -> UnifiedResponse:
    """Handle agent-based queries."""
    task = await luqi_agent.create_task(request.query)
    completed_task = await luqi_agent.run_task(task.id)
    
    return UnifiedResponse(
        query=request.query,
        response_type="agent",
        content={
            "task_id": completed_task.id,
            "status": completed_task.status,
            "result": completed_task.result,
            "error": completed_task.error,
        },
        sources=[{"type": "agent", "agent_id": luqi_agent.agent_id}],
        confidence=0.9 if completed_task.status == "completed" else 0.5,
        processing_time_ms=0,
        timestamp=datetime.utcnow().isoformat(),
    )


async def _handle_direct_query(request: UnifiedQuery) -> UnifiedResponse:
    """Handle direct response queries."""
    response_text = await luqi_agent.chat(request.query, request.context)
    
    return UnifiedResponse(
        query=request.query,
        response_type="direct",
        content={"text": response_text},
        sources=[{"type": "llm", "model": luqi_agent.model}],
        confidence=0.75,
        processing_time_ms=0,
        timestamp=datetime.utcnow().isoformat(),
    )


# ─── Agent Task Endpoints ────────────────────────────────────────────────────

@router.post("/agent/task")
async def create_agent_task(request: AgentTaskRequest):
    """Create a new agent task."""
    task = await luqi_agent.create_task(request.description)
    return {
        "task_id": task.id,
        "status": task.status,
        "description": task.description,
        "created_at": task.created_at,
    }


@router.post("/agent/task/{task_id}/run")
async def run_agent_task(task_id: str):
    """Run a pending agent task."""
    task = await luqi_agent.run_task(task_id)
    return {
        "task_id": task.id,
        "status": task.status,
        "result": task.result,
        "error": task.error,
        "completed_at": task.completed_at,
    }


@router.get("/agent/task/{task_id}")
async def get_agent_task(task_id: str):
    """Get task status."""
    task = luqi_agent.get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "task_id": task.id,
        "status": task.status,
        "description": task.description,
        "result": task.result,
        "error": task.error,
    }


@router.get("/agent/tasks")
async def list_agent_tasks(status: str = None):
    """List all agent tasks."""
    tasks = luqi_agent.list_tasks(status)
    return [
        {
            "task_id": t.id,
            "status": t.status,
            "description": t.description,
            "created_at": t.created_at,
        }
        for t in tasks
    ]


# ─── Memory Endpoints ─────────────────────────────────────────────────────────

@router.get("/agent/memory")
async def get_agent_memory(limit: int = 10):
    """Get agent memory."""
    memory = luqi_agent.get_memory(limit)
    return [
        {
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp,
        }
        for m in memory
    ]


@router.delete("/agent/memory")
async def clear_agent_memory():
    """Clear agent memory."""
    luqi_agent.clear_memory()
    return {"success": True}


# ─── Tools Endpoints ─────────────────────────────────────────────────────────

@router.get("/agent/tools")
async def list_agent_tools():
    """List available agent tools."""
    return {
        "tools": [
            {"name": name, "description": func.__doc__ or "No description"}
            for name, func in luqi_agent.tools.items()
        ]
    }


@router.post("/agent/tools/{tool_name}")
async def execute_agent_tool(tool_name: str, params: Dict[str, Any]):
    """Execute an agent tool."""
    try:
        result = await luqi_agent.execute_tool(tool_name, **params)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Stats Endpoints ─────────────────────────────────────────────────────────

@router.get("/stats")
async def unified_stats():
    """Get unified API statistics."""
    return {
        "agent": luqi_agent.to_dict(),
        "cache_status": "active",
        "version": "29.1.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
