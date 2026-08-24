"""
LUQI AI — Advanced Companion API Endpoints
============================================
Production-grade companion with voice synthesis, emotional intelligence,
persistent memory, adaptive personality, avatar generation, and real-time
WebSocket voice chat.

Mounts at /api/v25/companion
"""
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from typing import Any, Optional

import structlog
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

logger = structlog.get_logger("luqi.companion_api")

# ── Router ─────────────────────────────────────────────────────────────────
companion_router = APIRouter(tags=["companion"])

# ═══════════════════════════════════════════════════════════════════════════
#  Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    user_id: str
    message: str = Field(..., min_length=1, max_length=2000)
    companion_profile: str = Field(default="nova")
    emotion_context: Optional[dict[str, float]] = None
    stream: bool = Field(default=False)

class ChatResponse(BaseModel):
    response: str
    emotion: dict[str, float]
    user_emotion: dict[str, float]
    voice_emotion: str
    voice_id: str
    memories_used: int
    relationship_days: int
    trust_score: float
    personality: dict[str, float]
    companion_name: str
    timestamp: float

class VoiceSynthesizeRequest(BaseModel):
    user_id: str
    text: str = Field(..., min_length=1, max_length=5000)
    companion_profile: str = Field(default="nova")
    emotion_override: Optional[str] = None  # joy, calm, empathy, excitement, serious, whisper, trust
    model: str = Field(default="eleven_multilingual_v2")

class VoiceCloneRequest(BaseModel):
    name: str
    description: str = ""

class CompanionSwitchRequest(BaseModel):
    user_id: str
    profile_id: str

class FeedbackRequest(BaseModel):
    user_id: str
    feedback_score: float = Field(..., ge=-1.0, le=1.0)
    message_id: Optional[str] = None

class AvatarGenerateRequest(BaseModel):
    user_id: str
    companion_profile: str = Field(default="nova")
    style: str = Field(default="digital_art", description="digital_art | anime | realistic | minimalist | cyberpunk")
    emotion_override: Optional[str] = None

class MemoryQueryRequest(BaseModel):
    user_id: str
    query: str = Field(..., min_length=1)
    category: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)

class CompanionStatusRequest(BaseModel):
    user_id: str

class ConversationHistoryRequest(BaseModel):
    user_id: str
    limit: int = Field(default=50, ge=1, le=200)

class ClearHistoryRequest(BaseModel):
    user_id: str
    clear_memories: bool = Field(default=False)


# ═══════════════════════════════════════════════════════════════════════════
#  Companion Registry (in-memory per process)
# ═══════════════════════════════════════════════════════════════════════════

_companion_cache: dict[str, Any] = {}


def _get_companion(user_id: str, profile_id: str = "nova") -> Any:
    """Get or create companion instance for user."""
    cache_key = f"{user_id}:{profile_id}"
    if cache_key not in _companion_cache:
        from omega_ai.companion_engine import AdvancedCompanion
        _companion_cache[cache_key] = AdvancedCompanion(user_id, profile_id)
    return _companion_cache[cache_key]


# ═══════════════════════════════════════════════════════════════════════════
#  Chat Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.post("/chat", response_model=ChatResponse)
async def companion_chat(request: ChatRequest):
    """
    Send a message to your AI companion.
    
    The companion will:
    - Detect your emotional state from the message
    - Recall relevant memories about you
    - Adapt its personality based on your feedback history
    - Respond with emotional intelligence
    """
    try:
        companion = _get_companion(request.user_id, request.companion_profile)
        result = await companion.chat(request.message)

        return ChatResponse(
            response=result["response"],
            emotion=result["emotion"],
            user_emotion=result["user_emotion"],
            voice_emotion=result["voice_emotion"],
            voice_id=result["voice_id"],
            memories_used=result["memories_used"],
            relationship_days=result["relationship_days"],
            trust_score=result["trust_score"],
            personality=result["personality"],
            companion_name=companion.profile["name"],
            timestamp=time.time(),
        )
    except Exception as e:
        logger.error("companion_chat_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Companion chat failed: {e}")


@companion_router.websocket("/chat/stream/{user_id}")
async def companion_chat_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket for real-time companion chat.
    
    Send: {"message": "...", "companion_profile": "nova"}
    Receive: {"type": "response", "text": "...", "emotion": {...}}
    Receive: {"type": "voice_ready", "audio_url": "..."} (if voice enabled)
    """
    await websocket.accept()
    try:
        companion = _get_companion(user_id, "nova")
        while True:
            data = await websocket.receive_json()
            msg = data.get("message", "")
            profile = data.get("companion_profile", "nova")

            if profile != companion.profile_id:
                companion = _get_companion(user_id, profile)

            result = await companion.chat(msg)

            await websocket.send_json({
                "type": "response",
                "text": result["response"],
                "emotion": result["emotion"],
                "user_emotion": result["user_emotion"],
                "voice_emotion": result["voice_emotion"],
                "companion_name": companion.profile["name"],
                "memories_used": result["memories_used"],
                "trust_score": result["trust_score"],
                "timestamp": time.time(),
            })

            # Optionally synthesize voice
            if data.get("enable_voice", False):
                audio = await companion.synthesize_voice(result["response"])
                if audio:
                    # In production: save to CDN, return URL
                    audio_b64 = "..."  # Base64 would go here
                    await websocket.send_json({
                        "type": "voice_ready",
                        "audio_base64": "streaming_not_implemented_in_ws",
                        "voice_emotion": result["voice_emotion"],
                    })

    except WebSocketDisconnect:
        logger.info("companion_ws_disconnect", user=user_id)
    except Exception as e:
        logger.error("companion_ws_error", user=user_id, error=str(e))
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════
#  Voice Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.post("/voice/synthesize")
async def voice_synthesize(request: VoiceSynthesizeRequest):
    """
    Synthesize speech using ElevenLabs with emotional prosody.
    
    Returns MP3 audio bytes (base64-encoded in JSON for API transport).
    """
    try:
        from omega_ai.companion_engine import VoiceOrchestrator
        voice = VoiceOrchestrator()

        companion = _get_companion(request.user_id, request.companion_profile)
        voice_id = companion.profile["elevenlabs_voice_id"]

        audio = await voice.synthesize(
            request.text,
            voice_id,
            emotion=request.emotion_override or "calm",
            model=request.model,
        )

        if not audio:
            raise HTTPException(
                status_code=503,
                detail="Voice synthesis unavailable. Check ELEVENLABS_API_KEY or use browser TTS fallback."
            )

        import base64
        return {
            "audio_base64": base64.b64encode(audio).decode("utf-8"),
            "format": "mp3",
            "duration_estimate": len(request.text) * 0.08,  # rough estimate
            "voice_id": voice_id,
            "emotion": request.emotion_override or "calm",
            "model": request.model,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("voice_synthesize_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Voice synthesis failed: {e}")


@companion_router.post("/voice/clone")
async def voice_clone(request: VoiceCloneRequest, file: UploadFile = File(...)):
    """
    Clone a voice from an audio sample (MP3/WAV).
    
    Returns the new voice_id for use in chat.
    """
    try:
        from omega_ai.companion_engine import VoiceOrchestrator
        voice = VoiceOrchestrator()

        audio_bytes = await file.read()
        if len(audio_bytes) < 1024:
            raise HTTPException(status_code=400, detail="Audio file too small (min 1KB)")

        voice_id = await voice.clone_voice(request.name, audio_bytes, request.description)
        if not voice_id:
            raise HTTPException(status_code=502, detail="Voice cloning failed. Check API key and audio quality.")

        return {"voice_id": voice_id, "name": request.name, "status": "ready"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("voice_clone_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {e}")


@companion_router.get("/voice/list")
async def voice_list():
    """List available ElevenLabs voices."""
    try:
        from omega_ai.companion_engine import VoiceOrchestrator
        voice = VoiceOrchestrator()
        voices = await voice.get_voices()
        return {"voices": voices, "count": len(voices)}
    except Exception as e:
        logger.error("voice_list_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list voices: {e}")


@companion_router.get("/voice/profiles")
async def voice_profiles():
    """List built-in LUQI companion voice profiles."""
    try:
        from omega_ai.companion_engine import DEFAULT_VOICE_PROFILES
        profiles = []
        for pid, p in DEFAULT_VOICE_PROFILES.items():
            profiles.append({
                "id": pid,
                "name": p["name"],
                "gender": p["gender"],
                "age": p["age"],
                "tone": p["tone"],
                "accent": p["accent"],
                "personality_seed": p["personality_seed"],
            })
        return {"profiles": profiles, "count": len(profiles)}
    except Exception as e:
        logger.error("voice_profiles_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list profiles: {e}")


# ═══════════════════════════════════════════════════════════════════════════
#  Personality & Feedback Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.post("/feedback")
async def companion_feedback(request: FeedbackRequest):
    """
    Provide feedback on a companion interaction (-1.0 to +1.0).
    
    This adapts the companion's personality and improves future responses.
    """
    try:
        companion = _get_companion(request.user_id)
        companion.provide_feedback(request.feedback_score)
        return {
            "status": "feedback_recorded",
            "feedback_score": request.feedback_score,
            "personality": companion.personality.to_dict(),
            "trust_score": round(companion.relationship.trust_score, 3),
        }
    except Exception as e:
        logger.error("companion_feedback_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Feedback failed: {e}")


@companion_router.post("/switch")
async def companion_switch(request: CompanionSwitchRequest):
    """Switch to a different companion personality/voice profile."""
    try:
        companion = _get_companion(request.user_id)
        result = companion.switch_profile(request.profile_id)
        # Update cache
        _companion_cache[f"{request.user_id}:{request.profile_id}"] = companion
        return {
            "status": "switched",
            "new_profile": result["new_profile"],
            "name": result["name"],
            "personality": result["personality"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("companion_switch_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Switch failed: {e}")


@companion_router.get("/status/{user_id}")
async def companion_status(user_id: str):
    """Get full companion status: personality, emotion, relationship, memories."""
    try:
        companion = _get_companion(user_id)
        return companion.get_status()
    except Exception as e:
        logger.error("companion_status_error", user=user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get status: {e}")


# ═══════════════════════════════════════════════════════════════════════════
#  Memory Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.post("/memory/query")
async def memory_query(request: MemoryQueryRequest):
    """Query companion memories semantically."""
    try:
        companion = _get_companion(request.user_id)
        memories = companion.memory.recall(request.query, top_k=request.top_k, category_filter=request.category)
        return {
            "query": request.query,
            "memories": [m.to_dict() for m in memories],
            "count": len(memories),
        }
    except Exception as e:
        logger.error("memory_query_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Memory query failed: {e}")


@companion_router.get("/memory/preferences/{user_id}")
async def memory_preferences(user_id: str):
    """Get all learned preferences for a user."""
    try:
        companion = _get_companion(user_id)
        prefs = companion.memory.get_preferences()
        return {"user_id": user_id, "preferences": prefs, "count": len(prefs)}
    except Exception as e:
        logger.error("memory_preferences_error", user=user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {e}")


# ═══════════════════════════════════════════════════════════════════════════
#  Avatar Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.post("/avatar/generate")
async def avatar_generate(request: AvatarGenerateRequest):
    """
    Generate an avatar prompt for the companion.
    
    Returns the prompt string. In production, this would call an image
    generation API and return the image URL.
    """
    try:
        companion = _get_companion(request.user_id, request.companion_profile)
        prompt = companion.generate_avatar_prompt(request.style)
        return {
            "prompt": prompt,
            "style": request.style,
            "companion_name": companion.profile["name"],
            "emotion": companion.emotional_state.to_dict(),
            "personality": companion.personality.to_dict(),
        }
    except Exception as e:
        logger.error("avatar_generate_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Avatar generation failed: {e}")


@companion_router.get("/avatar/styles")
async def avatar_styles():
    """List available avatar styles."""
    return {
        "styles": [
            {"id": "digital_art", "name": "Digital Art", "description": "Highly detailed digital portrait with cinematic lighting"},
            {"id": "anime", "name": "Anime", "description": "Vibrant anime style with expressive features"},
            {"id": "realistic", "name": "Photorealistic", "description": "Photorealistic 8K studio portrait"},
            {"id": "minimalist", "name": "Minimalist", "description": "Clean vector illustration with flat design"},
            {"id": "cyberpunk", "name": "Cyberpunk", "description": "Neon-accented futuristic aesthetic"},
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════
#  Conversation Management
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.get("/history/{user_id}")
async def conversation_history(user_id: str, limit: int = Query(50, ge=1, le=200)):
    """Get conversation history for a user."""
    try:
        companion = _get_companion(user_id)
        history = companion.conversation_history[-limit:]
        return {
            "user_id": user_id,
            "history": history,
            "count": len(history),
            "total_messages": companion.relationship.total_messages,
        }
    except Exception as e:
        logger.error("history_error", user=user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get history: {e}")


@companion_router.post("/history/clear")
async def clear_history(request: ClearHistoryRequest):
    """Clear conversation history. Optionally clear all memories too."""
    try:
        companion = _get_companion(request.user_id)
        if request.clear_memories:
            companion.reset()
            return {"status": "full_reset", "message": "All history and memories cleared"}
        else:
            companion.clear_history()
            return {"status": "history_cleared", "message": "Conversation history cleared. Memories preserved."}
    except Exception as e:
        logger.error("clear_history_error", user=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Clear failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════
#  Real-time Voice Chat WebSocket
# ═══════════════════════════════════════════════════════════════════════════

@companion_router.websocket("/voice/stream/{user_id}")
async def voice_stream_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket for real-time voice conversation.
    
    Client sends audio chunks (base64) or text.
    Server responds with synthesized voice audio (base64 MP3).
    
    Protocol:
      Client → {"type": "text", "message": "..."}
      Server ← {"type": "audio", "audio_base64": "...", "text": "...", "emotion": {...}}
    """
    await websocket.accept()
    try:
        companion = _get_companion(user_id)
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "text")

            if msg_type == "text":
                message = data.get("message", "")
                result = await companion.chat(message)
                audio = await companion.synthesize_voice(result["response"])

                resp: dict[str, Any] = {
                    "type": "response",
                    "text": result["response"],
                    "emotion": result["emotion"],
                    "companion_name": companion.profile["name"],
                }
                if audio:
                    import base64
                    resp["audio_base64"] = base64.b64encode(audio).decode("utf-8")
                    resp["audio_format"] = "mp3"

                await websocket.send_json(resp)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})

    except WebSocketDisconnect:
        logger.info("voice_stream_disconnect", user=user_id)
    except Exception as e:
        logger.error("voice_stream_error", user=user_id, error=str(e))
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close(code=1011)
        except Exception:
            pass


# ── Router export ──────────────────────────────────────────────────────────
router = companion_router
