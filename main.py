#!/usr/bin/env python3
"""
Luqi AI v29.1.0 — FastAPI Application Factory
===============================================
The canonical entry point. Mounts all v25 endpoint modules, serves static
files, and provides health monitoring.

Usage:
    python main.py                    # Development (auto-reload)
    python main.py --production       # Production mode
    uvicorn main:app --host 0.0.0.0 --port 8000
    gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

Environment:
    OPENAI_API_KEY=sk-...     (required for AI features)
    LUQI_PORT=8000
    LUQI_HOST=0.0.0.0
    LUQI_ENV=production
    LUQI_CORS_ORIGINS=*
"""

import argparse
import asyncio
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings

# ── Logging ──────────────────────────────────────────────────────────────
logger = logging.getLogger("luqi")


def setup_logging():
    handlers = [logging.StreamHandler(sys.stdout)]
    if settings.log_to_file:
        log_path = settings.LOG_DIR / f"luqi_{datetime.now():%Y%m%d}.log"
        handlers.append(logging.FileHandler(log_path))
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=handlers,
    )


# ── Startup / Shutdown Lifecycle ─────────────────────────────────────────

_start_time = time.time()
_health_status = {"status": "initializing", "checks": {}}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    setup_logging()
    logger.info(f"Luqi AI v{settings.version} '{settings.codename}' starting...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Database: {settings.db_path}")
    logger.info(f"OpenAI model: {settings.openai_model}")

    # Pre-flight checks
    _health_status["checks"]["startup_time"] = datetime.utcnow().isoformat()

    # Check OpenAI
    if settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            # Light validation — list models
            client.models.list()
            _health_status["checks"]["openai"] = "ok"
            logger.info("OpenAI connection: OK")
        except Exception as e:
            _health_status["checks"]["openai"] = f"error: {e}"
            logger.warning(f"OpenAI connection failed: {e}")
    else:
        _health_status["checks"]["openai"] = "no_api_key"
        logger.warning("OPENAI_API_KEY not set — AI features disabled")

    # Check database & run migrations
    try:
        import sqlite3
        from web_core.db.migrations import MigrationManager
        from web_core.db.connection import ConnectionPool

        conn = sqlite3.connect(str(settings.db_path))
        conn.execute("SELECT 1")
        conn.close()
        _health_status["checks"]["database"] = "ok"
        logger.info("Database: OK")

        # Run pending migrations
        pool = ConnectionPool(settings.db_path)
        mgr = MigrationManager(pool, settings.DATA_DIR / "migrations")
        applied = mgr.migrate()
        if applied:
            logger.info("Applied %d migration(s): %s", len(applied), applied)
        logger.info("Database migrated to version: %s", mgr.status()["current_version"])
    except Exception as e:
        _health_status["checks"]["database"] = f"error: {e}"
        logger.error(f"Database check/migration failed: {e}")

    # Check disk space
    try:
        import shutil
        du = shutil.disk_usage(settings.DATA_DIR)
        free_gb = du.free / (1024**3)
        _health_status["checks"]["disk_free_gb"] = round(free_gb, 2)
        if free_gb < 1:
            logger.warning(f"Low disk space: {free_gb:.1f} GB remaining")
    except Exception as e:
        _health_status["checks"]["disk"] = f"error: {e}"

    _health_status["status"] = "healthy"
    logger.info("Luqi AI startup complete — ready for requests")

    yield  # Application runs here

    # Shutdown
    logger.info("Luqi AI shutting down...")
    _health_status["status"] = "shutting_down"


# ── FastAPI App ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Luqi AI",
    description="LUQI AI — 90+ AI-powered capabilities for South Africa. Finance, tenders, load shedding, health, education, crypto, and more.",
    version=f"{settings.version}-{settings.codename}",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url="/api/redoc" if settings.environment != "production" else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Mount Routers ────────────────────────────────────────────────────────

def mount_routers():
    """Dynamically mount all v25 endpoint modules."""
    mounted = []

    # v25 Prometheus endpoints (main router + 2 continuation parts)
    try:
        from backend import v25_endpoints
        app.include_router(v25_endpoints.router, prefix="/api/v25")
        mounted.append("v25_endpoints")
        logger.info("Mounted: v25_endpoints at /api/v25")
    except Exception as e:
        logger.warning(f"Failed to mount v25_endpoints: {e}")

    try:
        from backend import v25_endpoints_b
        app.include_router(v25_endpoints_b.router, prefix="/api/v25")
        mounted.append("v25_endpoints_b")
        logger.info("Mounted: v25_endpoints_b at /api/v25")
    except Exception as e:
        logger.warning(f"Failed to mount v25_endpoints_b: {e}")

    try:
        from backend import v25_endpoints_c
        app.include_router(v25_endpoints_c.router, prefix="/api/v25")
        mounted.append("v25_endpoints_c")
        logger.info("Mounted: v25_endpoints_c at /api/v25")
    except Exception as e:
        logger.warning(f"Failed to mount v25_endpoints_c: {e}")

    # Feedback & activity tracking API
    try:
        from backend import feedback_api
        app.include_router(feedback_api.router)
        mounted.append("feedback_api")
        logger.info("Mounted: feedback_api")
    except Exception as e:
        logger.warning(f"Failed to mount feedback_api: {e}")

    # v25.1 LUQI Agent endpoints
    try:
        from backend import v25_luqi_endpoints
        app.include_router(v25_luqi_endpoints.router, prefix="/api/v25/luqi")
        mounted.append("v25_luqi_endpoints")
        logger.info("Mounted: v25_luqi_endpoints at /api/v25/luqi")
    except Exception as e:
        logger.warning(f"Failed to mount v25_luqi_endpoints: {e}")

    # Favorites API (bookmarks for frequently used capabilities)
    try:
        from backend.favorites_api import router as favorites_router
        app.include_router(favorites_router)
        mounted.append("favorites_api")
        logger.info("Mounted: favorites_api")
    except Exception as e:
        logger.warning(f"Failed to mount favorites_api: {e}")

    # Omega AI capability endpoints (unique capabilities)
    try:
        from backend.omega_routes import router as omega_router
        app.include_router(omega_router, prefix="/api/v25")
        mounted.append("omega_routes")
        logger.info("Mounted: omega_routes at /api/v25")
    except Exception as e:
        logger.warning(f"Failed to mount omega_routes: {e}")

    # Omega AI standalone server endpoints
    try:
        from omega_ai import api_server as omega_api
        app.include_router(omega_api.router, prefix="/api/omega")
        mounted.append("omega_ai")
        logger.info("Mounted: omega_ai at /api/omega")
    except Exception as e:
        logger.warning(f"Failed to mount omega_ai: {e}")

    # Crypto endpoints (market data, SARS tax, portfolio, AI analysis)
    try:
        from backend.crypto_endpoints import router as crypto_router
        app.include_router(crypto_router, prefix="/api/v25")
        mounted.append("crypto_endpoints")
        logger.info("Mounted: crypto_endpoints at /api/v25")
    except Exception as e:
        logger.warning(f"Failed to mount crypto_endpoints: {e}")

    # Legacy router
    try:
        from backend import router as legacy_router
        app.include_router(legacy_router.router, prefix="/api")
        mounted.append("legacy_router")
        logger.info("Mounted: legacy_router at /api")
    except Exception as e:
        logger.warning(f"Failed to mount legacy_router: {e}")

    _health_status["checks"]["mounted_routers"] = mounted
    return mounted


# ── Static Files ─────────────────────────────────────────────────────────

def mount_static():
    """Mount static file directories."""
    # Docker production: static files from Vite build
    static_dir = settings.PROJECT_ROOT / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
        logger.info(f"Mounted static files: {static_dir} at /")
        return
    # Local dev: web/v25 directory
    web_dir = settings.PROJECT_ROOT / "web" / "v25"
    if web_dir.exists():
        app.mount("/v25", StaticFiles(directory=str(web_dir), html=True), name="v25_web")
        logger.info(f"Mounted static files: {web_dir} at /v25")

    # Also mount root web if exists
    root_web = settings.PROJECT_ROOT / "web"
    if root_web.exists() and root_web != web_dir.parent:
        app.mount("/web", StaticFiles(directory=str(root_web), html=True), name="web")


# ── Core Endpoints ───────────────────────────────────────────────────────

@app.get("/", tags=["root"])
async def root():
    """Root endpoint — redirects to dashboard."""
    return {
        "name": "Luqi AI",
        "version": settings.version,
        "codename": settings.codename,
        "status": _health_status["status"],
        "dashboard": "/v25/index.html",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/health", tags=["health"])
async def health():
    """
    Health check endpoint for load balancers, Docker, and monitoring.
    Returns 200 if all critical services are healthy, 503 otherwise.
    """
    uptime = round(time.time() - _start_time, 1)
    critical_ok = all(
        v == "ok" for k, v in _health_status["checks"].items()
        if k in ("database",)
    )

    response_body = {
        "status": "healthy" if critical_ok else "degraded",
        "version": settings.version,
        "codename": settings.codename,
        "environment": settings.environment,
        "uptime_seconds": uptime,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": _health_status["checks"],
    }

    status_code = status.HTTP_200_OK if critical_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(content=response_body, status_code=status_code)


@app.get("/ready", tags=["health"])
async def ready():
    """Readiness probe — returns 200 when ready to accept traffic."""
    if _health_status["status"] == "healthy":
        return {"ready": True}
    return JSONResponse(
        content={"ready": False, "status": _health_status["status"]},
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@app.get("/config", tags=["system"])
async def get_config():
    """Get non-sensitive configuration."""
    return settings.health_info()


# ── WebSocket Endpoint ───────────────────────────────────────────────────

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            session_id = data.get("session_id", "default")
            # Simple echo with typing indicator
            await websocket.send_json({"type": "typing", "session_id": session_id})
            await asyncio.sleep(0.5)
            await websocket.send_json({
                "type": "message",
                "content": f"Echo: {message}",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


# ── Error Handlers ───────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "timestamp": datetime.utcnow().isoformat()},
    )


# ── Mount everything on startup ──────────────────────────────────────────

mounted_routers = mount_routers()
mount_static()

logger.info(f"Luqi AI v{settings.version} initialized with {len(mounted_routers)} router modules")


# ── CLI Entry Point ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Luqi AI Server")
    parser.add_argument("--production", "-p", action="store_true", help="Production mode (no reload)")
    parser.add_argument("--host", default=settings.host, help="Bind host")
    parser.add_argument("--port", type=int, default=settings.port, help="Bind port")
    parser.add_argument("--workers", type=int, default=settings.workers, help="Worker processes")
    args = parser.parse_args()

    import uvicorn

    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        workers=args.workers if args.production else 1,
        reload=not args.production and settings.reload,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
