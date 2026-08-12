"""Main API Router for LUQI AI v29.1.0"""
from fastapi import APIRouter

from backend import auth
from backend import digital_workspace
from backend import favorites_api
from backend import feedback_api
from backend import government_services
from backend import health_endpoints
from backend import jobs_skills
from backend import luqi_unified
from backend import netai_training
from backend import notification_hub
from backend import omega_routes
from backend import physics_simulator
from backend import project_management
from backend import search_engine
from backend import voice_engine
from backend import whatsapp_bot

router = APIRouter()

# Include all sub-routers
router.include_router(auth.router, prefix="/auth")
router.include_router(digital_workspace.router)
router.include_router(favorites_api.router)
router.include_router(feedback_api.router)
router.include_router(government_services.router)
router.include_router(health_endpoints.router)
router.include_router(jobs_skills.router)
router.include_router(luqi_unified.router)
router.include_router(netai_training.router)
router.include_router(notification_hub.router)
router.include_router(omega_routes.router)
router.include_router(physics_simulator.router)
router.include_router(project_management.router)
router.include_router(search_engine.router)
router.include_router(voice_engine.router)
router.include_router(whatsapp_bot.router)


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "LUQI AI",
        "version": "29.1.0",
        "status": "operational",
        "docs": "/docs",
    }


@router.get("/version")
async def version():
    """Get API version."""
    return {"version": "29.1.0", "codename": "Omega"}
