"""
Luqi AI v25.1.2 "Prometheus . LUQI" - Unified AI Platform
=============================================================
One codebase serving Web, Desktop, and Mobile:
  - Web:     FastAPI server with PWA (offline-capable)
  - Desktop: PyInstaller wrapper or WebView
  - Mobile:  Responsive PWA, installable on iOS/Android

Modules:
  backend/          - Core backend modules
  work-support/     - Work support & professional tools
  web_core.py       - Unified web core (FastAPI + PWA)
  luqi_personal_ai.py - Personal AI assistant
  luqi_sandbox_gui.py - Desktop sandbox GUI
"""

__version__ = "25.1.2"
__codename__ = "Prometheus . LUQI"
__author__ = "Luqi AI Team"

from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.resolve()

# Ensure data directories exist
for d in (PROJECT_ROOT / "data",
          PROJECT_ROOT / "data" / "uploads",
          PROJECT_ROOT / "data" / "web_static",
          PROJECT_ROOT / "data" / "voice",
          PROJECT_ROOT / "data" / "logs"):
    d.mkdir(parents=True, exist_ok=True)

def get_version():
    return {"version": __version__, "codename": __codename__}
