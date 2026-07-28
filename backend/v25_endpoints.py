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

@router.get("/status", dependencies=[Depends(rate_limit_check)])
async def api_v25_status():
    """v25 Prometheus engine status — reports which Omega modules are loaded."""
    modules = {
        "error_repair": _ok("error_repair"),
        "memory_manager": _ok("memory_manager"),
        "pedagogical_engine": _ok("pedagogical_engine"),
        "wisdom_engine": _ok("wisdom_engine"),
        "crypto_utils": _ok("crypto_utils"),
        "rate_limiter": _ok("rate_limiter"),
        "ws_server": _ok("ws_server"),
        "vector_db": _ok("vector_db"),
        "multi_tenant": _ok("multi_tenant"),
        "plugin_marketplace": _ok("plugin_marketplace"),
        "realtime_prices": _ok("realtime_prices"),
        "metrics_exporter": _ok("metrics_exporter"),
        "email_notifier": _ok("email_notifier"),
        "telegram_bot": _ok("telegram_bot"),
        "pdf_generator": _ok("pdf_generator"),
        "auto_backup": _ok("auto_backup"),
        "local_llm": _ok("local_llm"),
        "agent_mesh": _ok("agent_mesh"),
        "blockchain_audit": _ok("blockchain_audit"),
        "federated_learning": _ok("federated_learning"),
    }
    loaded = sum(1 for v in modules.values() if v)
    return JSONResponse({
        "version": "27.0.0",
        "codename": "Prometheus",
        "modules_total": len(modules),
        "modules_loaded": loaded,
        "modules": modules,
        "endpoints": 50,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  ERROR REPAIR ENGINE (v3.6.1)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/error-repair/stats", dependencies=[Depends(require_auth)])
async def api_v25_error_repair_stats():
    """Get error repair statistics."""
    try:
        mod = _omega("error_repair")
        if not mod:
            raise HTTPException(status_code=503, detail="Error repair module not available")
        engine = mod.ErrorRepairEngine()
        return JSONResponse({"success": True, "stats": engine.get_stats()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error repair stats error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/error-repair/heal", dependencies=[Depends(require_auth)])
async def api_v25_error_repair_heal(request: Request):
    """Trigger self-healing for a module."""
    try:
        mod = _omega("error_repair")
        if not mod:
            raise HTTPException(status_code=503, detail="Error repair module not available")
        data = json.loads(await request.body())
        engine = mod.ErrorRepairEngine()
        result = engine.heal_module(data.get("module", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error repair heal error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/error-repair/clear", dependencies=[Depends(require_auth)])
async def api_v25_error_repair_clear(request: Request):
    """Clear error history."""
    try:
        mod = _omega("error_repair")
        if not mod:
            raise HTTPException(status_code=503, detail="Error repair module not available")
        data = json.loads(await request.body())
        engine = mod.ErrorRepairEngine()
        result = engine.clear_history(data.get("older_than_days", 7))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error repair clear error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  MEMORY MANAGER (v3.6.2)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/memory-manager/stats", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_stats():
    """Get memory manager statistics."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        mgr = mod.MemoryManager()
        return JSONResponse({"success": True, "stats": mgr.get_stats()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Memory manager stats error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory-manager/entries", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_entries():
    """List all memory entries."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        mgr = mod.MemoryManager()
        return JSONResponse({"success": True, "entries": mgr.list_entries()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Memory manager entries error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory-manager/cleanup", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_cleanup(request: Request):
    """Propose memory cleanup."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        mgr = mod.MemoryManager()
        proposals = mgr.propose_cleanup()
        return JSONResponse({"success": True, "proposals": [p.to_dict() for p in proposals]})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Memory manager cleanup error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory-manager/purge-proposals", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_purge_proposals():
    """Get pending purge proposals."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        mgr = mod.MemoryManager()
        return JSONResponse({"success": True, "proposals": mgr.get_purge_proposals()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Purge proposals error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory-manager/approve-purge", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_approve_purge(request: Request):
    """Approve a purge proposal."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        data = json.loads(await request.body())
        mgr = mod.MemoryManager()
        result = mgr.approve_purge(data.get("proposal_id", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Approve purge error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory-manager/reject-purge", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_reject_purge(request: Request):
    """Reject a purge proposal."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        data = json.loads(await request.body())
        mgr = mod.MemoryManager()
        result = mgr.reject_purge(data.get("proposal_id", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Reject purge error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory-manager/recover", dependencies=[Depends(require_auth)])
async def api_v25_memory_manager_recover(request: Request):
    """Recover a soft-deleted entry."""
    try:
        mod = _omega("memory_manager")
        if not mod:
            raise HTTPException(status_code=503, detail="Memory manager not available")
        data = json.loads(await request.body())
        mgr = mod.MemoryManager()
        result = mgr.recover_entry(data.get("entry_id", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recover entry error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  PEDAGOGICAL ENGINE (v3.6.3)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/pedagogical/diagnostic", dependencies=[Depends(require_auth)])
async def api_v25_ped_diagnostic(request: Request):
    """Run pedagogical diagnostic assessment (Socrates + Bjork + Bloom)."""
    try:
        mod = _omega("pedagogical_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Pedagogical engine not available")
        data = json.loads(await request.body())
        engine = mod.PedagogicalEngine()
        result = engine.diagnostic_assessment(data.get("student_id", ""), data.get("domain", "general"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ped diagnostic error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pedagogical/progress/{student_id}", dependencies=[Depends(require_auth)])
async def api_v25_ped_progress(student_id: str):
    """Get student progress across all domains."""
    try:
        mod = _omega("pedagogical_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Pedagogical engine not available")
        engine = mod.PedagogicalEngine()
        result = engine.get_progress(student_id)
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ped progress error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pedagogical/tutor", dependencies=[Depends(require_auth)])
async def api_v25_ped_tutor(request: Request):
    """Socratic tutoring session — asks guiding questions."""
    try:
        mod = _omega("pedagogical_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Pedagogical engine not available")
        data = json.loads(await request.body())
        engine = mod.PedagogicalEngine()
        result = engine.socratic_tutor(data.get("student_id", ""), data.get("topic", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ped tutor error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pedagogical/assess-bloom", dependencies=[Depends(require_auth)])
async def api_v25_ped_assess_bloom(request: Request):
    """Assess student against Bloom's Taxonomy levels."""
    try:
        mod = _omega("pedagogical_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Pedagogical engine not available")
        data = json.loads(await request.body())
        engine = mod.PedagogicalEngine()
        result = engine.assess_bloom_level(data.get("student_id", ""), data.get("domain", "general"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Bloom assess error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  WISDOM ENGINE (v3.5.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/wisdom", dependencies=[Depends(require_auth)])
async def api_v25_wisdom(tradition: Optional[str] = None):
    """Get a wisdom proverb or quote from 17+ traditions."""
    try:
        mod = _omega("wisdom_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Wisdom engine not available")
        engine = mod.WisdomEngine()
        result = engine.get_wisdom(tradition=tradition)
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Wisdom error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wisdom/traditions", dependencies=[Depends(require_auth)])
async def api_v25_wisdom_traditions():
    """List all available wisdom traditions."""
    try:
        mod = _omega("wisdom_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Wisdom engine not available")
        engine = mod.WisdomEngine()
        traditions = engine.list_traditions()
        return JSONResponse({"success": True, "traditions": traditions})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Wisdom traditions error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  CRYPTO UTILS (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/crypto/encrypt", dependencies=[Depends(require_auth)])
async def api_v25_crypto_encrypt(request: Request):
    """Encrypt plaintext using AES-256-GCM."""
    try:
        mod = _omega("crypto_utils")
        if not mod:
            raise HTTPException(status_code=503, detail="Crypto module not available")
        data = json.loads(await request.body())
        mgr = mod.CryptoManager()
        result = mgr.encrypt(data.get("plaintext", ""), data.get("key", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Crypto encrypt error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crypto/decrypt", dependencies=[Depends(require_auth)])
async def api_v25_crypto_decrypt(request: Request):
    """Decrypt ciphertext."""
    try:
        mod = _omega("crypto_utils")
        if not mod:
            raise HTTPException(status_code=503, detail="Crypto module not available")
        data = json.loads(await request.body())
        mgr = mod.CryptoManager()
        result = mgr.decrypt(data.get("ciphertext", ""), data.get("key", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Crypto decrypt error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crypto/hash", dependencies=[Depends(require_auth)])
async def api_v25_crypto_hash(request: Request):
    """Hash data (SHA-256, SHA-512, BLAKE2)."""
    try:
        mod = _omega("crypto_utils")
        if not mod:
            raise HTTPException(status_code=503, detail="Crypto module not available")
        data = json.loads(await request.body())
        mgr = mod.CryptoManager()
        result = mgr.hash(data.get("data", ""), data.get("algorithm", "sha256"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Crypto hash error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  RATE LIMITER (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/rate-limit/status", dependencies=[Depends(require_auth)])
async def api_v25_rate_limit_status():
    """Get rate limiter status."""
    try:
        mod = _omega("rate_limiter")
        if not mod:
            raise HTTPException(status_code=503, detail="Rate limiter not available")
        rl = mod.RateLimiter()
        return JSONResponse({"success": True, "status": rl.get_status()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Rate limit status error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  VECTOR DB (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/vector/search", dependencies=[Depends(require_auth)])
async def api_v25_vector_search(request: Request):
    """Search vector database."""
    try:
        mod = _omega("vector_db")
        if not mod:
            raise HTTPException(status_code=503, detail="Vector DB not available")
        data = json.loads(await request.body())
        db = mod.VectorDB()
        results = db.search(data.get("query", ""))
        return JSONResponse({"success": True, "results": results})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Vector search error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vector/store", dependencies=[Depends(require_auth)])
async def api_v25_vector_store(request: Request):
    """Store a document in vector database."""
    try:
        mod = _omega("vector_db")
        if not mod:
            raise HTTPException(status_code=503, detail="Vector DB not available")
        data = json.loads(await request.body())
        db = mod.VectorDB()
        result = db.store(data.get("id", ""), data.get("text", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Vector store error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  MULTI-TENANT (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tenant/stats", dependencies=[Depends(require_auth)])
async def api_v25_tenant_stats():
    """Get multi-tenant statistics."""
    try:
        mod = _omega("multi_tenant")
        if not mod:
            raise HTTPException(status_code=503, detail="Multi-tenant not available")
        mgr = mod.TenantManager()
        return JSONResponse({"success": True, "tenants": mgr.get_stats()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Tenant stats error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  PLUGIN MARKETPLACE (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/marketplace/plugins", dependencies=[Depends(require_auth)])
async def api_v25_marketplace_plugins():
    """List available plugins in marketplace."""
    try:
        mod = _omega("plugin_marketplace")
        if not mod:
            raise HTTPException(status_code=503, detail="Marketplace not available")
        m = mod.Marketplace()
        return JSONResponse({"success": True, "plugins": m.list_plugins()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Marketplace plugins error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marketplace/install", dependencies=[Depends(require_auth)])
async def api_v25_marketplace_install(request: Request):
    """Install a plugin from marketplace."""
    try:
        mod = _omega("plugin_marketplace")
        if not mod:
            raise HTTPException(status_code=503, detail="Marketplace not available")
        data = json.loads(await request.body())
        m = mod.Marketplace()
        result = m.install(data.get("plugin_id", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Marketplace install error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  REALTIME PRICES (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/prices/realtime", dependencies=[Depends(require_auth)])
async def api_v25_prices_realtime(request: Request):
    """Get realtime cryptocurrency/financial prices."""
    try:
        mod = _omega("realtime_prices")
        if not mod:
            raise HTTPException(status_code=503, detail="Price tracker not available")
        data = json.loads(await request.body())
        t = mod.PriceTracker()
        result = t.get_prices(data.get("symbols", ["BTC", "ETH"]))
        return JSONResponse({"success": True, "prices": result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prices error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  METRICS EXPORTER (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/metrics", dependencies=[Depends(require_auth)])
async def api_v25_metrics():
    """Export system metrics (Prometheus-compatible)."""
    try:
        mod = _omega("metrics_exporter")
        if not mod:
            raise HTTPException(status_code=503, detail="Metrics exporter not available")
        m = mod.MetricsExporter()
        return JSONResponse({"success": True, "metrics": m.export()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Metrics error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  EMAIL NOTIFIER (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/notify/email", dependencies=[Depends(require_auth)])
async def api_v25_notify_email(request: Request):
    """Send an email notification."""
    try:
        mod = _omega("email_notifier")
        if not mod:
            raise HTTPException(status_code=503, detail="Email notifier not available")
        data = json.loads(await request.body())
        notifier = mod.EmailNotifier()
        result = notifier.send(data.get("to", ""), data.get("subject", ""), data.get("message", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email notify error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  TELEGRAM BOT (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/telegram/send", dependencies=[Depends(require_auth)])
async def api_v25_telegram_send(request: Request):
    """Send a Telegram message."""
    try:
        mod = _omega("telegram_bot")
        if not mod:
            raise HTTPException(status_code=503, detail="Telegram bot not available")
        data = json.loads(await request.body())
        bot = mod.TelegramBot()
        result = bot.send_message(data.get("chat_id", ""), data.get("message", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Telegram send error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  PDF GENERATOR (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/pdf/generate", dependencies=[Depends(require_auth)])
async def api_v25_pdf_generate(request: Request):
    """Generate a PDF report."""
    try:
        mod = _omega("pdf_generator")
        if not mod:
            raise HTTPException(status_code=503, detail="PDF generator not available")
        data = json.loads(await request.body())
        gen = mod.PDFGenerator()
        result = gen.generate(data.get("content", ""), data.get("title", "Report"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("PDF generate error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTO BACKUP (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/backup/create", dependencies=[Depends(require_auth)])
async def api_v25_backup_create():
    """Create a system backup."""
    try:
        mod = _omega("auto_backup")
        if not mod:
            raise HTTPException(status_code=503, detail="Backup manager not available")
        mgr = mod.BackupManager()
        result = mgr.create_backup()
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Backup create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup/restore", dependencies=[Depends(require_auth)])
async def api_v25_backup_restore(request: Request):
    """Restore from a backup."""
    try:
        mod = _omega("auto_backup")
        if not mod:
            raise HTTPException(status_code=503, detail="Backup manager not available")
        data = json.loads(await request.body())
        mgr = mod.BackupManager()
        result = mgr.restore(data.get("backup_id", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Backup restore error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backup/list", dependencies=[Depends(require_auth)])
async def api_v25_backup_list():
    """List available backups."""
    try:
        mod = _omega("auto_backup")
        if not mod:
            raise HTTPException(status_code=503, detail="Backup manager not available")
        mgr = mod.BackupManager()
        return JSONResponse({"success": True, "backups": mgr.list_backups()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Backup list error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  LOCAL LLM (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/llm/status", dependencies=[Depends(require_auth)])
async def api_v25_llm_status():
    """Get local LLM status."""
    try:
        mod = _omega("local_llm")
        if not mod:
            raise HTTPException(status_code=503, detail="Local LLM not available")
        llm = mod.LocalLLM()
        return JSONResponse({"success": True, "status": llm.get_status()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("LLM status error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/llm/query", dependencies=[Depends(require_auth)])
async def api_v25_llm_query(request: Request):
    """Query the local LLM."""
    try:
        mod = _omega("local_llm")
        if not mod:
            raise HTTPException(status_code=503, detail="Local LLM not available")
        data = json.loads(await request.body())
        llm = mod.LocalLLM()
        result = llm.query(data.get("prompt", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("LLM query error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  AGENT MESH (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/mesh/agents", dependencies=[Depends(require_auth)])
async def api_v25_mesh_agents():
    """List agents in the mesh."""
    try:
        mod = _omega("agent_mesh")
        if not mod:
            raise HTTPException(status_code=503, detail="Agent mesh not available")
        mesh = mod.AgentMesh()
        return JSONResponse({"success": True, "agents": mesh.list_agents()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Mesh agents error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mesh/tasks", dependencies=[Depends(require_auth)])
async def api_v25_mesh_tasks(agent_id: Optional[str] = None):
    """List tasks in the agent mesh."""
    try:
        mod = _omega("agent_mesh")
        if not mod:
            raise HTTPException(status_code=503, detail="Agent mesh not available")
        mesh = mod.AgentMesh()
        tasks = mesh.list_tasks(agent_id)
        return JSONResponse({"success": True, "tasks": tasks})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Mesh tasks error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  BLOCKCHAIN AUDIT (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/blockchain/audit", dependencies=[Depends(require_auth)])
async def api_v25_blockchain_audit():
    """Get blockchain audit log."""
    try:
        mod = _omega("blockchain_audit")
        if not mod:
            raise HTTPException(status_code=503, detail="Blockchain auditor not available")
        auditor = mod.BlockchainAuditor()
        return JSONResponse({"success": True, "audit": auditor.get_audit_log()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Blockchain audit error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  FEDERATED LEARNING (v3.7.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/federated/status", dependencies=[Depends(require_auth)])
async def api_v25_federated_status():
    """Get federated learning model status."""
    try:
        mod = _omega("federated_learning")
        if not mod:
            raise HTTPException(status_code=503, detail="Federated learning not available")
        fl = mod.FederatedLearning()
        return JSONResponse({"success": True, "status": fl.get_status()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Federated status error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  CHARTERED ACCOUNTANT (v4.0.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/ca/tax-brackets", dependencies=[Depends(require_auth)])
async def api_v25_ca_tax_brackets():
    """Get SARS tax brackets."""
    try:
        mod = _omega("sa_tax_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Tax engine not available")
        engine = mod.SATaxEngine()
        return JSONResponse({"success": True, "brackets": engine.get_brackets()})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA tax brackets error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ca/calculate-paye", dependencies=[Depends(require_auth)])
async def api_v25_ca_calculate_paye(request: Request):
    """Calculate PAYE tax."""
    try:
        mod = _omega("ca_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="CA assistant not available")
        data = json.loads(await request.body())
        assistant = mod.CharteredAccountantAssistant()
        result = assistant.calculate_net_salary(data.get("annual_salary", 0), data.get("deductions", {}))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA PAYE error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ca/calculate-vat", dependencies=[Depends(require_auth)])
async def api_v25_ca_calculate_vat(request: Request):
    """Calculate VAT."""
    try:
        mod = _omega("ca_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="CA assistant not available")
        data = json.loads(await request.body())
        assistant = mod.CharteredAccountantAssistant()
        result = assistant.calculate_vat(data.get("amount", 0), data.get("vat_type", "inclusive"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA VAT error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ca/depreciation", dependencies=[Depends(require_auth)])
async def api_v25_ca_depreciation(request: Request):
    """Calculate depreciation schedule."""
    try:
        mod = _omega("ca_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="CA assistant not available")
        data = json.loads(await request.body())
        assistant = mod.CharteredAccountantAssistant()
        result = assistant.calculate_depreciation(data.get("cost", 0), data.get("method", "straight_line"))
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA depreciation error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ca/financial-ratios", dependencies=[Depends(require_auth)])
async def api_v25_ca_financial_ratios(request: Request):
    """Calculate financial ratios."""
    try:
        mod = _omega("ca_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="CA assistant not available")
        data = json.loads(await request.body())
        assistant = mod.CharteredAccountantAssistant()
        result = assistant.calculate_ratios(
            data.get("current_assets", 0), data.get("current_liabilities", 0),
            data.get("total_assets", 0), data.get("total_liabilities", 0),
            data.get("net_income", 0), data.get("revenue", 0),
            data.get("equity")
        )
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA ratios error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ca/audit-checklist", dependencies=[Depends(require_auth)])
async def api_v25_ca_audit_checklist(entity_type: str = "company"):
    """Get SARS audit checklist."""
    try:
        mod = _omega("ca_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="CA assistant not available")
        assistant = mod.CharteredAccountantAssistant()
        result = assistant.get_audit_checklist(entity_type)
        return JSONResponse({"success": True, **result})
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CA audit checklist error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  TRAINING ENGINE (v4.0.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/training/courses", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_courses(category: str = None, difficulty: str = None):
    """List training courses."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        engine = mod.TrainerEngine()
        result = engine.list_courses(category, difficulty)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training courses error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/courses/{course_id}", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_course(course_id: str):
    """Get a specific course."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        engine = mod.TrainerEngine()
        result = engine.get_course(course_id)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training course error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/training/enroll", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_enroll(request: Request):
    """Enroll a student in a course."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        data = json.loads(await request.body())
        engine = mod.TrainerEngine()
        result = engine.enroll_student(data.get("course_id"), data.get("student_id"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training enroll error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/progress/{student_id}", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_progress(student_id: str, course_id: str = None):
    """Get student progress."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        engine = mod.TrainerEngine()
        result = engine.get_student_progress(student_id, course_id)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training progress error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/training/grade", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_grade(request: Request):
    """Submit and grade an assessment."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        data = json.loads(await request.body())
        engine = mod.TrainerEngine()
        result = engine.grade_assessment(data.get("assessment_id"), data.get("student_id"), data.get("answers", []))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training grade error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/certificates/{student_id}", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_training_certificates(student_id: str):
    """Get student certificates."""
    try:
        mod = _omega("trainer_engine")
        if not mod:
            raise HTTPException(status_code=503, detail="Training engine not available")
        engine = mod.TrainerEngine()
        result = engine.list_certificates(student_id)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training certificates error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  SUPPORT DESK (v4.0.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/support/tickets", dependencies=[Depends(require_auth)])
async def api_v25_support_tickets(status: str = None, category: str = None, priority: str = None):
    """List support tickets."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        desk = mod.SupportDesk()
        result = desk.list_tickets(status=status, category=category, priority=priority)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support tickets error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/support/tickets", dependencies=[Depends(require_auth)])
async def api_v25_support_ticket_create(request: Request):
    """Create a support ticket."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        data = json.loads(await request.body())
        desk = mod.SupportDesk()
        result = desk.create_ticket(data.get("subject"), data.get("description"),
                                     data.get("customer_id"), data.get("category", "general"),
                                     data.get("priority", "medium"), data.get("tags"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support ticket create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/support/tickets/{ticket_id}", dependencies=[Depends(require_auth)])
async def api_v25_support_ticket(ticket_id: str):
    """Get a specific ticket."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        desk = mod.SupportDesk()
        result = desk.get_ticket(ticket_id)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support ticket error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/support/tickets/{ticket_id}/respond", dependencies=[Depends(require_auth)])
async def api_v25_support_ticket_respond(ticket_id: str, request: Request):
    """Add a response to a ticket."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        data = json.loads(await request.body())
        desk = mod.SupportDesk()
        result = desk.add_response(ticket_id, data.get("message"), data.get("responder_id", "user"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support respond error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/support/faqs", dependencies=[Depends(require_auth)])
async def api_v25_support_faqs(category: str = None):
    """Get FAQs."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        desk = mod.SupportDesk()
        result = desk.get_faqs(category)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support FAQs error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/support/faqs/search", dependencies=[Depends(require_auth)])
async def api_v25_support_faq_search(request: Request):
    """Search FAQs."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        data = json.loads(await request.body())
        desk = mod.SupportDesk()
        result = desk.search_faqs(data.get("query", ""))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support FAQ search error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/support/dashboard", dependencies=[Depends(require_auth)])
async def api_v25_support_dashboard():
    """Get support dashboard metrics."""
    try:
        mod = _omega("support_desk")
        if not mod:
            raise HTTPException(status_code=503, detail="Support desk not available")
        desk = mod.SupportDesk()
        result = desk.get_dashboard_metrics()
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Support dashboard error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
