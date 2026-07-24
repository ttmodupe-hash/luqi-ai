#!/usr/bin/env python3
"""
Luqi AI — Intent Router
Classifies incoming user messages into intents and dispatches
to the appropriate backend module.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger("luqi.router")

# ---------------------------------------------------------------------------
# Intent patterns
# ---------------------------------------------------------------------------

INTENT_PATTERNS: List[Tuple[str, List[str]]] = [
    # Government
    ("government_services", [
        r"\b(gov|government|id|passport|driver'?s?\s*licence|birth\s*cert|service)\b",
        r"\b(appointment|booking|application)\b.*\b(gov|service)\b",
    ]),
    # Jobs
    ("jobs", [
        r"\b(job|career|cv|resume|interview|salary|hiring|recruitment)\b",
        r"\b(find\s+(?:a\s+)?job|job\s+hunt)\b",
    ]),
    # NetAI / Training
    ("netai_training", [
        r"\b(ccna|network|packet\s*tracer|subnet|vlan|router|cisco|certification)\b",
        r"\b(study\s*plan|course|training|module)\b.*\b(network|it|tech)\b",
    ]),
    # Workspace
    ("digital_workspace", [
        r"\b(workspace|tool|slack|teams|zoom|productivity|remote\s*work)\b",
        r"\b(email|template|phishing|security\s*awareness)\b",
    ]),
    # Project Management
    ("project_management", [
        r"\b(project|gantt|milestone|task|kanban|scrum|agile|burndown)\b",
        r"\b(manage\s+(?:a\s+)?project|project\s*plan)\b",
    ]),
    # Physics
    ("physics", [
        r"\b(physics|force|velocity|acceleration|energy|mass|gravity|newton)\b",
        r"\b(projectile|collision|momentum|torque)\b",
    ]),
    # Wealth
    ("wealth", [
        r"\b(funnel|revenue|pricing|sponsor|youtube|monetiz)\b",
        r"\b(make\s+money|income|stream|side\s*hustle)\b",
    ]),
    # WhatsApp
    ("whatsapp", [
        r"\b(whatsapp|wa|chatbot|auto\s*reply)\b",
    ]),
    # Voice
    ("voice", [
        r"\b(speak|voice|tts|stt|audio|sound|accent)\b",
    ]),
    # General fallback
    ("general", [
        r".*",  # catches everything
    ]),
]

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

class IntentRouter:
    """Routes user messages to the appropriate handler based on intent."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register(self, intent: str, handler: Callable) -> None:
        """Register a handler for an intent."""
        self._handlers[intent] = handler
        logger.debug("Registered handler for intent '%s'", intent)

    def classify(self, message: str) -> str:
        """Classify a message into an intent string."""
        text = message.lower().strip()
        for intent, patterns in INTENT_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, text):
                    return intent
        return "general"

    def route(self, message: str, **kwargs: Any) -> Dict[str, Any]:
        """Classify *message* and dispatch to the registered handler."""
        intent = self.classify(message)
        handler = self._handlers.get(intent)

        if handler is None:
            logger.warning("No handler for intent '%s' (message: %r)", intent, message[:80])
            return {"intent": intent, "status": "no_handler", "reply": "I'm not sure how to help with that yet."}

        try:
            result = handler(message, **kwargs)
            return {"intent": intent, "status": "ok", **(result if isinstance(result, dict) else {"result": result})}
        except Exception as exc:
            logger.exception("Handler error for intent '%s'", intent)
            return {"intent": intent, "status": "error", "detail": str(exc)}

# Singleton
_default_router: Optional[IntentRouter] = None

def get_router() -> IntentRouter:
    global _default_router
    if _default_router is None:
        _default_router = IntentRouter()
    return _default_router
