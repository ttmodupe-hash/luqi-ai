"""Digital Workspace API for LUQI AI - v29.1.0"""
import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel

router = APIRouter(prefix="/workspace", tags=["Digital Workspace"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class WorkspaceItem(BaseModel):
    id: int
    title: str
    item_type: str  # 'document', 'spreadsheet', 'presentation', 'whiteboard', 'folder'
    content: Optional[str] = None
    parent_id: Optional[int] = None
    owner_id: int
    collaborators: List[int] = []
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = {}


class CreateItemRequest(BaseModel):
    title: str
    item_type: str
    content: Optional[str] = None
    parent_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class UpdateItemRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ─── In-Memory Store (replace with DB in production) ─────────────────────────

_workspace_store: Dict[int, WorkspaceItem] = {}
_next_id = 1
_store_lock = asyncio.Lock()


async def _get_next_id() -> int:
    global _next_id
    async with _store_lock:
        id = _next_id
        _next_id += 1
        return id


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/items", response_model=WorkspaceItem)
async def create_item(request: CreateItemRequest, req: Request):
    """Create a new workspace item."""
    item_id = await _get_next_id()
    now = datetime.utcnow()
    item = WorkspaceItem(
        id=item_id,
        title=request.title,
        item_type=request.item_type,
        content=request.content or "",
        parent_id=request.parent_id,
        owner_id=1,  # TODO: from auth
        collaborators=[],
        created_at=now,
        updated_at=now,
        metadata=request.metadata or {},
    )
    async with _store_lock:
        _workspace_store[item_id] = item
    return item


@router.get("/items", response_model=List[WorkspaceItem])
async def list_items(
    item_type: Optional[str] = Query(None),
    parent_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """List workspace items with optional filtering."""
    items = list(_workspace_store.values())
    if item_type:
        items = [i for i in items if i.item_type == item_type]
    if parent_id is not None:
        items = [i for i in items if i.parent_id == parent_id]
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items[skip : skip + limit]


@router.get("/items/{item_id}", response_model=WorkspaceItem)
async def get_item(item_id: int):
    """Get a specific workspace item."""
    item = _workspace_store.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=WorkspaceItem)
async def update_item(item_id: int, request: UpdateItemRequest):
    """Update a workspace item."""
    async with _store_lock:
        item = _workspace_store.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if request.title is not None:
            item.title = request.title
        if request.content is not None:
            item.content = request.content
        if request.metadata is not None:
            item.metadata.update(request.metadata)
        item.updated_at = datetime.utcnow()
    return item


@router.delete("/items/{item_id}")
async def delete_item(item_id: int):
    """Delete a workspace item."""
    async with _store_lock:
        if item_id not in _workspace_store:
            raise HTTPException(status_code=404, detail="Item not found")
        del _workspace_store[item_id]
    return {"success": True, "message": "Item deleted"}


@router.post("/items/{item_id}/share")
async def share_item(item_id: int, user_id: int):
    """Share an item with a user."""
    async with _store_lock:
        item = _workspace_store.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        if user_id not in item.collaborators:
            item.collaborators.append(user_id)
    return {"success": True, "message": f"Shared with user {user_id}"}


@router.get("/items/{item_id}/tree")
async def get_item_tree(item_id: int):
    """Get the full tree structure for a folder item."""
    item = _workspace_store.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    def build_tree(parent_id: Optional[int]) -> List[Dict]:
        children = [i for i in _workspace_store.values() if i.parent_id == parent_id]
        return [
            {
                "id": c.id,
                "title": c.title,
                "item_type": c.item_type,
                "children": build_tree(c.id) if c.item_type == "folder" else [],
            }
            for c in children
        ]
    
    return {
        "id": item.id,
        "title": item.title,
        "item_type": item.item_type,
        "children": build_tree(item_id),
    }


@router.post("/items/{item_id}/duplicate")
async def duplicate_item(item_id: int):
    """Duplicate a workspace item."""
    item = _workspace_store.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    new_id = await _get_next_id()
    new_item = WorkspaceItem(
        id=new_id,
        title=f"{item.title} (Copy)",
        item_type=item.item_type,
        content=item.content,
        parent_id=item.parent_id,
        owner_id=item.owner_id,
        collaborators=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        metadata=item.metadata.copy(),
    )
    async with _store_lock:
        _workspace_store[new_id] = new_item
    return new_item


@router.get("/search")
async def search_items(q: str = Query(..., min_length=1)):
    """Search workspace items by title or content."""
    results = []
    q_lower = q.lower()
    for item in _workspace_store.values():
        if q_lower in item.title.lower() or q_lower in (item.content or "").lower():
            results.append(item)
    results.sort(key=lambda x: x.updated_at, reverse=True)
    return {"query": q, "results": results, "count": len(results)}


@router.get("/stats")
async def workspace_stats():
    """Get workspace statistics."""
    items = list(_workspace_store.values())
    type_counts = {}
    for item in items:
        type_counts[item.item_type] = type_counts.get(item.item_type, 0) + 1
    return {
        "total_items": len(items),
        "type_breakdown": type_counts,
        "total_collaborators": sum(len(i.collaborators) for i in items),
    }
