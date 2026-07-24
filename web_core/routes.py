"""
web_core.routes - FastAPI HTTP routes (thin layer).
All business logic lives in agents; this file only maps HTTP to agent calls.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Ensure web_core package is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from web_core.config import ADMIN_KEY, CORS_ORIGINS, DATA_DIR, DB_FILE, SANDBOX_DIR, STATIC_DIR, VERSION
from web_core.db.connection import ConnectionPool
from web_core.db.conversations import ConversationStore
from web_core.db.documents import DocumentStore
from web_core.db.capabilities import CapabilityStore
from web_core.engines.document import DocumentEngine
from web_core.engines.voice import VoiceEngine
from web_core.engines.youtube import YoutubeEngine
from web_core.engines.wealth import WealthEngine
from web_core.agents.chat import ChatAgent
from web_core.agents.document import DocumentAgent
from web_core.agents.voice import VoiceAgent
from web_core.agents.youtube import YoutubeAgent
from web_core.agents.wealth import WealthAgent
from web_core.agents.system import SystemAgent
from web_core.security.auth import AuthManager
from web_core.security.rate_limit import TokenBucketRateLimiter
from web_core.security.audit import SqliteAuditLogger

logger = logging.getLogger("luqi.routes")

# -- Global state (initialized in lifespan) ----------------------------------

pool: ConnectionPool | None = None
auth: AuthManager | None = None
rate_limiter: TokenBucketRateLimiter | None = None
audit: SqliteAuditLogger | None = None

chat_agent: ChatAgent | None = None
doc_agent: DocumentAgent | None = None
voice_agent: VoiceAgent | None = None
youtube_agent: YoutubeAgent | None = None
wealth_agent: WealthAgent | None = None
system_agent: SystemAgent | None = None

# -- Auth dependencies -------------------------------------------------------

public_paths = {"/", "/health", "/ready", "/config", "/auth/me", "/docs", "/openapi.json", "/redoc", "/static"}

async def require_auth(request: Request):
    if request.url.path in public_paths or request.url.path.startswith("/static/"):
        return None
    key = request.headers.get("x-api-key", "")
    if not key:
        raise HTTPException(status_code=401, detail="x-api-key header required")
    info = auth.validate(key)
    if info is None:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not rate_limiter.check(info["hash"]):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return info

async def require_admin(request: Request):
    key = request.headers.get("x-api-key", "")
    if not key:
        raise HTTPException(status_code=401, detail="x-api-key header required")
    if not auth.is_admin(key):
        raise HTTPException(status_code=403, detail="Admin access required")
    return key

# -- Request logging middleware ----------------------------------------------

async def audit_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    latency = (time.time() - start) * 1000
    key = request.headers.get("x-api-key", "anonymous")
    key_hash = "admin" if auth and auth.is_admin(key) else "anonymous" if key == "anonymous" else "..."
    if audit:
        audit.log(key_hash, request.method, request.url.path, response.status_code, latency)
    response.headers["X-Response-Time-Ms"] = str(int(latency))
    return response

# -- Lifespan ----------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool, auth, rate_limiter, audit
    global chat_agent, doc_agent, voice_agent, youtube_agent, wealth_agent, system_agent

    pool = ConnectionPool(DB_FILE)
    auth = AuthManager(pool, ADMIN_KEY)
    rate_limiter = TokenBucketRateLimiter(pool)
    audit = SqliteAuditLogger(pool)

    conv_store = ConversationStore(pool)
    doc_store = DocumentStore(pool)
    cap_store = CapabilityStore(pool)

    chat_agent = ChatAgent(conv_store)
    doc_agent = DocumentAgent(DocumentEngine(SANDBOX_DIR), doc_store)
    voice_agent = VoiceAgent(VoiceEngine())
    youtube_agent = YoutubeAgent(YoutubeEngine(), pool)
    wealth_agent = WealthAgent(WealthEngine(), pool)
    system_agent = SystemAgent(pool, Path(__file__).parent.parent, VERSION)

    logger.info("LUQI v%s initialized — %d capabilities active", VERSION, cap_store.count_active())
    yield
    logger.info("LUQI v%s shutting down", VERSION)

# -- App factory -------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title="Luqi AI",
        description="Unified AI Platform — Web, Desktop, Mobile",
        version=VERSION,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app

app = create_app()

# -- Public routes -----------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text())
    return HTMLResponse(content=f"<h1>Luqi AI v{VERSION}</h1><p>Dashboard not found.</p>")

@app.get("/health")
async def health():
    h = system_agent.health() if system_agent else {}
    return {"status": "healthy", "version": VERSION, **(h.__dict__ if hasattr(h, '__dict__') else {})}

@app.get("/ready")
async def ready():
    return {"status": "ready", "agent_initialized": chat_agent is not None}

@app.get("/config")
async def config():
    v = voice_agent
    return {
        "version": VERSION,
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "claude-sonnet", "claude-haiku", "local-llama"],
        "accents": v.supported_accents() if v else [],
        "doc_types": sorted(doc_agent.supported_types()) if doc_agent else [],
        "features": {
            "voice_stt": v.stt_available if v else False,
            "voice_tts": v.tts_available if v else False,
            "ai": chat_agent.ai_available if chat_agent else False,
        },
    }

@app.get("/auth/me")
async def auth_me():
    return {"authenticated": False, "message": "Provide x-api-key header"}

# -- Auth management ---------------------------------------------------------

@app.post("/auth/keys")
async def create_key(request: Request):
    key = request.headers.get("x-api-key", "")
    if not auth.is_admin(key):
        raise HTTPException(status_code=403, detail="Admin required")
    body = await request.json()
    new_key = auth.create_key(name=body.get("name", "default"), is_admin=body.get("is_admin", False))
    return {"api_key": new_key}

@app.get("/admin/keys")
async def list_keys(request: Request):
    await require_admin(request)
    return {"keys": auth.list_keys()}

@app.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    return system_agent.health().__dict__ if system_agent else {}

@app.get("/admin/requests")
async def admin_requests(request: Request, limit: int = 100):
    await require_admin(request)
    return {"requests": audit.get_recent(limit)}

# -- Chat -------------------------------------------------------------------

@app.post("/chat")
async def chat_endpoint(request: Request):
    await require_auth(request)
    body = await request.json()
    result = await chat_agent.chat(
        body.get("message", ""),
        body.get("session_id", "default"),
        body.get("model", "gpt-4o-mini")
    )
    return result

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")
            if msg_type == "init":
                sid = data.get("session_id", "default")
                await websocket.send_json({"type": "system", "content": f"Session {sid} started"})
            elif msg_type == "message":
                result = await chat_agent.chat(
                    data.get("message", ""),
                    data.get("session_id", "default"),
                    data.get("model", "gpt-4o-mini")
                )
                await websocket.send_json({"type": "response", "content": result["reply"], "model": result["model"]})
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass

# -- Sessions ---------------------------------------------------------------

@app.get("/sessions")
async def list_sessions(request: Request):
    await require_auth(request)
    return {"sessions": chat_agent.store.get_all_sessions() if chat_agent else []}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, request: Request):
    await require_auth(request)
    history = chat_agent.get_history(session_id) if chat_agent else []
    return {"session_id": session_id, "messages": [{"role": h.role, "content": h.content, "timestamp": h.timestamp, "model": h.model} for h in history]}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request):
    await require_auth(request)
    chat_agent.clear_session(session_id)
    return {"deleted": True}

# -- Uploads & Documents ----------------------------------------------------

@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await require_auth(request)
    if not doc_agent:
        raise HTTPException(status_code=503, detail="Document agent not initialized")
    filepath = DATA_DIR / "uploads" / (file.filename or "unnamed")
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    result = doc_agent.process_upload(filepath)
    return result

@app.get("/documents")
async def list_documents(request: Request):
    await require_auth(request)
    return {"documents": doc_agent.get_documents() if doc_agent else []}

# -- Voice ------------------------------------------------------------------

@app.post("/voice/tts")
async def text_to_speech(request: Request):
    await require_auth(request)
    body = await request.json()
    try:
        audio = voice_agent.text_to_speech(body.get("text", ""), body.get("accent", "american"))
        return StreamingResponse(__import__("io").BytesIO(audio), media_type="audio/mpeg")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/voice/stt")
async def speech_to_text(request: Request):
    await require_auth(request)
    body = await request.json()
    try:
        text = voice_agent.speech_to_text(body.get("audio", ""))
        return {"text": text}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

# -- Capabilities -----------------------------------------------------------

@app.get("/capabilities")
async def list_capabilities(request: Request):
    await require_auth(request)
    cap_store = CapabilityStore(pool)
    caps = cap_store.list_all()
    return {
        "capabilities": [{"id": c.id, "name": c.name, "status": c.status.value, "category": c.category, "description": c.description} for c in caps],
        "summary": {"active": cap_store.count_active(), "planned": cap_store.count_planned()}
    }

# -- YouTube ----------------------------------------------------------------

@app.post("/youtube/campaign")
async def youtube_campaign(request: Request):
    await require_auth(request)
    body = await request.json()
    return youtube_agent.create_campaign(
        body.get("niche", "technology"), body.get("target_audience", "beginners"),
        body.get("video_count", 30)
    )

@app.get("/youtube/campaigns")
async def list_youtube_campaigns(request: Request):
    await require_auth(request)
    return {"campaigns": youtube_agent.list_campaigns()}

@app.post("/youtube/thumbnail")
async def youtube_thumbnail(request: Request):
    await require_auth(request)
    body = await request.json()
    return {"prompt": youtube_agent.generate_thumbnail(body.get("title", ""))}

@app.post("/youtube/script")
async def youtube_script(request: Request):
    await require_auth(request)
    body = await request.json()
    return youtube_agent.generate_script(body.get("topic", ""), body.get("duration_minutes", 10))

# -- Wealth -----------------------------------------------------------------

@app.post("/wealth/funnel")
async def wealth_funnel(request: Request):
    await require_auth(request)
    body = await request.json()
    return wealth_agent.create_funnel(
        body.get("niche", "tech"), body.get("audience_size", 10000), body.get("content_type", "videos")
    )

@app.get("/wealth/funnels")
async def list_wealth_funnels(request: Request):
    await require_auth(request)
    return {"funnels": wealth_agent.list_funnels()}

@app.post("/wealth/sponsors")
async def wealth_sponsors(request: Request):
    await require_auth(request)
    body = await request.json()
    return wealth_agent.find_sponsors(body.get("niche", "tech"), body.get("subscriber_count", 50000))

@app.post("/wealth/pricing")
async def wealth_pricing(request: Request):
    await require_auth(request)
    body = await request.json()
    return {"pricing": wealth_agent.create_pricing(body.get("product_name", ""), body.get("value_propositions", []))}

# -- Self-Improvement -------------------------------------------------------

@app.get("/self-improve/report")
async def self_improve_report(request: Request):
    await require_auth(request)
    return {"report": system_agent.generate_improvement_report()}

@app.get("/self-improve/analyze")
async def self_improve_analyze(request: Request):
    await require_auth(request)
    return {"files": system_agent.analyze_project()}

# -- System -----------------------------------------------------------------

@app.get("/update/status")
async def update_status(request: Request):
    await require_auth(request)
    return {"git": system_agent.git_status(), "last_commit": system_agent.last_commit()}

# -- Metrics ----------------------------------------------------------------

@app.get("/metrics")
async def prometheus_metrics():
    return PlainTextResponse(content=system_agent.metrics_prometheus() if system_agent else "")

# -- Webhooks ---------------------------------------------------------------

@app.post("/webhooks")
async def create_webhook(request: Request):
    await require_auth(request)
    body = await request.json()
    cur = pool.execute(
        "INSERT INTO webhooks (url, event_type, secret) VALUES (?, ?, ?)",
        (body.get("url", ""), body.get("event_type", "*"), body.get("secret", ""))
    )
    return {"webhook_id": cur.lastrowid}

@app.get("/webhooks")
async def list_webhooks(request: Request):
    await require_auth(request)
    rows = pool.fetchall("SELECT id, url, event_type, created_at FROM webhooks")
    return {"webhooks": [dict(r) for r in rows]}

# -- Export / Import --------------------------------------------------------

@app.get("/export/{fmt}")
async def export_data(fmt: str, request: Request):
    await require_auth(request)
    sessions = chat_agent.store.get_all_sessions() if chat_agent else []
    if fmt == "json":
        return JSONResponse(content={"sessions": sessions})
    elif fmt == "csv":
        import csv, io
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(["session_id", "message_count", "last_active"])
        for s in sessions:
            w.writerow([s["session_id"], s["message_count"], s["last_active"]])
        return PlainTextResponse(content=out.getvalue(), media_type="text/csv")
    elif fmt == "markdown":
        lines = ["# LUQI Export\n"]
        for s in sessions:
            lines.append(f"## {s['session_id']}\n")
            for h in chat_agent.get_history(s["session_id"], 10) if chat_agent else []:
                lines.append(f"**{h.role}**: {h.content[:200]}\n")
        return PlainTextResponse(content="\n".join(lines), media_type="text/markdown")
    raise HTTPException(status_code=400, detail="Format must be json, csv, or markdown")

# -- Static files -----------------------------------------------------------

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# -- Main entrypoint --------------------------------------------------------

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Luqi AI Web Server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--desktop", action="store_true")
    args = parser.parse_args()

    if args.desktop:
        from web_core.desktop import DesktopApp
        import multiprocessing
        p = multiprocessing.Process(target=lambda: uvicorn.run(app, host="127.0.0.1", port=8000))
        p.start()
        import time
        time.sleep(2)
        DesktopApp().run()
        p.terminate()
    else:
        uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
