"""
web_core.interfaces - Abstract base classes defining contracts.
Every engine, parser, and provider implements one of these.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, BinaryIO, Dict, List


# -- Document Parsing --------------------------------------------------------

class FileParser(ABC):
    """Strategy for parsing a specific file type."""

    @property
    @abstractmethod
    def extensions(self) -> set:
        """File extensions this parser handles, e.g. {'.pdf', '.PDF'}."""
        ...

    @abstractmethod
    def parse(self, file_path: Path) -> str:
        """Return the extracted text/content from the file."""
        ...


class DocumentParserEngine(ABC):
    """High-level document parsing orchestrator."""

    @abstractmethod
    def parse(self, file_path: str | Path) -> Dict[str, Any]:
        """Parse any supported document and return structured result."""
        ...

    @abstractmethod
    def supported_extensions(self) -> set:
        """All extensions this engine can handle."""
        ...


# -- Voice Providers ---------------------------------------------------------

class TTSProvider(ABC):
    """Text-to-speech provider interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def available(self) -> bool:
        ...

    @abstractmethod
    def synthesize(self, text: str, accent: str = "american", lang: str = "en") -> bytes:
        """Return MP3 audio bytes."""
        ...


class STTProvider(ABC):
    """Speech-to-text provider interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def available(self) -> bool:
        ...

    @abstractmethod
    def transcribe(self, audio_bytes: bytes) -> str:
        """Return transcribed text from audio bytes."""
        ...


# -- AI Model Provider -------------------------------------------------------

class ChatProvider(ABC):
    """Interface for AI chat backends (OpenAI, Claude, local)."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def available(self) -> bool:
        ...

    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], tools: List[Dict] | None = None,
                   model: str = "", max_tokens: int = 4000) -> Dict[str, Any]:
        """Return {reply: str, model: str, tools_used: list}."""
        ...


# -- Generation Engines ------------------------------------------------------

class CampaignGenerator(ABC):
    """Base for content campaign generators (YouTube, blog, etc.)."""

    @abstractmethod
    def generate_campaign(self, niche: str, target_audience: str, video_count: int = 30) -> Dict[str, Any]:
        ...


class FunnelGenerator(ABC):
    """Base for sales funnel generators."""

    @abstractmethod
    def generate_funnel(self, niche: str, audience_size: int, content_type: str) -> Dict[str, Any]:
        ...


# -- Security ----------------------------------------------------------------

class Authenticator(ABC):
    """API key validation."""

    @abstractmethod
    def validate(self, key: str) -> Dict[str, Any] | None:
        """Return key info dict or None if invalid."""
        ...

    @abstractmethod
    def is_admin(self, key: str) -> bool:
        ...


class RateLimiter(ABC):
    """Rate limiting interface."""

    @abstractmethod
    def check(self, key_hash: str) -> bool:
        """Return True if request is allowed."""
        ...


class AuditLogger(ABC):
    """Request logging interface."""

    @abstractmethod
    def log(self, key_hash: str, method: str, path: str, status_code: int, latency_ms: float) -> None:
        ...
