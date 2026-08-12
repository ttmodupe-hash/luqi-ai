"""API Server — FastAPI-based REST API for Omega AI."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth_middleware import AuthMiddleware
from cache_manager import CacheManager
from rate_limiter import RateLimiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.cache = CacheManager()
    app.state.limiter = RateLimiter()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Omega AI API",
    version="29.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "29.1.0"}


@app.get("/")
async def root():
    return {"message": "Omega AI v29.1.0", "docs": "/docs"}


@app.get("/api/v1/status")
async def status(request: Request):
    return {
        "version": "29.1.0",
        "cache_hits": request.app.state.cache.hits if hasattr(request.app.state.cache, "hits") else 0,
    }


@app.post("/api/v1/chat")
async def chat(request: Request, body: dict):
    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt required")
    return {"response": f"Echo: {prompt}"}


@app.get("/api/v1/agents")
async def list_agents():
    return {"agents": []}


@app.post("/api/v1/agents/{agent_id}/task")
async def agent_task(agent_id: str, body: dict):
    return {"agent_id": agent_id, "task_status": "queued"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
