#!/usr/bin/env python3
"""
Luqi AI Root Router — Central API router for the LUQI AI system.
Aggregates all endpoint modules and provides unified API access.
"""

from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Create main router
router = APIRouter()

# Import and include sub-routers
try:
    from backend.v25_endpoints import router as v25_router
    router.include_router(v25_router, prefix="/api/v25")
    logger.info("v25 endpoints loaded")
except ImportError as e:
    logger.warning(f"v25 endpoints not available: {e}")

try:
    from backend.v25_luqi_endpoints import router as luqi_router
    router.include_router(luqi_router, prefix="/api/v25/luqi")
    logger.info("v25 LUQI endpoints loaded")
except ImportError as e:
    logger.warning(f"v25 LUQI endpoints not available: {e}")

try:
    from web_core.routes import router as web_core_router
    router.include_router(web_core_router, prefix="/api/webcore")
    logger.info("web_core endpoints loaded")
except ImportError as e:
    logger.warning(f"web_core endpoints not available: {e}")

# Root endpoint
@router.get("/")
async def root():
    return {
        "name": "Luqi AI",
        "version": "25.2.0",
        "codename": "Modular LUQI",
        "status": "operational",
        "endpoints": ["/api/v25", "/api/v25/luqi", "/api/webcore"]
    }

@router.get("/health")
async def health():
    return {"status": "healthy", "service": "luqi-ai"}
