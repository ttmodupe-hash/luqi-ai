"""
LUQI AI — Favorites API
========================
Simple favorites/bookmarks for capabilities.
Stores user's frequently used capability shortcuts.

v29.0.0 — Part of The Big Four release
"""
from __future__ import annotations
import json
import time
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v25", tags=["favorites"])

# In-memory store (replace with DB in production)
_favorites_store: Dict[str, List[Dict[str, Any]]] = {}


@router.get("/favorites")
async def api_v25_favorites(user_id: Optional[str] = None):
    """Get user's favorited capabilities."""
    if not user_id:
        user_id = "anonymous"
    return JSONResponse({
        "success": True,
        "favorites": _favorites_store.get(user_id, [])
    })


@router.post("/favorites/add")
async def api_v25_favorites_add(request: Request):
    """Add a capability to favorites.
    Body: { "user_id": "...", "capability_id": "...", "label": "...", "path": "...", "icon": "..." }
    """
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse({"success": False, "error": "Invalid JSON"}, status_code=400)

    user_id = data.get("user_id", "anonymous")
    item = {
        "id": f"{user_id}_{data.get('capability_id', 'unknown')}_{int(time.time())}",
        "capability_id": data.get("capability_id", ""),
        "label": data.get("label", ""),
        "path": data.get("path", ""),
        "icon": data.get("icon", ""),
        "created_at": time.time(),
    }
    if user_id not in _favorites_store:
        _favorites_store[user_id] = []
    _favorites_store[user_id].append(item)
    return JSONResponse({"success": True, "favorite": item})


@router.post("/favorites/remove")
async def api_v25_favorites_remove(request: Request):
    """Remove a capability from favorites.
    Body: { "user_id": "...", "favorite_id": "..." }
    """
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse({"success": False, "error": "Invalid JSON"}, status_code=400)

    user_id = data.get("user_id", "anonymous")
    fav_id = data.get("favorite_id", "")
    if user_id in _favorites_store:
        _favorites_store[user_id] = [f for f in _favorites_store[user_id] if f["id"] != fav_id]
    return JSONResponse({"success": True})
