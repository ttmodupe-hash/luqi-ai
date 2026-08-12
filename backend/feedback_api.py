"""Feedback API for LUQI AI"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/feedback", tags=["Feedback"])


class FeedbackCreate(BaseModel):
    feedback_type: str  # 'bug', 'feature', 'praise', 'other'
    title: str
    description: str
    rating: Optional[int] = None  # 1-5
    screenshot_url: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    feedback_type: str
    title: str
    description: str
    rating: Optional[int]
    screenshot_url: Optional[str]
    status: str  # 'open', 'in_progress', 'resolved', 'closed'
    created_at: str
    updated_at: str


# In-memory store
_feedback_store = {}
_next_feedback_id = 1


@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackCreate, req: Request):
    """Submit new feedback."""
    global _next_feedback_id
    fb_id = _next_feedback_id
    _next_feedback_id += 1
    now = datetime.utcnow().isoformat()
    fb = {
        "id": fb_id,
        "user_id": 1,  # TODO: from auth
        "feedback_type": request.feedback_type,
        "title": request.title,
        "description": request.description,
        "rating": request.rating,
        "screenshot_url": request.screenshot_url,
        "status": "open",
        "created_at": now,
        "updated_at": now,
    }
    _feedback_store[fb_id] = fb
    return fb


@router.get("/", response_model=List[FeedbackResponse])
async def list_feedback(
    feedback_type: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
):
    """List feedback with optional filtering."""
    items = list(_feedback_store.values())
    if feedback_type:
        items = [i for i in items if i["feedback_type"] == feedback_type]
    if status:
        items = [i for i in items if i["status"] == status]
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[skip : skip + limit]


@router.get("/{fb_id}", response_model=FeedbackResponse)
async def get_feedback(fb_id: int):
    """Get a specific feedback item."""
    if fb_id not in _feedback_store:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return _feedback_store[fb_id]


@router.put("/{fb_id}/status")
async def update_feedback_status(fb_id: int, status: str):
    """Update feedback status (admin only)."""
    if fb_id not in _feedback_store:
        raise HTTPException(status_code=404, detail="Feedback not found")
    if status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    _feedback_store[fb_id]["status"] = status
    _feedback_store[fb_id]["updated_at"] = datetime.utcnow().isoformat()
    return {"success": True, "status": status}


@router.delete("/{fb_id}")
async def delete_feedback(fb_id: int):
    """Delete feedback (admin only)."""
    if fb_id not in _feedback_store:
        raise HTTPException(status_code=404, detail="Feedback not found")
    del _feedback_store[fb_id]
    return {"success": True}
