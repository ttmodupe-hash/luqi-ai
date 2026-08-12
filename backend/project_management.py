"""Project Management API for LUQI AI - v29.1.0"""
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["Project Management"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: int = 1
    status: str = "active"
    metadata: Optional[Dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    status: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]
    task_count: int = 0


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: int
    status: str = "pending"
    priority: str = "medium"
    assigned_to: Optional[int] = None
    due_date: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_id: int
    status: str
    priority: str
    assigned_to: Optional[int]
    due_date: Optional[str]
    created_at: str
    updated_at: str


# ─── In-Memory Store ─────────────────────────────────────────────────────────

_projects: Dict[int, ProjectResponse] = {}
_tasks: Dict[int, TaskResponse] = {}
_next_project_id = 1
_next_task_id = 1


# ─── Project Endpoints ───────────────────────────────────────────────────────

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    global _next_project_id
    project_id = _next_project_id
    _next_project_id += 1
    now = datetime.utcnow().isoformat()
    p = ProjectResponse(
        id=project_id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        status=project.status,
        created_at=now,
        updated_at=now,
        metadata=project.metadata or {},
    )
    _projects[project_id] = p
    return p


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """List projects with optional filtering."""
    items = list(_projects.values())
    if status:
        items = [p for p in items if p.status == status]
    if owner_id:
        items = [p for p in items if p.owner_id == owner_id]
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items[skip : skip + limit]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int):
    """Get a specific project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return _projects[project_id]


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, update: ProjectUpdate):
    """Update a project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    p = _projects[project_id]
    if update.name is not None:
        p.name = update.name
    if update.description is not None:
        p.description = update.description
    if update.status is not None:
        p.status = update.status
    if update.metadata is not None:
        p.metadata.update(update.metadata)
    p.updated_at = datetime.utcnow().isoformat()
    return p


@router.delete("/{project_id}")
async def delete_project(project_id: int):
    """Delete a project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects[project_id]
    # Remove associated tasks
    global _tasks
    _tasks = {k: v for k, v in _tasks.items() if v.project_id != project_id}
    return {"success": True}


# ─── Task Endpoints ─────────────────────────────────────────────────────────

@router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate):
    """Create a new task."""
    if task.project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    global _next_task_id
    task_id = _next_task_id
    _next_task_id += 1
    now = datetime.utcnow().isoformat()
    t = TaskResponse(
        id=task_id,
        title=task.title,
        description=task.description,
        project_id=task.project_id,
        status=task.status,
        priority=task.priority,
        assigned_to=task.assigned_to,
        due_date=task.due_date,
        created_at=now,
        updated_at=now,
    )
    _tasks[task_id] = t
    _projects[task.project_id].task_count += 1
    return t


@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
async def list_project_tasks(
    project_id: int,
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
):
    """List tasks for a project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = [t for t in _tasks.values() if t.project_id == project_id]
    if status:
        tasks = [t for t in tasks if t.status == status]
    if assigned_to:
        tasks = [t for t in tasks if t.assigned_to == assigned_to]
    return tasks


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int):
    """Get a specific task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return _tasks[task_id]


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, update: TaskCreate):
    """Update a task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    t = _tasks[task_id]
    t.title = update.title
    t.description = update.description
    t.status = update.status
    t.priority = update.priority
    t.assigned_to = update.assigned_to
    t.due_date = update.due_date
    t.updated_at = datetime.utcnow().isoformat()
    return t


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    """Delete a task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _tasks[task_id]
    if task.project_id in _projects:
        _projects[task.project_id].task_count -= 1
    del _tasks[task_id]
    return {"success": True}


# ─── Stats Endpoints ─────────────────────────────────────────────────────────

@router.get("/stats/overview")
async def project_stats():
    """Get project management statistics."""
    projects = list(_projects.values())
    tasks = list(_tasks.values())
    status_counts = {}
    for p in projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1
    task_status_counts = {}
    for t in tasks:
        task_status_counts[t.status] = task_status_counts.get(t.status, 0) + 1
    return {
        "total_projects": len(projects),
        "total_tasks": len(tasks),
        "project_status_breakdown": status_counts,
        "task_status_breakdown": task_status_counts,
        "avg_tasks_per_project": len(tasks) / len(projects) if projects else 0,
    }
