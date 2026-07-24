"""
web_core.engines - Business logic engines.
Each engine is focused on one domain — no HTTP, no DB access (stores handle that).
"""

from web_core.engines.document import DocumentEngine, PDFParser, DocxParser, ExcelParser, ImageParser, TextParser, PythonParser
from web_core.engines.voice import VoiceEngine, GTTSTTSProvider, SpeechRecognitionSTTProvider
from web_core.engines.youtube import YoutubeEngine
from web_core.engines.wealth import WealthEngine

__all__ = [
    "DocumentEngine", "PDFParser", "DocxParser", "ExcelParser", "ImageParser", "TextParser", "PythonParser",
    "VoiceEngine", "GTTSTTSProvider", "SpeechRecognitionSTTProvider",
    "YoutubeEngine",
    "WealthEngine",
]
