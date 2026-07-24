#!/usr/bin/env python3
"""Luqi AI Router Module — Central request router that dispatches requests
to appropriate backend modules based on intent classification.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  INTENT ROUTING MAP
# ═══════════════════════════════════════════════════════════════════════════════

INTENT_MAP = {
    # Government Services
    "government": {
        "keywords": ["government", "gauteng", "sassa", "grant", "home affairs", "passport", "id", "driver", "license", "municipal", "rates", "service", "department", "rdp", "housing", "clinic", "hospital", "school", "education"],
        "handler": "government_services",
        "priority": 1,
    },
    # Jobs & Skills
    "jobs": {
        "keywords": ["job", "career", "salary", "interview", "resume", "cv", "skill", "learn", "course", "certification", "degree", "hiring", "recruitment", "employment", "unemployment"],
        "handler": "jobs_skills",
        "priority": 2,
    },
    # Digital Workspace
    "workspace": {
        "keywords": ["tool", "slack", "teams", "zoom", "project", "management", "document", "file", "remote work", "productivity", "email", "template", "workspace", "office", "phishing", "security"],
        "handler": "digital_workspace",
        "priority": 3,
    },
    # NetAI Training
    "network": {
        "keywords": ["network", "cisco", "ccna", "ccnp", "routing", "switching", "subnet", "ip address", "vlan", "firewall", "infrastructure", "cloud", "aws", "azure", "gcp", "devops", "kubernetes"],
        "handler": "netai_training",
        "priority": 4,
    },
    # Project Management
    "project_management": {
        "keywords": ["project", "agile", "scrum", "kanban", "sprint", "waterfall", "stakeholder", "risk", "timeline", "gantt", "methodology", "pmo", "backlog", "retrospective"],
        "handler": "project_management",
        "priority": 5,
    },
    # WhatsApp Bot
    "whatsapp": {
        "keywords": ["whatsapp", "bot", "message", "template", "webhook"],
        "handler": "whatsapp_bot",
        "priority": 6,
    },
    # Agent
    "agent": {
        "keywords": ["chat", "talk", "ask", "question", "help me", "what is", "how to", "why", "when", "who", "explain", "define"],
        "handler": "luqi_agent",
        "priority": 10,
    },
}

# Handler function references (lazy loaded)
_HANDLER_MODULES = {}

def _get_handler(handler_name: str):
    """Lazy load handler modules."""
    if handler_name not in _HANDLER_MODULES:
        try:
            if handler_name == "government_services":
                from backend import government_services as gs
                _HANDLER_MODULES[handler_name] = gs
            elif handler_name == "jobs_skills":
                from backend import jobs_skills as js
                _HANDLER_MODULES[handler_name] = js
            elif handler_name == "digital_workspace":
                from backend import digital_workspace as dw
                _HANDLER_MODULES[handler_name] = dw
            elif handler_name == "netai_training":
                from backend import netai_training as nt
                _HANDLER_MODULES[handler_name] = nt
            elif handler_name == "project_management":
                from backend import project_management as pm
                _HANDLER_MODULES[handler_name] = pm
            elif handler_name == "whatsapp_bot":
                from backend import whatsapp_bot as wb
                _HANDLER_MODULES[handler_name] = wb
            elif handler_name == "luqi_agent":
                from backend import luqi_agent as la
                _HANDLER_MODULES[handler_name] = la
            else:
                _HANDLER_MODULES[handler_name] = None
        except ImportError as e:
            logger.warning(f"Could not load handler {handler_name}: {e}")
            _HANDLER_MODULES[handler_name] = None
    return _HANDLER_MODULES.get(handler_name)


# ═══════════════════════════════════════════════════════════════════════════════
#  INTENT CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

def classify_intent(query: str) -> Dict[str, Any]:
    """Classify user intent from query text."""
    query_lower = query.lower()
    scores = {}

    for intent_id, intent_data in INTENT_MAP.items():
        score = 0
        matched_keywords = []
        for keyword in intent_data["keywords"]:
            if keyword in query_lower:
                score += 1
                matched_keywords.append(keyword)
        if score > 0:
            scores[intent_id] = {
                "score": score,
                "handler": intent_data["handler"],
                "priority": intent_data["priority"],
                "matched_keywords": matched_keywords,
            }

    if not scores:
        return {
            "intent": "general",
            "handler": "luqi_agent",
            "confidence": 0,
            "matched_keywords": [],
        }

    # Sort by score (higher first), then by priority (lower number first)
    best = max(scores.items(), key=lambda x: (x[1]["score"], -x[1]["priority"]))
    
    return {
        "intent": best[0],
        "handler": best[1]["handler"],
        "confidence": best[1]["score"],
        "matched_keywords": best[1]["matched_keywords"],
        "all_matches": {k: {"score": v["score"], "keywords": v["matched_keywords"]} for k, v in scores.items()},
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def route(query: str, context: Dict = None) -> Dict[str, Any]:
    """Route a query to the appropriate handler."""
    if context is None:
        context = {}

    classification = classify_intent(query)
    handler_name = classification["handler"]
    handler = _get_handler(handler_name)

    result = {
        "status": "routed",
        "query": query,
        "intent": classification["intent"],
        "handler": handler_name,
        "confidence": classification["confidence"],
        "matched_keywords": classification["matched_keywords"],
        "handler_loaded": handler is not None,
    }

    # If handler is loaded, try to process
    if handler:
        try:
            # Try to find a relevant function in the handler
            if hasattr(handler, 'search_services') and classification["intent"] == "government":
                response = handler.search_services(query)
                result["response"] = response
            elif hasattr(handler, 'search_jobs') and classification["intent"] == "jobs":
                response = handler.search_jobs(query)
                result["response"] = response
            elif hasattr(handler, 'agent_chat'):
                response = handler.agent_chat(query)
                result["response"] = response
            else:
                result["response"] = {"status": "handler_loaded", "message": f"Handler {handler_name} loaded but no matching function found"}
        except Exception as e:
            logger.error(f"Handler error: {e}")
            result["handler_error"] = str(e)
            result["response"] = {"status": "error", "message": "Handler execution failed"}
    else:
        result["response"] = {"status": "no_handler", "message": f"Handler {handler_name} not available"}

    return result


def get_intents() -> Dict[str, Any]:
    """List all available intents."""
    return {
        "status": "success",
        "total_intents": len(INTENT_MAP),
        "intents": [{"id": k, "handler": v["handler"], "keyword_count": len(v["keywords"])} for k, v in INTENT_MAP.items()],
    }


def get_handler_info(handler_name: str) -> Dict[str, Any]:
    """Get information about a handler."""
    handler = _get_handler(handler_name)
    
    if handler is None:
        # Check if it's a known handler
        known_handlers = set(v["handler"] for v in INTENT_MAP.values())
        if handler_name not in known_handlers:
            return {"status": "not_found", "available": list(known_handlers)}
        return {"status": "not_loaded", "handler": handler_name, "message": "Handler module not available"}

    # Get available functions
    functions = [f for f in dir(handler) if not f.startswith("_") and callable(getattr(handler, f, None))]
    
    return {
        "status": "success",
        "handler": handler_name,
        "module": handler.__name__ if hasattr(handler, '__name__') else str(handler),
        "available_functions": functions,
    }


def health_check() -> Dict[str, Any]:
    """Check router health."""
    handlers = {}
    for intent_data in INTENT_MAP.values():
        hname = intent_data["handler"]
        if hname not in handlers:
            handler = _get_handler(hname)
            handlers[hname] = "loaded" if handler else "not_loaded"

    all_loaded = all(v == "loaded" for v in handlers.values())
    
    return {
        "status": "healthy" if all_loaded else "degraded",
        "router": "active",
        "handlers": handlers,
        "total_handlers": len(handlers),
        "loaded": sum(1 for v in handlers.values() if v == "loaded"),
    }
