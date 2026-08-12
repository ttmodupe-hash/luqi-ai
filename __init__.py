"""Omega AI v29.1.0 — Package init."""
__version__ = "29.1.0"
__author__ = "Omega AI Team"
__license__ = "MIT"

from .omega_ai import OmegaAI
from .core_brain import CoreBrain
from .ai_brain import AIBrain

__all__ = ["OmegaAI", "CoreBrain", "AIBrain"]
