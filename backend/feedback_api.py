"""
LUQI AI — Feedback & Activity API
==================================
Collects user feedback and tracks feature usage for product improvement.
v29.0.0 Pre-launch
"""
from __future__ import annotations
import json
import time
import uuid
from typing import Dict, List, Any
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["feedback"])

_feedback_store: List[Dict[str, Any]] = []
_activity_log: List[Dict[str, Any]] = []


def _init_db():
    """Initialize SQLite tables for feedback and activity."""
    try:
        import sqlite3
        from pathlib import Path
        db_path = Path(__file__).resolve().parent.parent / "data" / "luqi.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path))
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT,
                email TEXT,
                subject TEXT,
                message TEXT,
                rating INTEGER,
                created_at REAL,
                resolved INTEGER DEFAULT 0
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                event_type TEXT,
                feature TEXT,
                action TEXT,
                details TEXT,
                created_at REAL
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[feedback_api] DB init warning: {e}")


_init_db()


@router.post("/api/v25/feedback/submit")
async def api_v25_feedback_submit(request: Request):
    """Submit user feedback. Body: {name, email, subject, message, rating?}"""
    try:
        data = json.loads(await request.body())
        feedback_id = str(uuid.uuid4())
        entry = {
            "id": feedback_id,
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "subject": data.get("subject", "general"),
            "message": data.get("message", ""),
            "rating": data.get("rating"),
            "created_at": time.time(),
        }
        _feedback_store.append(entry)
        try:
            import sqlite3
            from pathlib import Path
            db_path = Path(__file__).resolve().parent.parent / "data" / "luqi.db"
            conn = sqlite3.connect(str(db_path))
            c = conn.cursor()
            c.execute(
                "INSERT INTO feedback VALUES (?,?,?,?,?,?,?,?)",
                (entry["id"], "anonymous", entry["name"], entry["email"],
                 entry["subject"], entry["message"], entry["rating"], entry["created_at"])
            )
            conn.commit()
            conn.close()
        except Exception:
            pass
        return JSONResponse({"success": True, "feedback_id": feedback_id})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


@router.post("/api/v25/activity/track")
async def api_v25_activity_track(request: Request):
    """Track a user activity event. Body: {user_id?, event_type, feature, action, details?}"""
    try:
        data = json.loads(await request.body())
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": data.get("user_id", "anonymous"),
            "event_type": data.get("event_type", "feature_usage"),
            "feature": data.get("feature", ""),
            "action": data.get("action", ""),
            "details": json.dumps(data.get("details", {})),
            "created_at": time.time(),
        }
        _activity_log.append(entry)
        return JSONResponse({"success": True})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


@router.get("/api/v25/feedback/list")
async def api_v25_feedback_list(limit: int = 50):
    """List recent feedback (admin only in production)."""
    return JSONResponse({"success": True, "feedback": _feedback_store[-limit:]})


@router.get("/api/v25/activity/summary")
async def api_v25_activity_summary():
    """Get activity summary (admin only in production)."""
    from collections import Counter
    feature_counts = Counter(a["feature"] for a in _activity_log if a["feature"])
    action_counts = Counter(a["action"] for a in _activity_log if a["action"])
    return JSONResponse({
        "success": True,
        "total_events": len(_activity_log),
        "top_features": dict(feature_counts.most_common(10)),
        "top_actions": dict(action_counts.most_common(10)),
    })
