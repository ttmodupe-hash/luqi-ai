"""
web_core.engines.voice - STT/TTS with swappable providers.
GTTSTTSProvider and SpeechRecognitionSTTProvider are built-in.
"""

from __future__ import annotations

import io
import logging
import os
import tempfile
from typing import Dict

from web_core.interfaces import STTProvider, TTSProvider

logger = logging.getLogger("luqi.engines.voice")

ACCENT_TLD_MAP: Dict[str, str] = {
    "american": "com",
    "british": "co.uk",
    "australian": "com.au",
    "indian": "co.in",
    "nigerian": "com.ng",
    "south_african": "co.za",
    "french": "fr",
    "german": "de",
}


class GTTSTTSProvider(TTSProvider):
    """Google Text-to-Speech via gTTS library."""

    @property
    def name(self) -> str:
        return "gtts"

    @property
    def available(self) -> bool:
        try:
            from gtts import gTTS
            return True
        except ImportError:
            return False

    def synthesize(self, text: str, accent: str = "american", lang: str = "en") -> bytes:
        if not self.available:
            raise RuntimeError("gTTS not installed. Run: pip install gtts")
        from gtts import gTTS
        tld = ACCENT_TLD_MAP.get(accent, "com")
        tts = gTTS(text=text[:5000], lang=lang, tld=tld, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()


class SpeechRecognitionSTTProvider(STTProvider):
    """Speech-to-text via SpeechRecognition library."""

    @property
    def name(self) -> str:
        return "speech_recognition"

    @property
    def available(self) -> bool:
        try:
            import speech_recognition as sr
            return True
        except ImportError:
            return False

    def transcribe(self, audio_bytes: bytes) -> str:
        if not self.available:
            raise RuntimeError("SpeechRecognition not installed. Run: pip install SpeechRecognition")
        import speech_recognition as sr
        r = sr.Recognizer()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        try:
            with sr.AudioFile(tmp_path) as source:
                audio = r.record(source)
            return r.recognize_google(audio)
        except sr.UnknownValueError:
            return "[Could not understand audio]"
        except sr.RequestError as e:
            return f"[STT service error: {e}]"
        finally:
            os.unlink(tmp_path)


class VoiceEngine:
    """Facade for voice operations — delegates to configured providers."""

    def __init__(self):
        self._tts = GTTSTTSProvider()
        self._stt = SpeechRecognitionSTTProvider()

    @property
    def tts_available(self) -> bool:
        return self._tts.available

    @property
    def stt_available(self) -> bool:
        return self._stt.available

    def text_to_speech(self, text: str, accent: str = "american", lang: str = "en") -> bytes:
        return self._tts.synthesize(text, accent, lang)

    def speech_to_text(self, audio_bytes: bytes) -> str:
        return self._stt.transcribe(audio_bytes)

    def supported_accents(self) -> list:
        return list(ACCENT_TLD_MAP.keys())
