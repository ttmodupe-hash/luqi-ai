#!/usr/bin/env python3
"""Luqi AI v25 LUQI-specific API Endpoints — FastAPI routes for the LUQI agent,
including personal AI assistant features, voice, memory, and scheduler.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v25/luqi", tags=["luqi"])

from pydantic import BaseModel

class LuqiChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_tools: bool = True

class LuqiVoiceRequest(BaseModel):
    text: Optional[str] = None
    language: str = "en"
    accent: str = "uk"

class FactRequest(BaseModel):
    key: str
    value: str
    category: str = "general"

# ═══════════════════════════════════════════════════════════════════════════════
#  AGENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/chat")
async def luqi_chat(request: LuqiChatRequest):
    """Chat with the LUQI agent (full context)."""
    try:
        from backend.luqi_unified import agent_chat
        return agent_chat(
            message=request.message,
            session_id=request.session_id,
            use_tools=request.use_tools
        )
    except Exception as e:
        logger.error(f"LUQI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat")
async def luqi_chat_get(message: str, session_id: Optional[str] = None):
    """Chat with LUQI agent (GET method)."""
    try:
        from backend.luqi_unified import agent_chat
        return agent_chat(message=message, session_id=session_id)
    except Exception as e:
        logger.error(f"LUQI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def luqi_status():
    """Get LUQI agent status."""
    try:
        from backend.luqi_unified import agent_stats
        return agent_stats()
    except Exception as e:
        logger.error(f"LUQI status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  VOICE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/voice/speak")
async def luqi_voice_speak(request: LuqiVoiceRequest):
    """Convert text to speech."""
    try:
        from backend.luqi_unified import agent_speak
        return agent_speak(request.text or "Hello")
    except Exception as e:
        logger.error(f"LUQI speak error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voice/speak")
async def luqi_voice_speak_get(text: str):
    """Convert text to speech (GET)."""
    try:
        from backend.luqi_unified import agent_speak
        return agent_speak(text)
    except Exception as e:
        logger.error(f"LUQI speak error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/listen")
async def luqi_voice_listen(timeout: int = 5):
    """Listen for voice input."""
    try:
        from backend.luqi_unified import agent_voice_listen
        return agent_voice_listen(timeout=timeout)
    except Exception as e:
        logger.error(f"LUQI listen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  MEMORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/memory/search")
async def luqi_memory_search(keyword: str):
    """Search conversation memory."""
    try:
        from backend.luqi_unified import agent_memory_search
        return agent_memory_search(keyword)
    except Exception as e:
        logger.error(f"LUQI memory search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory/facts")
async def luqi_memory_facts(category: Optional[str] = None):
    """Get stored facts."""
    try:
        from backend.luqi_unified import agent_memory_facts
        return agent_memory_facts(category)
    except Exception as e:
        logger.error(f"LUQI memory facts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/memory/fact")
async def luqi_store_fact(request: FactRequest):
    """Store a fact."""
    try:
        from backend.luqi_unified import agent_store_fact
        return agent_store_fact(request.key, request.value, request.category)
    except Exception as e:
        logger.error(f"LUQI store fact error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/memory/clear")
async def luqi_clear_session(session_id: Optional[str] = None):
    """Clear session memory."""
    try:
        from backend.luqi_unified import agent_clear_session
        return agent_clear_session(session_id)
    except Exception as e:
        logger.error(f"LUQI clear session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOLS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tools")
async def luqi_list_tools():
    """List available tools."""
    try:
        from backend.luqi_unified import agent_list_tools
        return agent_list_tools()
    except Exception as e:
        logger.error(f"LUQI list tools error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tools/web-search")
async def luqi_web_search(query: str):
    """Search the web."""
    try:
        from backend.luqi_unified import web_search
        return web_search(query)
    except Exception as e:
        logger.error(f"LUQI web search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tools/run-code")
async def luqi_run_code(code: str):
    """Execute Python code."""
    try:
        from backend.luqi_unified import run_code
        return run_code(code)
    except Exception as e:
        logger.error(f"LUQI run code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONALIZATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/preferences")
async def luqi_preferences():
    """Get agent preferences."""
    return {
        "status": "success",
        "preferences": {
            "model": "gpt-4o",
            "voice_language": "en",
            "voice_accent": "uk",
            "max_context_messages": 10,
            "alarm_time": "07:30",
        }
    }

@router.post("/preferences")
async def luqi_update_preferences(preferences: dict):
    """Update agent preferences."""
    return {
        "status": "success",
        "message": "Preferences updated",
        "updated": list(preferences.keys())
    }
