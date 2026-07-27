"""Luqi AI v27 — Omega AI Engine Integration Endpoints

Wraps all 18 Omega AI v3.7.0 "Prometheus" modules into FastAPI endpoints,
bringing: Error Repair, Memory Manager, Pedagogical Engine, Wisdom,
Crypto, Rate Limiting, WebSocket, Vector DB, Multi-Tenant, Marketplace,
Realtime Prices, Metrics, Email, Telegram, PDF, Backup, Local LLM,
Agent Mesh, Blockchain Audit, and Federated Learning.

Registers 50+ new endpoints under /api/v25/*
"""

import json
import logging
import os
import sys
from pathlib import Path
from functools import wraps
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(tags=["v25"])

# ═══════════════════════════════════════════════════════════════════════════════
#  RATE LIMITING (Global + Per-Endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

_rate_limiter = None

def get_rate_limiter():
    """Lazy-load the Omega AI RateLimiter. Returns None if unavailable."""
    global _rate_limiter
    if _rate_limiter is None:
        try:
            mod = __import__("omega_ai.rate_limiter")
            _rate_limiter = mod.rate_limiter.RateLimiter()
        except Exception:
            _rate_limiter = None
    return _rate_limiter


async def rate_limit_check(client_id: str = "default"):
    """
    Check rate limit for a client. Raises HTTP 429 if exceeded.
    Usage: add to endpoint dependencies=[Depends(rate_limit_check)]
    """
    rl = get_rate_limiter()
    if rl:
        result = rl.is_allowed(client_id)
        if not result.get("allowed", True):
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again later. Reset at {result.get('reset_at', 'unknown')}"
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

API_KEY_ENV = "LUQI_API_KEY"
DEFAULT_API_KEY = "dev-key-change-in-prod"


async def require_auth(x_api_key: str = Header(...)):
    """Validate API key from X-API-Key header. Returns 401 if missing/invalid."""
    expected = os.environ.get(API_KEY_ENV, DEFAULT_API_KEY)
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key


# ═══════════════════════════════════════════════════════════════════════════════
#  PYDANTIC REQUEST MODELS (Input Validation)
# ═══════════════════════════════════════════════════════════════════════════════

class CodeRunRequest(BaseModel):
    code: str = Field(..., max_length=10000, description="Python code to execute")
    language: str = Field(default="python", pattern="^(python|javascript|bash)$")
    timeout: int = Field(default=30, ge=1, le=300, description="Execution timeout in seconds")


class BackupRestoreRequest(BaseModel):
    backup_id: str = Field(..., min_length=1, max_length=256, description="Backup identifier to restore from")


class CryptoEncryptRequest(BaseModel):
    plaintext: str = Field(..., max_length=10000, description="Text to encrypt")
    key: str = Field(..., min_length=8, max_length=256, description="Encryption key")


class CryptoDecryptRequest(BaseModel):
    ciphertext: str = Field(..., max_length=20000, description="Ciphertext to decrypt")
    key: str = Field(..., min_length=8, max_length=256, description="Decryption key")


class CryptoHashRequest(BaseModel):
    data: str = Field(..., max_length=10000, description="Data to hash")
    algorithm: str = Field(default="sha256", pattern="^(sha256|sha512|blake2)$")


class ErrorRepairHealRequest(BaseModel):
    module: str = Field(..., min_length=1, max_length=256, description="Module name to heal")


class ErrorRepairClearRequest(BaseModel):
    older_than_days: int = Field(default=7, ge=1, le=365, description="Clear errors older than N days")


class MemoryPurgeRequest(BaseModel):
    proposal_id: str = Field(..., min_length=1, max_length=256, description="Purge proposal ID")


class MemoryRecoverRequest(BaseModel):
    entry_id: str = Field(..., min_length=1, max_length=256, description="Entry ID to recover")


class PedagogicalRequest(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=256, description="Student identifier")
    domain: str = Field(default="general", max_length=128, description="Learning domain")


class VectorSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Search query")


class VectorStoreRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=256, description="Document ID")
    text: str = Field(..., max_length=50000, description="Document text to store")


class NotifyEmailRequest(BaseModel):
    to: str = Field(..., max_length=256, description="Recipient email")
    subject: str = Field(..., max_length=512, description="Email subject")
    message: str = Field(..., max_length=50000, description="Email body")


class NotifyTelegramRequest(BaseModel):
    chat_id: str = Field(..., max_length=256, description="Telegram chat ID")
    message: str = Field(..., max_length=4096, description="Message text")


class PDFGenerateRequest(BaseModel):
    content: str = Field(..., max_length=50000, description="PDF content")
    title: str = Field(default="Report", max_length=256, description="PDF title")


class PricesRequest(BaseModel):
    symbols: list = Field(default=["BTC", "ETH"], description="Financial symbols to query")


class LLMQueryRequest(BaseModel):
    prompt: str = Field(..., max_length=10000, description="Prompt for the LLM")


class PluginInstallRequest(BaseModel):
    plugin_id: str = Field(..., min_length=1, max_length=256, description="Plugin ID to install")

logger = logging.getLogger(__name__)

# Ensure repo root is importable for Omega AI modules
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# ═══════════════════════════════════════════════════════════════════════════════
#  LAZY MODULE LOADER
# ═══════════════════════════════════════════════════════════════════════════════

_OMEGA_CACHE: dict[str, Any] = {}


def _omega(module_name: str):
    """Lazy-import an Omega AI module. Tries omega_ai.MODULE first, then root-level."""
    if module_name not in _OMEGA_CACHE:
        try:
            # Try omega_ai package first (where our modules live)
            mod = __import__(f"omega_ai.{module_name}", fromlist=[module_name])
            _OMEGA_CACHE[module_name] = mod
        except Exception:
            try:
                # Fallback to root-level module
                mod = __import__(module_name)
                _OMEGA_CACHE[module_name] = mod
            except Exception as e:
                _OMEGA_CACHE[module_name] = None
                logger.debug("Omega module '%s' not available: %s", module_name, e)
    return _OMEGA_CACHE[module_name]


def _ok(module_name: str) -> bool:
    """Check if an Omega module is available."""
    return _omega(module_name) is not None


# ═══════════════════════════════════════════════════════════════════════════════
#  OMEGA ENDPOINT DECORATOR (DRY — eliminates 6-line try/except boilerplate)
# ═══════════════════════════════════════════════════════════════════════════════

def _omega_endpoint(module_name: str, class_name: str, detail_msg: str = None):
    """Decorator that handles omega module loading, instantiation, and error handling.

    Eliminates the repeated 6-line try/except/_omega pattern across all v25 endpoints.
    The wrapped function receives the instantiated engine as its first argument;
    all other args/kwargs (e.g. ``request: Request``) are passed through unchanged.

    Parameters
    ----------
    module_name:
        Omega module name passed to ``_omega()`` (e.g. ``"load_shedding"``).
    class_name:
        Class to instantiate from the loaded module (e.g. ``"LoadSheddingManager"``).
    detail_msg:
        Optional 503 message.  Defaults to ``"{module_name} not available"``.

    Example
    -------
    .. code-block:: python

        @router.get("/load-shedding/status", dependencies=[Depends(require_auth)])
        @_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
        async def api_v25_loadshedding_status(engine):
            return JSONResponse({"success": True, **engine.get_current_stage()})

        @router.post("/load-shedding/calculate", dependencies=[Depends(require_auth)])
        @_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
        async def api_v25_loadshedding_calculate(engine, request: Request):
            data = json.loads(await request.body())
            result = engine.calculate_backup_cost(data.get("load_kw", 5.0), data.get("backup_hours", 4))
            return JSONResponse({"success": True, **result})
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                mod = _omega(module_name)
                if not mod:
                    raise HTTPException(
                        status_code=503,
                        detail=detail_msg or f"{module_name.replace('_', ' ').title()} not available"
                    )
                engine = getattr(mod, class_name)()
                return await func(engine, *args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                logger.error("%s error: %s", module_name, e)
                raise HTTPException(status_code=500, detail=str(e))
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
#  v25 STATUS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status", dependencies=[Depends(require_auth)])
async def api_v25_status():
    """v25 system health check — lists all registered engines and their availability."""
    engines = [
        "error_repair", "memory_manager", "pedagogical_engine", "wisdom",
        "crypto", "rate_limiter", "websocket_handler", "vector_db",
        "multi_tenant", "marketplace", "realtime_prices", "metrics",
        "email_service", "telegram_bot", "pdf_generator", "backup_manager",
        "local_llm", "agent_mesh", "blockchain_audit", "federated_learning",
        "load_shedding",
    ]
    available = {name: _ok(name) for name in engines}
    return JSONResponse({
        "version": "v25",
        "engines": engines,
        "available": available,
        "ready": all(available.values()),
        "api_key_valid": True,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  AI BRAIN — LLM-powered chat with streaming (v2.2.0)
# ═══════════════════════════════════════════════════════════════════════════════

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