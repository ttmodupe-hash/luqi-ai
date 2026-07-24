"""
web_core.agents.voice - Voice processing agent.
Wraps the voice engine for chat integration.
"""

from __future__ import annotations

import base64
import logging

from web_core.engines.voice import VoiceEngine

logger = logging.getLogger("luqi.agents.voice")


class VoiceAgent:
    """Handles text-to-speech and speech-to-text requests."""

    def __init__(self, engine: VoiceEngine):
        self.engine = engine

    @property
    def tts_available(self) -> bool:
        return self.engine.tts_available

    @property
    def stt_available(self) -> bool:
        return self.engine.stt_available

    def text_to_speech(self, text: str, accent: str = "american") -> bytes:
        return self.engine.text_to_speech(text, accent)

    def speech_to_text(self, audio_b64: str) -> str:
        audio_bytes = base64.b64decode(audio_b64)
        return self.engine.speech_to_text(audio_bytes)

    def supported_accents(self) -> list:
        return self.engine.supported_accents()
