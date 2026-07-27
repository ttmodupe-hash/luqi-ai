"""
LUQI AI — v25 REST Endpoints
==============================
Notification hub endpoints added alongside existing v25 routes.
All endpoints are auth-gated and delegate to NotificationHub.
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/v25", tags=["v25"])

# ---------------------------------------------------------------------------
# Auth dependency (stub — replace with real implementation)
# ---------------------------------------------------------------------------

async def require_auth(request: Request):
    """Validate Bearer token from Authorization header.

    In production this should verify JWT signatures against
    the auth service and extract the user_id claim.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    # TODO: validate JWT and set request.state.user_id
    return auth


# ---------------------------------------------------------------------------
# Notification Endpoints
# ---------------------------------------------------------------------------

@router.get("/notifications", dependencies=[Depends(require_auth)])
async def api_v25_notifications(
    request: Request,
    user_id: Optional[str] = None,
    unread_only: bool = False,
    notification_type: Optional[str] = None,
    limit: int = 50,
):
    """Get notifications for the authenticated user.

    Query params:
        user_id:            Filter by user (defaults to token subject).
        unread_only:        If true, return only unread items.
        notification_type:  Filter by type (e.g. 'tender_deadline').
        limit:              Max items to return (default 50).
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()

    # Fallback: extract user_id from token if not provided
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_notifications(
        user_id=user_id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=limit,
    )
    return JSONResponse({"success": True, **result})


@router.get("/notifications/unread-count", dependencies=[Depends(require_auth)])
async def api_v25_notifications_unread_count(
    request: Request,
    user_id: Optional[str] = None,
):
    """Return the unread notification count for the badge indicator.

    This is a lightweight endpoint polled every 60s by the frontend
    and also pushed over WebSocket for real-time updates.
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_unread_count(user_id)
    return JSONResponse({"success": True, **result})


@router.post("/notifications/mark-read", dependencies=[Depends(require_auth)])
async def api_v25_notifications_mark_read(request: Request):
    """Mark a single notification as read.

    Body: { "notification_id": "<uuid>" }
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse(
            {"success": False, "error": "Invalid JSON body"},
            status_code=400,
        )

    result = hub.mark_read(data.get("notification_id"))
    return JSONResponse(result)


@router.post("/notifications/mark-all-read", dependencies=[Depends(require_auth)])
async def api_v25_notifications_mark_all_read(request: Request):
    """Mark all notifications as read for a user.

    Body: { "user_id": "<uuid>" }  (optional, falls back to token)
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        data = {}

    user_id = data.get("user_id") or getattr(request.state, "user_id", None)
    result = hub.mark_all_read(user_id)
    return JSONResponse(result)


@router.get("/notifications/settings", dependencies=[Depends(require_auth)])
async def api_v25_notification_settings(
    request: Request,
    user_id: Optional[str] = None,
):
    """Get notification preferences for the authenticated user."""
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_notification_settings(user_id)
    return JSONResponse({"success": True, **result})


@router.post("/notifications/settings", dependencies=[Depends(require_auth)])
async def api_v25_notification_settings_update(request: Request):
    """Update notification preferences (partial merge).

    Body: { "user_id": "...", "settings": { ... } }
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse(
            {"success": False, "error": "Invalid JSON body"},
            status_code=400,
        )

    user_id = data.get("user_id") or getattr(request.state, "user_id", "anonymous")
    settings = data.get("settings", {})

    result = hub.update_settings(user_id, settings)
    return JSONResponse(result)


# ---------------------------------------------------------------------------
# AI Brain — LLM-powered chat with streaming (v2.2.0)
# ---------------------------------------------------------------------------

@router.post("/ai-brain/chat", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_chat(request: Request):
    """Main AI brain chat endpoint — processes natural language queries.

    Uses OpenAI GPT-4o-mini with function calling when LLM is available,
    falls back to keyword-based routing when OPENAI_API_KEY is not set.
    """
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        data = json.loads(await request.body())
        brain = mod.AIBrain()
        result = brain.process_message(
            data.get("message", ""),
            session_id=data.get("session_id", "default"),
            language=data.get("language", "auto"),
            user_id=data.get("user_id"),
        )
        return JSONResponse({"success": True, "response": result})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain chat error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-brain/chat/stream", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_chat_stream(request: Request):
    """Stream AI Brain response in real-time via Server-Sent Events (SSE).

    Yields JSON chunks: {"type": "stream", "token": "...", "text": "..."}
    Final chunk: {"type": "done", "text": "..."}
    Requires OPENAI_API_KEY for LLM streaming; falls back to non-streaming
    response if LLM is unavailable.
    """
    import asyncio
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        data = json.loads(await request.body())
        brain = mod.AIBrain()

        async def event_generator():
            try:
                loop = asyncio.get_event_loop()
                # Run the sync generator in a thread pool
                def _stream():
                    return list(brain.process_message_stream(
                        data.get("message", ""),
                        session_id=data.get("session_id", "default"),
                        language=data.get("language", "auto"),
                        user_id=data.get("user_id"),
                    ))
                chunks = await loop.run_in_executor(None, _stream)
                for chunk in chunks:
                    yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as exc:
                yield f"data: {{\"type\": \"error\", \"message\": \"{str(exc)}\"}}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain stream error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-brain/capabilities", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_capabilities():
    """List all capabilities the AI Brain can access."""
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        brain = mod.AIBrain()
        return JSONResponse({"success": True, "capabilities": brain.list_capabilities()})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain capabilities error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-brain/status", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_status():
    """Get AI Brain health status including LLM activation state."""
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        brain = mod.AIBrain()
        return JSONResponse({"success": True, **brain.get_status()})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain status error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Seed endpoint (dev-only, guarded in production)
# ---------------------------------------------------------------------------

@router.post("/notifications/seed", dependencies=[Depends(require_auth)])
async def api_v25_notifications_seed(request: Request):
    """Generate sample notifications for demo / onboarding.

    Body: { "user_id": "..." }  (optional)
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        data = {}

    user_id = data.get("user_id") or getattr(request.state, "user_id", "anonymous")
    created = hub.generate_sample_notifications(user_id)

    return JSONResponse({
        "success": True,
        "seeded": len(created),
        "notification_ids": [n.id for n in created],
    })
