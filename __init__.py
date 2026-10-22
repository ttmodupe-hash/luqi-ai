"""LUQI/Omega package exports supporting both package and repository-root imports."""
__version__ = "29.1.0"
__author__ = "Omega AI Team"
__license__ = "MIT"

if __package__:
    from .omega_ai import OmegaAI
    from .core_brain import CoreBrain
    from .ai_brain import AIBrain
else:
    # pytest imports the top-level __init__.py without a parent package.
    from omega_ai import OmegaAI
    from core_brain import CoreBrain
    from ai_brain import AIBrain

__all__ = ["OmegaAI", "CoreBrain", "AIBrain"]
