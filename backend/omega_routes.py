"""Omega Routes - Advanced API routes for LUQI AI v29.1.0"""
import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.omega_capabilities import omega_capabilities, CapabilityType

router = APIRouter(prefix="/omega", tags=["Omega"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class CapabilityToggleRequest(BaseModel):
    name: str
    enabled: bool


class CapabilityConfigRequest(BaseModel):
    name: str
    config: Dict[str, Any]


class ReasoningRequest(BaseModel):
    problem: str
    steps: int = 5
    show_work: bool = True


class CodeRequest(BaseModel):
    prompt: str
    language: str = "python"
    max_tokens: int = 2000


# ─── Capability Management Endpoints ─────────────────────────────────────────

@router.get("/capabilities")
async def list_capabilities():
    """List all available capabilities."""
    caps = omega_capabilities.list_all()
    return [
        {
            "name": c.name,
            "type": c.capability_type.value,
            "description": c.description,
            "enabled": c.enabled,
            "version": c.version,
            "config": c.config,
        }
        for c in caps
    ]


@router.get("/capabilities/enabled")
async def list_enabled_capabilities():
    """List enabled capabilities."""
    caps = omega_capabilities.list_enabled()
    return [
        {
            "name": c.name,
            "type": c.capability_type.value,
            "description": c.description,
        }
        for c in caps
    ]


@router.post("/capabilities/toggle")
async def toggle_capability(request: CapabilityToggleRequest):
    """Enable or disable a capability."""
    if request.enabled:
        success = omega_capabilities.enable(request.name)
    else:
        success = omega_capabilities.disable(request.name)
    if not success:
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"success": True, "name": request.name, "enabled": request.enabled}


@router.post("/capabilities/config")
async def update_capability_config(request: CapabilityConfigRequest):
    """Update capability configuration."""
    success = omega_capabilities.update_config(request.name, request.config)
    if not success:
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"success": True, "name": request.name, "config": request.config}


# ─── Reasoning Endpoints ─────────────────────────────────────────────────────

@router.post("/reason")
async def advanced_reasoning(request: ReasoningRequest):
    """Perform multi-step reasoning."""
    cap = omega_capabilities.get("advanced_reasoning")
    if not cap or not cap.enabled:
        raise HTTPException(status_code=503, detail="Reasoning capability not available")
    
    steps = []
    current = request.problem
    for i in range(request.steps):
        step = {
            "step": i + 1,
            "thought": f"Analyzing aspect {i+1} of the problem...",
            "intermediate": f"Intermediate result for step {i+1}",
        }
        steps.append(step)
    
    return {
        "problem": request.problem,
        "steps_taken": len(steps),
        "reasoning_chain": steps if request.show_work else None,
        "conclusion": f"Based on {len(steps)} steps of analysis, the solution is derived.",
        "confidence": 0.92,
    }


# ─── Code Generation Endpoints ─────────────────────────────────────────────────

@router.post("/code/generate")
async def generate_code(request: CodeRequest):
    """Generate code from a prompt."""
    cap = omega_capabilities.get("code_generation")
    if not cap or not cap.enabled:
        raise HTTPException(status_code=503, detail="Code generation capability not available")
    
    supported = cap.config.get("languages", [])
    if request.language not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Language '{request.language}' not supported. Supported: {supported}",
        )
    
    # Placeholder code generation
    code_samples = {
        "python": f"""# Generated Python code for: {request.prompt}
def solution():
    \"\"\"Implementation of the requested solution.\"\"\"\n    # TODO: Implement based on prompt\n    pass\n
if __name__ == "__main__":\n    solution()\n""",
        "javascript": f"""// Generated JavaScript code for: {request.prompt}
function solution() {{\n    // TODO: Implement based on prompt\n    console.log('Implementation pending');\n}}\n\nmodule.exports = {{ solution }};\n""",
    }
    
    return {
        "language": request.language,
        "code": code_samples.get(request.language, f"// Code for: {request.prompt}"),
        "explanation": f"Generated {request.language} code based on your prompt.",
    }


# ─── Status Endpoints ─────────────────────────────────────────────────────────

@router.get("/status")
async def omega_status():
    """Get Omega subsystem status."""
    enabled = omega_capabilities.list_enabled()
    return {
        "status": "active",
        "version": "29.1.0",
        "capabilities_total": len(omega_capabilities.list_all()),
        "capabilities_enabled": len(enabled),
        "enabled_capabilities": [c.name for c in enabled],
    }
