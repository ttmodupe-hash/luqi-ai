"""Health check endpoints for LUQI AI"""
import os
import time
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/health", tags=["Health"])

# Startup time
_start_time = time.time()


@router.get("/")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "version": os.environ.get("APP_VERSION", "29.1.0"),
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": int(time.time() - _start_time),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness probe for Kubernetes."""
    # Check critical dependencies
    checks = {}
    
    # Database check
    try:
        from backend.db import check_db_health
        db_health = await check_db_health()
        checks["database"] = db_health["status"]
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
    
    # Cache check
    try:
        from backend.cache import cache
        await cache.set("health_check", "ok", ttl=5)
        val = await cache.get("health_check")
        checks["cache"] = "healthy" if val == "ok" else "unhealthy"
    except Exception as e:
        checks["cache"] = f"unhealthy: {str(e)}"
    
    all_healthy = all(v == "healthy" for v in checks.values())
    
    if not all_healthy:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "checks": checks},
        )
    
    return {"status": "ready", "checks": checks}


@router.get("/live")
async def liveness_check():
    """Liveness probe for Kubernetes."""
    return {"status": "alive"}


@router.get("/detailed")
async def detailed_health() -> Dict[str, Any]:
    """Detailed health check with all subsystems."""
    checks = {
        "api": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": int(time.time() - _start_time),
    }
    
    # Database
    try:
        from backend.db import check_db_health
        db_health = await check_db_health()
        checks["database"] = db_health
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
    
    # Cache
    try:
        from backend.cache import cache
        await cache.set("health_check", "ok", ttl=5)
        val = await cache.get("health_check")
        checks["cache"] = {"status": "healthy" if val == "ok" else "unhealthy"}
    except Exception as e:
        checks["cache"] = {"status": "unhealthy", "error": str(e)}
    
    # Celery
    try:
        from backend.celery_app import celery_app
        checks["celery"] = {"status": "healthy", "broker": str(celery_app.conf.broker_url)}
    except Exception as e:
        checks["celery"] = {"status": "unhealthy", "error": str(e)}
    
    # Disk space
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        checks["disk"] = {
            "status": "healthy",
            "total_gb": total // (2**30),
            "used_gb": used // (2**30),
            "free_gb": free // (2**30),
            "percent_used": round(used / total * 100, 1),
        }
    except Exception as e:
        checks["disk"] = {"status": "unhealthy", "error": str(e)}
    
    return checks
