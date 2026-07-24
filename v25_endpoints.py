#!/usr/bin/env python3
"""
Luqi AI v25 Root API Endpoints — Main FastAPI application entry point.
Combines all backend modules into a unified API server.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Luqi AI API",
    description="Unified API for Luqi AI v25 — Modular LUQI",
    version="25.2.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
try:
    from router import router as main_router
    app.include_router(main_router)
    logger.info("Main router loaded")
except ImportError as e:
    logger.warning(f"Main router not available: {e}")

# Direct v25 endpoints (fallback)
try:
    from backend.v25_endpoints import router as v25_router
    app.include_router(v25_router, prefix="/api/v25")
    logger.info("v25 endpoints loaded")
except ImportError as e:
    logger.warning(f"v25 endpoints not available: {e}")

# Startup/shutdown
@app.on_event("startup")
async def startup():
    logger.info("Luqi AI v25.2.0 starting up...")

@app.on_event("shutdown")
async def shutdown():
    logger.info("Luqi AI shutting down...")

# Root
@app.get("/")
async def root():
    return {
        "name": "Luqi AI",
        "version": "25.2.0",
        "codename": "Modular LUQI",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "25.2.0"}
