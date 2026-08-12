"""Startup and shutdown event handlers for LUQI AI"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI

from backend.db import init_db, close_db
from backend.cache import cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    await startup()
    yield
    # Shutdown
    await shutdown()


async def startup():
    """Run startup tasks."""
    print("=" * 50)
    print("LUQI AI v29.1.0 - Starting up...")
    print("=" * 50)
    
    # Initialize database
    try:
        await init_db()
        print("✓ Database initialized")
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
    
    # Initialize cache
    try:
        await cache.connect()
        print("✓ Cache connected")
    except Exception as e:
        print(f"✗ Cache connection failed: {e}")
    
    # Load models
    try:
        from backend.nemotron_provider import nemotron_provider
        print("✓ AI providers loaded")
    except Exception as e:
        print(f"✗ AI provider loading failed: {e}")
    
    print("=" * 50)
    print("LUQI AI is ready!")
    print("=" * 50)


async def shutdown():
    """Run shutdown tasks."""
    print("=" * 50)
    print("LUQI AI - Shutting down...")
    print("=" * 50)
    
    # Close database
    try:
        await close_db()
        print("✓ Database connections closed")
    except Exception as e:
        print(f"✗ Database shutdown error: {e}")
    
    # Close cache
    try:
        await cache.clear()
        print("✓ Cache cleared")
    except Exception as e:
        print(f"✗ Cache shutdown error: {e}")
    
    print("=" * 50)
    print("LUQI AI shutdown complete.")
    print("=" * 50)
