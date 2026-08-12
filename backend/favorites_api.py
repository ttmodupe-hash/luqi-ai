"""Favorites API for LUQI AI"""
from typing import List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/favorites", tags=["Favorites"])


class FavoriteCreate(BaseModel):
    item_type: str  # 'project', 'task', 'document', 'search_query'
    item_id: int
    notes: str = ""


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    item_type: str
    item_id: int
    notes: str
    created_at: str


# In-memory store
_favorites = {}
_next_fav_id = 1


@router.post("/", response_model=FavoriteResponse)
async def add_favorite(request: FavoriteCreate, req: Request):
    """Add an item to favorites."""
    global _next_fav_id
    fav_id = _next_fav_id
    _next_fav_id += 1
    fav = {
        "id": fav_id,
        "user_id": 1,  # TODO: from auth
        "item_type": request.item_type,
        "item_id": request.item_id,
        "notes": request.notes,
        "created_at": __import__('datetime').datetime.utcnow().isoformat(),
    }
    _favorites[fav_id] = fav
    return fav


@router.get("/", response_model=List[FavoriteResponse])
async def list_favorites(item_type: str = None):
    """List favorites with optional filtering."""
    favs = list(_favorites.values())
    if item_type:
        favs = [f for f in favs if f["item_type"] == item_type]
    return favs


@router.delete("/{fav_id}")
async def remove_favorite(fav_id: int):
    """Remove a favorite."""
    if fav_id not in _favorites:
        raise HTTPException(status_code=404, detail="Favorite not found")
    del _favorites[fav_id]
    return {"success": True}
