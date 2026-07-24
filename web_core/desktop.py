"""
web_core.desktop - PyQt6 desktop wrapper.
Embeds the web dashboard in a native window.
"""

from __future__ import annotations

import logging
import sys

logger = logging.getLogger("luqi.desktop")


class DesktopApp:
    """Desktop wrapper using PyQt6 WebEngine."""

    def __init__(self, port: int = 8000, title: str = "Luqi AI Desktop"):
        self.port = port
        self.title = title

    def run(self):
        try:
            from PyQt6.QtWidgets import QApplication
            from PyQt6.QtWebEngineWidgets import QWebEngineView
            from PyQt6.QtCore import QUrl
        except ImportError:
            print("PyQt6 WebEngine required. Run: pip install PyQt6 PyQt6-WebEngine")
            print(f"Falling back to browser: http://localhost:{self.port}")
            import webbrowser
            webbrowser.open(f"http://localhost:{self.port}")
            return

        app = QApplication(sys.argv)
        view = QWebEngineView()
        view.setWindowTitle(self.title)
        view.setUrl(QUrl(f"http://localhost:{self.port}"))
        view.showMaximized()
        sys.exit(app.exec())
