# backend/__init__.py

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import logging

logger = logging.getLogger(__name__)
logger.info("Luqi backend package initialized.")

__version__ = "29.1.0"
__all__ = [
    "db",
    "models",
    "crud",
    "auth",
    "schemas",
    "cache",
    "celery_app",
    "luqi_agent",
    "luqi_unified",
    "digital_workspace",
    "government_services",
    "health_endpoints",
    "favorites_api",
    "feedback_api",
    "jobs_skills",
    "user_account_api",
    "startup_events",
    "middleware_api",
    "security_headers",
    "api_docs",
    "config",
    "wsgi",
    "asgi",
    "tests",
]
