"""Omega AI v3.7.0 — Telegram Bot Integration
Webhook and polling modes for Telegram messaging.
"""
from __future__ import annotations

import json
import time
from typing import Any

TELEGRAM_API = "https://api.telegram.org/bot"


class TelegramBot:
    """Telegram bot wrapper for Luqi-AI."""

    def __init__(self, token: str = "") -> None:
        import os
        self._token = token or os.environ.get("TELEGRAM_BOT_TOKEN", "")

    def is_configured(self) -> bool:
        return bool(self._token)

    def _api_call(self, method: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Make a Telegram API call."""
        if not self._token:
            return {"ok": False, "error": "No bot token configured"}
        try:
            import urllib.request
            url = f"{TELEGRAM_API}{self._token}/{method}"
            data = json.dumps(payload).encode()
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def send_message(self, chat_id: str | int, text: str) -> dict[str, Any]:
        """Send a message to a chat."""
        return self._api_call("sendMessage", {"chat_id": chat_id, "text": text[:4096], "parse_mode": "Markdown"})

    def get_updates(self, offset: int = 0) -> list[dict[str, Any]]:
        """Get pending updates (polling mode)."""
        result = self._api_call("getUpdates", {"offset": offset, "limit": 100})
        return result.get("result", [])

    def set_webhook(self, url: str) -> dict[str, Any]:
        """Set webhook URL."""
        return self._api_call("setWebhook", {"url": url})

    def get_me(self) -> dict[str, Any]:
        """Get bot info."""
        return self._api_call("getMe", {})

    def status(self) -> dict[str, Any]:
        me = self.get_me() if self.is_configured() else {}
        return {
            "configured": self.is_configured(),
            "bot_username": me.get("result", {}).get("username", "unknown") if me.get("ok") else "not connected",
        }
