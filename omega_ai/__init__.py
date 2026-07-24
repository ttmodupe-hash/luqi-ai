#!/usr/bin/env python3
"""
Omega AI - Advanced African Intelligence Platform
==================================================
A comprehensive AI system with African language support, financial literacy,
educational companions, vocational training, and more.

Version: 3.2.0
"""

__version__ = "3.2.0"
__author__ = "Luqi AI Team"
__license__ = "MIT"

from .core_brain import OmegaBrain
from .api_server import create_app

__all__ = ["OmegaBrain", "create_app"]
