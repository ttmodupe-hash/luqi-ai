"""
Luqi AI v25.2.0 "Modular LUQI" - Refactored Web Core
=====================================================
Clean architecture: models -> interfaces -> db -> engines -> agents -> security -> routes

Package layout:
    web_core/
        __init__.py          # This file - version & re-exports
        models.py            # Dataclasses & enums
        interfaces.py        # Abstract base classes
        config.py            # Settings & constants
        db/
            __init__.py
            connection.py    # SQLite thread-safe pool
            conversations.py  # ConversationStore
            documents.py     # DocumentStore
            capabilities.py  # CapabilityStore
        engines/
            __init__.py
            document.py      # Document parsing with strategy pattern
            voice.py         # STT/TTS with swappable providers
            youtube.py       # YouTube creation suite
            wealth.py        # Wealth creation engine
        agents/
            __init__.py
            chat.py          # Chat orchestration
            document.py      # Document processing agent
            voice.py         # Voice agent
            youtube.py       # YouTube agent
            wealth.py        # Wealth agent
            system.py        # System health & metrics
        security/
            __init__.py
            auth.py          # API key authentication
            rate_limit.py    # Token bucket rate limiting
            audit.py         # Request audit logging
        telemetry.py         # Error monitoring & health checks
        desktop.py           # PyQt6 desktop wrapper
        tests/               # Split test files
"""

VERSION = "25.2.0"
CODENAME = "Modular LUQI"

# Re-export telemetry for convenience
try:
    from web_core.telemetry import (  # noqa: F401
        Alert, AlertManager, HealthMonitor, HealthReport,
        RequestLogger, TelemetryCollector, TelemetryMiddleware,
        get_telemetry_router,
    )
except ImportError:  # pragma: no cover
    pass  # telemetry dependencies optional
