"""Omega AI v3 — Voice Interaction Engine
Unified voice interface combining STT, TTS, and audio playback.
"""
from __future__ import annotations

import logging
import tempfile
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class VoiceInterface:
    """Unified voice interface for STT, TTS, and audio playback."""

    def __init__(self) -> None:
        self._stt_available = self._check_stt()
        self._tts_available = self._check_tts()
        self._audio_available = self._check_audio()

    def _check_stt(self) -> bool:
        try:
            import speech_recognition
            return True
        except ImportError:
            return False

    def _check_tts(self) -> bool:
        try:
            from gtts import gTTS
            return True
        except ImportError:
            return False

    def _check_audio(self) -> bool:
        try:
            import pygame
            return True
        except ImportError:
            return False

    def listen(self, timeout: int = 5) -> str:
        """Listen for voice input and return transcribed text."""
        if not self._stt_available:
            return ""
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            with sr.Microphone() as source:
                logger.info("Listening...")
                r.adjust_for_ambient_noise(source, duration=0.5)
                audio = r.listen(source, timeout=timeout)
                return r.recognize_google(audio)
        except Exception as e:
            logger.error(f"STT error: {e}")
            return ""

    def speak(self, text: str) -> str:
        """Convert text to speech and play it."""
        if not self._tts_available:
            return "TTS unavailable"
        try:
            from gtts import gTTS
            fp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            tts = gTTS(text=text[:500], lang="en")
            tts.save(fp.name)
            if self._audio_available:
                self._play_audio(fp.name)
            return fp.name
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return f"TTS error: {e}"

    def _play_audio(self, file_path: str) -> None:
        """Play audio file."""
        try:
            import pygame
            pygame.mixer.init()
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
        except Exception as e:
            logger.error(f"Playback error: {e}")

    def status(self) -> dict[str, Any]:
        return {"stt": self._stt_available, "tts": self._tts_available, "audio": self._audio_available}
