"""Omega AI (Luqi-AI) — Multi-capability AI assistant.

Specialized in African markets, finance, languages, and professional assistance.
"""
from __future__ import annotations

__version__ = "3.6.0"
__author__ = "Luqi AI Labs"
__license__ = "MIT"

# Convenience imports
from config import CONFIG
from core_brain import OmegaBrain
from response_schema import ResponseDict, ok, err

__all__ = ["CONFIG", "OmegaBrain", "ResponseDict", "ok", "err", "__version__"]
