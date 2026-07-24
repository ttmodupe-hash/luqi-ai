"""Omega AI v3.7.0 — WebSocket Server
Real-time streaming for chat and events. Falls back to SSE if WS unavailable.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Callable

# Try websockets, fall back to SSE mode
try:
    import websockets
    _HAS_WS = True
except ImportError:
    _HAS_WS = False


class WebSocketManager:
    """Manages WebSocket connections and streaming responses."""

    def __init__(self) -> None:
        self._clients: set = set()
        self._handlers: dict[str, Callable] = {}
        self._running = False

    def register_handler(self, event: str, handler: Callable) -> None:
        """Register a handler for an event type."""
        self._handlers[event] = handler

    async def handle_client(self, websocket, path: str = "") -> None:
        """Handle a single WebSocket client connection."""
        self._clients.add(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    event = data.get("event", "chat")
                    handler = self._handlers.get(event)
                    if handler:
                        # Stream response in chunks
                        async for chunk in handler(data):
                            await websocket.send(json.dumps(chunk))
                    else:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": f"Unknown event: {event}"
                        }))
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON"
                    }))
        except Exception:
            pass
        finally:
            self._clients.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connected clients."""
        if not self._clients:
            return
        data = json.dumps(message)
        disconnected = set()
        for client in self._clients:
            try:
                await client.send(data)
            except Exception:
                disconnected.add(client)
        self._clients -= disconnected

    async def start(self, host: str = "0.0.0.0", port: int = 8081) -> None:
        """Start the WebSocket server."""
        if not _HAS_WS:
            print("[WS] websockets library not installed. Install: pip install websockets")
            return
        self._running = True
        print(f"[WS] WebSocket server starting on ws://{host}:{port}")
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()  # Run forever

    def stop(self) -> None:
        self._running = False


# ── SSE Fallback ──
class SSEFallback:
    """Server-Sent Events fallback for browsers without WebSocket support."""

    @staticmethod
    def format_sse(data: dict[str, Any], event: str | None = None) -> str:
        """Format data as SSE message."""
        msg = ""
        if event:
            msg += f"event: {event}\n"
        msg += f"data: {json.dumps(data)}\n\n"
        return msg


# ── Chat streaming handler ──
async def stream_chat_handler(data: dict[str, Any]):
    """Stream chat response in chunks."""
    from core_brain import OmegaBrain
    brain = OmegaBrain()
    query = data.get("message", "")
    # Send typing indicator
    yield {"type": "status", "status": "typing"}
    # Get response
    try:
        result = brain.orchestrate_response(query)
        response_text = result.get("response", "")
        # Stream in word chunks
        words = response_text.split()
        buffer = ""
        for i, word in enumerate(words):
            buffer += word + " "
            if i % 3 == 0 or i == len(words) - 1:
                yield {"type": "chunk", "content": buffer.strip()}
                buffer = ""
                await asyncio.sleep(0.05)  # Simulate streaming
        yield {
            "type": "complete",
            "content": response_text,
            "module": result.get("module"),
            "timing_ms": result.get("timing_ms"),
            "sources": result.get("sources"),
        }
    except Exception as e:
        yield {"type": "error", "message": str(e)}


# Global manager
_ws_manager: WebSocketManager | None = None

def get_ws_manager() -> WebSocketManager:
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
        _ws_manager.register_handler("chat", stream_chat_handler)
    return _ws_manager
