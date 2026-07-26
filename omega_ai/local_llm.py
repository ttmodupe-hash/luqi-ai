"""LocalLLM — Graceful local LLM wrapper with cascading backends.

Tries (in order):

1. **Ollama** — HTTP API on ``localhost:11434/api/generate``.
2. **llama-cpp-python** — Python bindings for llama.cpp.
3. **Echo fallback** — Returns a helpful setup message.

Usage::

    >>> from omega_ai.local_llm import LocalLLM
    >>> llm = LocalLLM()
    >>> llm.get_status()
    {"status": "ready", "model": "llama3.2", "backend": "ollama"}
    >>> llm.query("Explain Python decorators", max_tokens=256)
    {"response": "...", "model": "llama3.2", "tokens_used": 128, "success": True}
"""

from __future__ import annotations

import logging
import os
import socket
import time
from typing import Any

logger = logging.getLogger(__name__)


class LocalLLM:
    """Local LLM wrapper with automatic backend detection and graceful fallbacks.

    On instantiation the class probes available backends in this order:

    1. Ollama (local HTTP server on port 11434)
    2. llama-cpp-python (importable Python package)

    If neither is available the instance falls back to an echo mode that
    returns helpful setup instructions instead of raising exceptions.

    Attributes
    ----------
    backend : str
        One of ``"ollama"``, ``"llama_cpp"``, or ``"echo"``.
    model : str
        Name of the detected / configured model.
    _llm : Any | None
        Internal handle for the llama-cpp model object (when applicable).
    """

    def __init__(self) -> None:
        """Initialise the LocalLLM and probe available backends."""
        self.backend: str = "echo"
        self.model: str = "none"
        self._llm: Any | None = None  # llama_cpp model handle
        self._probe_backends()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_status(self) -> dict[str, Any]:
        """Return the current LLM status.

        Returns
        -------
        dict
            ::

                {
                    "status": "ready" | "unavailable",
                    "model": str,
                    "backend": str
                }
        """
        if self.backend == "echo":
            return {
                "status": "unavailable",
                "model": self.model,
                "backend": self.backend,
            }

        return {
            "status": "ready",
            "model": self.model,
            "backend": self.backend,
        }

    def query(self, prompt: str, max_tokens: int = 512) -> dict[str, Any]:
        """Send a prompt to the local LLM.

        Parameters
        ----------
        prompt : str
            The text prompt to send.
        max_tokens : int, optional
            Maximum number of tokens to generate (default 512).

        Returns
        -------
        dict
            ::

                {
                    "response": str,
                    "model": str,
                    "tokens_used": int,
                    "success": bool
                }

            On total failure a helpful message is returned in *response* and
            *success* is ``False``.
        """
        if not prompt or not prompt.strip():
            return {
                "response": "(Empty prompt received. Please provide a non-empty prompt.)",
                "model": self.model,
                "tokens_used": 0,
                "success": False,
            }

        # Dispatch to the best available backend
        try:
            if self.backend == "ollama":
                response_text = self._try_ollama(prompt, max_tokens)
                return {
                    "response": response_text,
                    "model": self.model,
                    "tokens_used": len(response_text.split()),
                    "success": True,
                }

            if self.backend == "llama_cpp":
                response_text = self._try_llama_cpp(prompt, max_tokens)
                return {
                    "response": response_text,
                    "model": self.model,
                    "tokens_used": len(response_text.split()),
                    "success": True,
                }

        except Exception as exc:
            logger.warning("Backend %s failed: %s", self.backend, exc)

        # Echo fallback — never raises
        response_text = self._fallback_echo(prompt)
        return {
            "response": response_text,
            "model": self.model,
            "tokens_used": 0,
            "success": False,
        }

    # ------------------------------------------------------------------
    # Backend implementations
    # ------------------------------------------------------------------

    def _try_ollama(self, prompt: str, max_tokens: int = 512) -> str:
        """Query the Ollama API running on ``localhost:11434``.

        Parameters
        ----------
        prompt : str
            The prompt text.
        max_tokens : int
            Maximum tokens to generate.

        Returns
        -------
        str
            Generated response text.

        Raises
        ------
        Exception
            Propagates any HTTP or connection error so the caller can
            fall back gracefully.
        """
        import urllib.request
        import json

        url = "http://localhost:11434/api/generate"
        payload = json.dumps({
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": max_tokens},
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "")

    def _try_llama_cpp(self, prompt: str, max_tokens: int = 512) -> str:
        """Query via llama-cpp-python.

        Parameters
        ----------
        prompt : str
            The prompt text.
        max_tokens : int
            Maximum tokens to generate.

        Returns
        -------
        str
            Generated response text.

        Raises
        ------
        Exception
            Propagates errors for graceful fallback.
        """
        if self._llm is None:
            raise RuntimeError("llama_cpp model not loaded.")

        output = self._llm(prompt, max_tokens=max_tokens, stop=["</s>"], echo=False)
        choices = output.get("choices", [])
        if choices:
            return choices[0].get("text", "").strip()
        return ""

    def _fallback_echo(self, prompt: str) -> str:
        """Return a helpful message about setting up a local LLM.

        Parameters
        ----------
        prompt : str
            The original user prompt (used for context in the message).

        Returns
        -------
        str
            A polite, actionable setup guide.
        """
        return (
            "[Local LLM not available — running in echo mode]\n\n"
            "To enable local LLM responses, set up one of the following:\n"
            "  1. Ollama  — Install from https://ollama.com and run:\n"
            "       ollama pull llama3.2\n"
            "       ollama serve\n"
            "  2. llama-cpp-python — pip install llama-cpp-python\n"
            "       Then provide a GGUF model path via env var:\n"
            "       export LLAMA_MODEL_PATH=/path/to/model.gguf\n\n"
            f"Your prompt was: '{prompt[:120]}{'...' if len(prompt) > 120 else ''}'\n"
            "Re-run after setting up a backend to get a real response."
        )

    # ------------------------------------------------------------------
    # Backend probing
    # ------------------------------------------------------------------

    def _probe_backends(self) -> None:
        """Probe available backends in priority order."""
        # 1. Ollama
        if self._check_ollama():
            self.backend = "ollama"
            self.model = self._detect_ollama_model()
            logger.info("Using Ollama backend with model: %s", self.model)
            return

        # 2. llama-cpp-python
        if self._check_llama_cpp():
            self.backend = "llama_cpp"
            self.model = "llama_cpp_model"
            logger.info("Using llama-cpp-python backend")
            return

        # 3. Echo fallback
        self.backend = "echo"
        self.model = "none"
        logger.info("No local LLM backend found — using echo fallback")

    def _check_ollama(self) -> bool:
        """Check whether an Ollama server is reachable on localhost:11434."""
        try:
            sock = socket.create_connection(("127.0.0.1", 11434), timeout=2)
            sock.close()
            return True
        except (socket.timeout, OSError, ConnectionRefusedError):
            return False

    def _detect_ollama_model(self) -> str:
        """Attempt to detect which model Ollama is serving.

        Falls back to ``"llama3.2"`` as a sensible default.
        """
        try:
            import urllib.request
            import json

            req = urllib.request.Request(
                "http://localhost:11434/api/tags",
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = data.get("models", [])
                if models:
                    # Return the first available model name
                    name = models[0].get("name", "llama3.2")
                    return name.split(":")[0] if ":" in name else name
        except Exception:
            pass
        return "llama3.2"

    def _check_llama_cpp(self) -> bool:
        """Check whether llama-cpp-python is installed and a model is available."""
        try:
            import llama_cpp  # type: ignore[import-untyped]

            model_path = os.environ.get("LLAMA_MODEL_PATH", "")
            if model_path and os.path.isfile(model_path):
                self._llm = llama_cpp.Llama(
                    model_path=model_path,
                    n_ctx=4096,
                    verbose=False,
                )
                self.model = os.path.basename(model_path)
                return True

            # No model path configured — backend is available but unconfigured
            self.model = "llama_cpp (no model)"
            return False
        except ImportError:
            return False
