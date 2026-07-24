#!/usr/bin/env python3
"""
Luqi AI v25.1.2 — FastAPI Application Factory
===============================================
The canonical entry point. Mounts all v25 endpoint modules, serves static
files, and wires up middleware.

Usage:
    python main.py              # uvicorn on 0.0.0.0:8000
    python main.py --desktop    # desktop mode with pywebview
"""

from __future__ import annotations

import argparse
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# ---------------------------------------------------------------------------
# Project root must be on sys.path so that `import backend`, `import web_core`
# etc. resolve correctly regardless of cwd.
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent.resolve()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from config import CORS_ORIGINS, DEBUG, STATIC_DIR  # local project config.py

logger = logging.getLogger("luqi.main")

# ---------------------------------------------------------------------------
# Lifespan — init / teardown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: runs once on startup and once on shutdown."""
    # ---- Startup -----------------------------------------------------------
    from backend.router import router as backend_router  # deferred import
    app.include_router(backend_router, prefix="/api/v25")

    # Attempt to mount the modular web_core routes (import may fail if deps
    # are missing — we swallow the error so the legacy endpoints still work).
    try:
        from web_core.routes import app as web_core_app
        # web_core_app is a standalone FastAPI app; we mount its routes.
        for route in web_core_app.routes:
            app.routes.append(route)
        logger.info("web_core routes mounted (%d routes)", len(web_core_app.routes))
    except Exception as exc:
        logger.warning("web_core not available: %s", exc)

    logger.info("Luqi AI v25.1.2 started — debug=%s", DEBUG)
    yield
    # ---- Shutdown ----------------------------------------------------------
    logger.info("Luqi AI v25.1.2 shutting down")

# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title="Luqi AI",
        description="Unified AI Platform — Web / Desktop / Mobile",
        version="25.1.2",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- Static files ------------------------------------------------------
    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    # ---- Health ------------------------------------------------------------
    @app.get("/health")
    async def health():
        return {"status": "healthy", "version": "25.1.2"}

    @app.get("/ready")
    async def ready():
        return {"status": "ready"}

    @app.get("/")
    async def root():
        return {
            "name": "Luqi AI",
            "version": "25.1.2",
            "docs": "/docs",
            "health": "/health",
        }

    # ---- Global exception handler ------------------------------------------
    @app.exception_handler(Exception)
    async def _global_exc(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "path": request.url.path},
        )

    return app

app = create_app()

# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Luqi AI Web Server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--desktop", action="store_true", help="Launch desktop GUI")
    args = parser.parse_args()

    if args.desktop:
        _launch_desktop(args.port)
    else:
        import uvicorn
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=DEBUG,
            log_level="debug" if DEBUG else "info",
        )

def _launch_desktop(port: int):
    """Launch the desktop wrapper (pywebview) pointing at localhost."""
    import multiprocessing
    import time
    import uvicorn

    p = multiprocessing.Process(
        target=lambda: uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
    )
    p.start()
    time.sleep(2)  # let the server come up

    try:
        import webview
        webview.create_window("Luqi AI", f"http://127.0.0.1:{port}")
        webview.start()
    except ImportError:
        logger.error("pywebview not installed. Run: pip install pywebview")
    finally:
        p.terminate()

if __name__ == "__main__":
    main()
