#!/usr/bin/env python3
"""Omega AI v3.2.0 — Central Brain / Orchestrator"""

import hashlib
import time
from typing import Any, Dict, List, Optional

# ── Lazy imports to avoid circular dependencies ──────────────────────────────
_db_engine = None
_cache_engine = None
_kb_engine = None
_conv_state = None


def _get_db():
    global _db_engine
    if _db_engine is None:
        from db_engine import DatabaseEngine
        _db_engine = DatabaseEngine()
    return _db_engine


def _get_cache():
    global _cache_engine
    if _cache_engine is None:
        from cache_manager import ModuleCache
        _cache_engine = ModuleCache()
    return _cache_engine


def _get_kb():
    global _kb_engine
    if _kb_engine is None:
        from knowledge_base import KnowledgeBase
        _kb_engine = KnowledgeBase()
    return _kb_engine


def _get_conv_state():
    global _conv_state
    if _conv_state is None:
        from conversation_state import ConversationStateMachine
        _conv_state = ConversationStateMachine()
    return _conv_state


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

class OmegaBrain:
    """Central brain that routes queries to capability modules."""

    # Capability routing table — maps keywords to module names
    CAPABILITY_MAP = {
        # Financial
        "budget": "financial_literacy",
        "save": "financial_literacy",
        "invest": "financial_literacy",
        "stock": "financial_literacy",
        "crypto": "financial_literacy",
        "bitcoin": "financial_literacy",
        "retirement": "financial_literacy",
        "pension": "financial_literacy",
        "tax": "tax_engine",
        "vat": "tax_engine",
        "income tax": "tax_engine",
        "insurance": "financial_literacy",
        "loan": "financial_literacy",
        "debt": "financial_literacy",
        "credit": "financial_literacy",
        "mortgage": "financial_literacy",
        "stokvel": "stokvel_manager",
        "property": "financial_literacy",
        "real estate": "financial_literacy",
        "wealth": "financial_literacy",

        # Education
        "learn": "educational_companion",
        "study": "educational_companion",
        "course": "educational_companion",
        "school": "educational_companion",
        "university": "educational_companion",
        "degree": "educational_companion",
        "diploma": "educational_companion",
        "certificate": "educational_companion",
        "exam": "educational_companion",
        "test": "educational_companion",
        "quiz": "educational_companion",
        "tutor": "educational_companion",
        "homework": "educational_companion",
        "assignment": "educational_companion",
        "math": "educational_companion",
        "science": "educational_companion",
        "history": "educational_companion",
        "language": "educational_companion",
        "read": "educational_companion",
        "write": "educational_companion",

        # Vocational
        "job": "vocational_companion",
        "career": "vocational_companion",
        "work": "vocational_companion",
        "skill": "vocational_companion",
        "trade": "vocational_companion",
        "apprenticeship": "vocational_companion",
        "internship": "vocational_companion",
        "cv": "vocational_companion",
        "resume": "vocational_companion",
        "interview": "vocational_companion",
        "profession": "vocational_companion",
        "qualification": "vocational_companion",
        "experience": "vocational_companion",
        "employment": "vocational_companion",
        "salary": "vocational_companion",
        "wage": "vocational_companion",
        "entrepreneur": "vocational_companion",
        "business": "vocational_companion",
        "startup": "vocational_companion",

        # African languages
        "zulu": "african_languages",
        "xhosa": "african_languages",
        "sotho": "african_languages",
        "tswana": "african_languages",
        "venda": "african_languages",
        "tsonga": "african_languages",
        "swati": "african_languages",
        "ndebele": "african_languages",
        "pedi": "african_languages",
        "afrikaans": "african_languages",
        "translate": "african_languages",
        "translation": "african_languages",
        "phrase": "african_languages",
        "greeting": "african_languages",
        "traditional": "african_languages",
        "culture": "african_languages",
        "idiom": "african_languages",
        "proverb": "african_languages",

        # Calculator
        "calculate": "calc_engine",
        "compute": "calc_engine",
        "math": "calc_engine",
        "sum": "calc_engine",
        "add": "calc_engine",
        "subtract": "calc_engine",
        "multiply": "calc_engine",
        "divide": "calc_engine",
        "percentage": "calc_engine",
        "interest": "calc_engine",
        "formula": "calc_engine",
        "equation": "calc_engine",
        "conversion": "calc_engine",
        "convert": "calc_engine",
        "currency": "calc_engine",
        "rand": "calc_engine",
        "usd": "calc_engine",
        "eur": "calc_engine",
        "gbp": "calc_engine",

        # Reminders
        "remind": "reminders",
        "reminder": "reminders",
        "alarm": "reminders",
        "schedule": "reminders",
        "appointment": "reminders",
        "meeting": "reminders",
        "deadline": "reminders",
        "due": "reminders",
        "timer": "reminders",
        "notify": "reminders",
        "alert": "reminders",

        # Scheduler
        "plan": "scheduler",
        "routine": "scheduler",
        "daily": "scheduler",
        "weekly": "scheduler",
        "monthly": "scheduler",
        "habit": "scheduler",
        "todo": "scheduler",
        "task": "scheduler",
        "agenda": "scheduler",
        "calendar": "scheduler",
        "event": "scheduler",

        # Deep research
        "research": "deep_research",
        "analyze": "deep_research",
        "analysis": "deep_research",
        "report": "deep_research",
        "study": "deep_research",
        "investigate": "deep_research",
        "survey": "deep_research",
        "data": "deep_research",
        "statistics": "deep_research",
        "market": "deep_research",
        "industry": "deep_research",
        "sector": "deep_research",
        "trend": "deep_research",
        "forecast": "deep_research",
        "predict": "deep_research",

        # Email
        "email": "email_assistant",
        "mail": "email_assistant",
        "inbox": "email_assistant",
        "compose": "email_assistant",
        "draft": "email_assistant",
        "send": "email_assistant",
        "message": "email_assistant",
        "letter": "email_assistant",
        "correspondence": "email_assistant",

        # Knowledge base
        "faq": "knowledge_base",
        "question": "knowledge_base",
        "answer": "knowledge_base",
        "help": "knowledge_base",
        "support": "knowledge_base",
        "information": "knowledge_base",
        "wiki": "knowledge_base",
        "knowledge": "knowledge_base",
        "how to": "knowledge_base",
        "what is": "knowledge_base",
        "explain": "knowledge_base",
        "define": "knowledge_base",
    }

    # Multi-word phrases that should be checked first
    PHRASE_MAP = {
        "income tax": "tax_engine",
        "real estate": "financial_literacy",
        "how to": "knowledge_base",
        "what is": "knowledge_base",
        "deep research": "deep_research",
        "stock market": "financial_literacy",
    }

    def __init__(self):
        self._db = _get_db()
        self._cache = _get_cache()
        self._kb = _get_kb()
        self._conv = _get_conv_state()

    def process(self, user_id: str, query: str, context: dict = None) -> dict:
        """Process a user query and route to the appropriate module."""
        start_time = time.time()
        context = context or {}

        # Step 1: Check cache
        cache_key = hashlib.md5(f"{user_id}:{query}".encode()).hexdigest()
        cached = self._cache.get(cache_key)
        if cached:
            return {"status": "cached", **cached, "response_time_ms": 0}

        # Step 2: Check knowledge base for FAQ matches
        kb_match = self._kb.find_match(query)
        if kb_match and kb_match["confidence"] > 0.85:
            result = {
                "status": "success",
                "module": "knowledge_base",
                "response": kb_match["answer"],
                "confidence": kb_match["confidence"],
                "source": kb_match.get("source", "faq")
            }
            self._cache.set(cache_key, result, ttl=3600)
            return result

        # Step 3: Route to capability module
        module_name = self._route_query(query)

        # Step 4: Process with the selected module
        try:
            result = self._process_with_module(module_name, user_id, query, context)
        except Exception as e:
            result = {
                "status": "error",
                "module": module_name,
                "error": str(e),
                "response": f"I encountered an error processing your request. Please try again."
            }

        # Step 5: Cache and return
        elapsed = int((time.time() - start_time) * 1000)
        result["response_time_ms"] = elapsed
        result["module"] = module_name

        if result["status"] == "success":
            self._cache.set(cache_key, result, ttl=1800)

        return result

    def _route_query(self, query: str) -> str:
        """Route a query to the appropriate capability module."""
        query_lower = query.lower().strip()

        # Check multi-word phrases first
        for phrase, module in self.PHRASE_MAP.items():
            if phrase in query_lower:
                return module

        # Check individual keywords
        words = query_lower.split()
        for word in words:
            if word in self.CAPABILITY_MAP:
                return self.CAPABILITY_MAP[word]

        # Check for partial matches (substring)
        for keyword, module in self.CAPABILITY_MAP.items():
            if keyword in query_lower:
                return module

        # Default to knowledge base
        return "knowledge_base"

    def _process_with_module(self, module_name: str, user_id: str, query: str, context: dict) -> dict:
        """Process a query with the specified module."""
        # Import module dynamically
        module_map = {
            "financial_literacy": "financial_literacy",
            "tax_engine": "tax_engine",
            "stokvel_manager": "stokvel_manager",
            "educational_companion": "educational_companion",
            "vocational_companion": "vocational_companion",
            "african_languages": "african_languages",
            "calc_engine": "calc_engine",
            "reminders": "reminders",
            "scheduler": "scheduler",
            "deep_research": "deep_research",
            "email_assistant": "email_assistant",
            "knowledge_base": "knowledge_base",
        }

        if module_name not in module_map:
            return {
                "status": "error",
                "error": f"Unknown module: {module_name}",
                "response": "I'm not sure how to help with that. Could you rephrase?"
            }

        # Try to import and process
        try:
            module_import = module_map[module_name]
            mod = __import__(module_import)
            if hasattr(mod, "process"):
                return mod.process(query, context)
            elif hasattr(mod, "handle"):
                return mod.handle(query, context)
            else:
                return {
                    "status": "success",
                    "response": f"I understand you're asking about {module_name}. Let me help with that.",
                    "module": module_name
                }
        except ImportError:
            return {
                "status": "success",
                "response": f"I'd help you with {module_name}, but that module isn't available right now.",
                "module": module_name
            }

    def get_stats(self) -> dict:
        """Get brain statistics."""
        return {
            "version": "3.2.0",
            "capabilities": len(set(self.CAPABILITY_MAP.values())),
            "total_keywords": len(self.CAPABILITY_MAP),
            "db_status": "connected" if _db_engine else "disconnected",
            "cache_status": "active" if _cache_engine else "inactive",
        }

    def get_capabilities(self) -> List[str]:
        """List all available capabilities."""
        return sorted(set(self.CAPABILITY_MAP.values()))


# ═══════════════════════════════════════════════════════════════════════════════
#  MODULE-LEVEL FUNCTIONS (for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════════

_brain_instance: Optional[OmegaBrain] = None


def get_brain() -> OmegaBrain:
    """Get or create the singleton brain instance."""
    global _brain_instance
    if _brain_instance is None:
        _brain_instance = OmegaBrain()
    return _brain_instance


def process_query(user_id: str, query: str, context: dict = None) -> dict:
    """Process a query (convenience function)."""
    return get_brain().process(user_id, query, context)


def get_stats() -> dict:
    """Get brain statistics (convenience function)."""
    return get_brain().get_stats()


def get_capabilities() -> List[str]:
    """List capabilities (convenience function)."""
    return get_brain().get_capabilities()
