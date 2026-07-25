"""Omega AI v3.7.0 — Local LLM Integration
Connect to Ollama, Llama.cpp, or other local inference engines.
Provides offline AI capabilities with zero external dependencies.
"""
from __future__ import annotations

import json
import time
from typing import Any

DEFAULT_MODEL = "llama3.2"
OLLAMA_HOST = "http://localhost:11434"


class LocalLLM:
    """Interface to local LLM inference engines."""

    def __init__(self, model: str = "", host: str = "") -> None:
        self._model = model or DEFAULT_MODEL
        self._host = host or OLLAMA_HOST
        self._available = self._check_connection()
        self.provider = "ollama" if self._available else "mock"

    def _check_connection(self) -> bool:
        """Check if Ollama is running."""
        try:
            import urllib.request
            req = urllib.request.Request(f"{self._host}/api/tags", timeout=5)
            with urllib.request.urlopen(req) as resp:
                return resp.status == 200
        except Exception:
            return False

    def is_available(self) -> bool:
        return self._available

    def generate(self, prompt: str, system: str = "", max_tokens: int = 500, temperature: float = 0.7) -> dict[str, Any]:
        """Generate text using local LLM."""
        if not self._available:
            return {"success": False, "error": f"Ollama not available at {self._host}. Run: ollama run {self._model}", "offline_fallback": True}
        try:
            import urllib.request
            payload = json.dumps({
                "model": self._model,
                "prompt": prompt,
                "system": system or "You are Luqi-AI, a helpful assistant.",
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens},
            }).encode()
            req = urllib.request.Request(f"{self._host}/api/generate", data=payload, headers={"Content-Type": "application/json"})
            start = time.time()
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "model": self._model,
                    "timing_ms": round((time.time() - start) * 1000),
                    "eval_count": data.get("eval_count", 0),
                    "source": "local_llm",
                }
        except Exception as e:
            return {"success": False, "error": str(e), "offline_fallback": True}

    def chat(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        """Chat using local LLM with message history."""
        if not self._available:
            return {"success": False, "error": "Ollama not available", "offline_fallback": True}
        try:
            import urllib.request
            payload = json.dumps({"model": self._model, "messages": messages, "stream": False}).encode()
            req = urllib.request.Request(f"{self._host}/api/chat", data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
                return {"success": True, "response": data.get("message", {}).get("content", ""), "model": self._model}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_models(self) -> list[str]:
        """List available local models."""
        if not self._available:
            return []
        try:
            import urllib.request
            req = urllib.request.Request(f"{self._host}/api/tags", timeout=5)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read())
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    def status(self) -> dict[str, Any]:
        return {
            "available": self._available,
            "host": self._host,
            "model": self._model,
            "models_installed": self.list_models(),
            "setup_command": f"ollama run {self._model}",
        }
