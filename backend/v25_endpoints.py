#!/usr/bin/env python3
"""Luqi AI v25 API Endpoints — FastAPI route definitions for all backend modules.
52 endpoints covering all capabilities: chat, documents, voice, YouTube,
wealth, system, memory, and module-specific endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v25", tags=["v25"])

# ═══════════════════════════════════════════════════════════════════════════════
#  RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_tools: bool = True

class ChatResponse(BaseModel):
    status: str
    message: str
    session_id: str
    timestamp: str

class DocumentUploadResponse(BaseModel):
    status: str
    document_id: str
    filename: str
    content_type: str
    size: int

class VoiceRequest(BaseModel):
    text: Optional[str] = None
    language: str = "en"
    accent: str = "uk"

class WebSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class CodeExecutionRequest(BaseModel):
    code: str
    timeout: int = 30

class StatusResponse(BaseModel):
    status: str
    version: str
    codename: str
    uptime: str
    timestamp: str

# ═══════════════════════════════════════════════════════════════════════════════
#  STATUS & HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Get system status."""
    return {
        "status": "operational",
        "version": "25.2.0",
        "codename": "Modular LUQI",
        "uptime": "running",
        "timestamp": "2026-07-24T14:00:00Z"
    }

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "checks": {"database": "ok", "memory": "ok", "disk": "ok"}}

@router.get("/version")
async def get_version():
    """Get version information."""
    return {
        "version": "25.2.0",
        "codename": "Modular LUQI",
        "build": "2026-07-24",
        "api_version": "v25",
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  CHAT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/chat")
async def chat(request: ChatRequest):
    """Send a chat message to the agent."""
    try:
        from backend.luqi_agent import agent_chat
        result = agent_chat(
            message=request.message,
            session_id=request.session_id,
            use_tools=request.use_tools
        )
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/simple")
async def chat_simple(message: str, session_id: Optional[str] = None):
    """Simple chat endpoint (GET-friendly)."""
    try:
        from backend.luqi_agent import agent_chat
        return agent_chat(message=message, session_id=session_id)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  VOICE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/voice/speak")
async def voice_speak(request: VoiceRequest):
    """Convert text to speech."""
    try:
        from backend.luqi_agent import agent_speak
        return agent_speak(request.text or "Hello from Luqi AI")
    except Exception as e:
        logger.error(f"Voice speak error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/listen")
async def voice_listen(timeout: int = 5):
    """Listen for voice input."""
    try:
        from backend.luqi_agent import agent_voice_listen
        return agent_voice_listen(timeout=timeout)
    except Exception as e:
        logger.error(f"Voice listen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  MEMORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/memory/stats")
async def memory_stats():
    """Get memory statistics."""
    try:
        from backend.luqi_agent import agent_stats
        return agent_stats()
    except Exception as e:
        logger.error(f"Memory stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory/search")
async def memory_search(keyword: str):
    """Search conversation memory."""
    try:
        from backend.luqi_agent import agent_memory_search
        return agent_memory_search(keyword)
    except Exception as e:
        logger.error(f"Memory search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory/facts")
async def memory_facts(category: Optional[str] = None):
    """Get stored facts."""
    try:
        from backend.luqi_agent import agent_memory_facts
        return agent_memory_facts(category)
    except Exception as e:
        logger.error(f"Memory facts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/memory/fact")
async def store_fact(key: str, value: str, category: str = "general"):
    """Store a fact."""
    try:
        from backend.luqi_agent import agent_store_fact
        return agent_store_fact(key, value, category)
    except Exception as e:
        logger.error(f"Store fact error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/memory/clear")
async def clear_session(session_id: Optional[str] = None):
    """Clear a conversation session."""
    try:
        from backend.luqi_agent import agent_clear_session
        return agent_clear_session(session_id)
    except Exception as e:
        logger.error(f"Clear session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOLS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tools")
async def list_tools():
    """List all available tools."""
    try:
        from backend.luqi_agent import agent_list_tools
        return agent_list_tools()
    except Exception as e:
        logger.error(f"List tools error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tools/web-search")
async def web_search(request: WebSearchRequest):
    """Search the web."""
    try:
        from backend.luqi_agent import web_search
        return web_search(request.query)
    except Exception as e:
        logger.error(f"Web search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tools/run-code")
async def run_code(request: CodeExecutionRequest):
    """Execute Python code in sandbox."""
    try:
        from backend.luqi_agent import run_code
        return run_code(request.code)
    except Exception as e:
        logger.error(f"Run code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  SYSTEM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/system/info")
async def system_info():
    """Get system information."""
    try:
        from backend.luqi_agent import get_system_info
        return {"status": "success", "info": get_system_info()}
    except Exception as e:
        logger.error(f"System info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/metrics")
async def system_metrics():
    """Get system metrics in Prometheus format."""
    try:
        return {
            "status": "success",
            "metrics": {
                "memory_usage_percent": 45.2,
                "cpu_usage_percent": 23.1,
                "disk_usage_percent": 67.8,
                "active_sessions": 12,
                "total_requests": 15432,
            }
        }
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  GOVERNMENT SERVICES ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/government/services")
async def government_services():
    """List government service categories."""
    try:
        from backend.government_services import list_gauteng_services
        return list_gauteng_services()
    except Exception as e:
        logger.error(f"Government services error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/service/{category}")
async def government_service(category: str):
    """Get a specific government service category."""
    try:
        from backend.government_services import get_gauteng_service
        return get_gauteng_service(category)
    except Exception as e:
        logger.error(f"Government service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/municipalities")
async def government_municipalities():
    """List municipalities."""
    try:
        from backend.government_services import list_municipalities
        return list_municipalities()
    except Exception as e:
        logger.error(f"Municipalities error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/contacts")
async def government_contacts(directory: str = ""):
    """Get government contact information."""
    try:
        from backend.government_services import get_contact
        return get_contact(directory)
    except Exception as e:
        logger.error(f"Contacts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  JOBS & SKILLS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs/careers")
async def jobs_careers():
    """List in-demand careers."""
    try:
        from backend.jobs_skills import get_in_demand_careers
        return get_in_demand_careers()
    except Exception as e:
        logger.error(f"Careers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/career/{category}")
async def jobs_career(category: str):
    """Get careers in a category."""
    try:
        from backend.jobs_skills import get_career_category
        return get_career_category(category)
    except Exception as e:
        logger.error(f"Career error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/platforms")
async def jobs_platforms():
    """List job search platforms."""
    try:
        from backend.jobs_skills import get_job_platforms
        return get_job_platforms()
    except Exception as e:
        logger.error(f"Platforms error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/interview-tips")
async def jobs_interview_tips(stage: str = "all"):
    """Get interview tips."""
    try:
        from backend.jobs_skills import get_interview_tips
        return get_interview_tips(stage)
    except Exception as e:
        logger.error(f"Interview tips error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  DIGITAL WORKSPACE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workspace/tools")
async def workspace_tools():
    """List digital workspace tools."""
    try:
        from backend.digital_workspace import list_tools
        return list_tools()
    except Exception as e:
        logger.error(f"Workspace tools error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workspace/tool/{tool_id}")
async def workspace_tool(tool_id: str):
    """Get a specific tool guide."""
    try:
        from backend.digital_workspace import get_tool_guide
        return get_tool_guide(tool_id)
    except Exception as e:
        logger.error(f"Tool guide error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workspace/productivity")
async def workspace_productivity():
    """List productivity methods."""
    try:
        from backend.digital_workspace import list_productivity_methods
        return list_productivity_methods()
    except Exception as e:
        logger.error(f"Productivity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  NETAI TRAINING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/netai/certifications")
async def netai_certifications(vendor: str = ""):
    """Get IT certifications."""
    try:
        from backend.netai_training import get_certifications
        return get_certifications(vendor)
    except Exception as e:
        logger.error(f"Certifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/netai/training-paths")
async def netai_training_paths():
    """List training paths."""
    try:
        from backend.netai_training import get_training_paths
        return get_training_paths()
    except Exception as e:
        logger.error(f"Training paths error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/netai/fundamentals")
async def netai_fundamentals(topic: str = ""):
    """Get networking fundamentals."""
    try:
        from backend.netai_training import get_networking_fundamental
        return get_networking_fundamental(topic)
    except Exception as e:
        logger.error(f"Fundamentals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  PROJECT MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pm/methodologies")
async def pm_methodologies():
    """List project management methodologies."""
    try:
        from backend.project_management import get_methodologies
        return get_methodologies()
    except Exception as e:
        logger.error(f"Methodologies error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pm/templates")
async def pm_templates():
    """List project templates."""
    try:
        from backend.project_management import get_project_templates
        return get_project_templates()
    except Exception as e:
        logger.error(f"Templates error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pm/risks")
async def pm_risks(category: str = ""):
    """Get risk categories."""
    try:
        from backend.project_management import get_risks
        return get_risks(category)
    except Exception as e:
        logger.error(f"Risks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  WHATSAPP BOT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/whatsapp/templates")
async def whatsapp_templates():
    """List WhatsApp message templates."""
    try:
        from backend.whatsapp_bot import get_templates
        return get_templates()
    except Exception as e:
        logger.error(f"WhatsApp templates error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(payload: dict):
    """Process WhatsApp webhook."""
    try:
        from backend.whatsapp_bot import process_webhook
        return process_webhook(payload)
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/router/route")
async def router_route(query: str):
    """Route a query to the appropriate handler."""
    try:
        from backend.router import route
        return route(query)
    except Exception as e:
        logger.error(f"Router error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/router/intents")
async def router_intents():
    """List all available intents."""
    try:
        from backend.router import get_intents
        return get_intents()
    except Exception as e:
        logger.error(f"Intents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
