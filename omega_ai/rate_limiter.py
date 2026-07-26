"""
rate_limiter.py - Thread-safe sliding-window rate limiter for LUQI AI.

Provides per-client request tracking with configurable ``max_requests`` per
``window_seconds``.  All operations are protected by ``threading.Lock`` so the
limiter is safe to use from multiple threads (e.g. inside a FastAPI or Flask
app).

Usage::

    engine = __import__("rate_limiter").RateLimiter()
    engine.record_request("client-42")
    status = engine.is_allowed("client-42", max_requests=100, window_seconds=60)
    info   = engine.get_status()
"""

from __future__ import annotations

import time
import threading
import logging
from collections import defaultdict
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class RateLimiter:
    """Sliding-window rate limiter with thread-safe request tracking."""

    # --------------------------------------------------------------------- #
    # Lifecycle
    # --------------------------------------------------------------------- #
    def __init__(self) -> None:
        # client_id -> list of monotonic timestamps (seconds)
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._limits: Dict[str, Dict[str, int]] = {}

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #
    def _now(self) -> float:
        """Return current monotonic time in seconds."""
        return time.monotonic()

    def _prune_window(self, client_id: str, window_seconds: int) -> None:
        """Remove timestamps older than *window_seconds* for *client_id*."""
        cutoff = self._now() - window_seconds
        self._requests[client_id] = [
            ts for ts in self._requests[client_id] if ts > cutoff
        ]

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def record_request(self, client_id: str) -> None:
        """Record a new request for *client_id*.

        Parameters
        ----------
        client_id : str
            Unique identifier for the client (IP, API key, user-id, …).
        """
        with self._lock:
            self._requests[client_id].append(self._now())

    def is_allowed(
        self,
        client_id: str,
        max_requests: int = 100,
        window_seconds: int = 60,
    ) -> Dict[str, Any]:
        """Check whether a request from *client_id* is allowed.

        Parameters
        ----------
        client_id : str
            Unique client identifier.
        max_requests : int
            Maximum requests allowed inside the window (default: 100).
        window_seconds : int
            Size of the sliding window in seconds (default: 60).

        Returns
        -------
        dict
            ::

                {
                    "result": bool,     # same as "allowed"
                    "data": {
                        "allowed": bool,
                        "remaining": int,
                        "reset_after": float,   # seconds until window resets
                        "current_count": int,
                    },
                    "status": "success",
                    "success": True,
                    "message": "",
                }
        """
        with self._lock:
            self._prune_window(client_id, window_seconds)
            count = len(self._requests[client_id])
            allowed = count < max_requests
            remaining = max(0, max_requests - count)

            # Compute reset_after: time until the oldest request in window
            # falls out.  If no requests, window is effectively reset.
            if self._requests[client_id]:
                oldest = min(self._requests[client_id])
                reset_after = (oldest + window_seconds) - self._now()
                reset_after = max(0.0, reset_after)
            else:
                reset_after = 0.0

            # Persist limit config for get_status()
            self._limits[client_id] = {
                "max_requests": max_requests,
                "window_seconds": window_seconds,
            }

        return {
            "result": allowed,
            "data": {
                "allowed": allowed,
                "remaining": remaining,
                "reset_after": round(reset_after, 3),
                "current_count": count,
            },
            "status": "success",
            "success": True,
            "message": "",
        }

    def get_status(self) -> Dict[str, Any]:
        """Return current rate-limiter status across all tracked clients.

        Returns
        -------
        dict
            ::

                {
                    "result": dict,     # same as "data"
                    "data": {
                        "active_windows": int,
                        "total_tracked": int,
                        "limits": dict,     # per-client limit config
                    },
                    "status": "success",
                    "success": True,
                    "message": "",
                }
        """
        with self._lock:
            active = sum(
                1 for ts_list in self._requests.values() if ts_list
            )
            total = sum(len(ts_list) for ts_list in self._requests.values())
            limits_snapshot = dict(self._limits)

        return {
            "result": {
                "active_windows": active,
                "total_tracked": total,
                "limits": limits_snapshot,
            },
            "data": {
                "active_windows": active,
                "total_tracked": total,
                "limits": limits_snapshot,
            },
            "status": "success",
            "success": True,
            "message": "",
        }

    def reset_client(self, client_id: str) -> Dict[str, Any]:
        """Clear all tracked requests for *client_id*.

        Returns
        -------
        dict
            Standard result dictionary.
        """
        with self._lock:
            self._requests.pop(client_id, None)
            self._limits.pop(client_id, None)

        return {
            "result": True,
            "data": {"client_id": client_id, "reset": True},
            "status": "success",
            "success": True,
            "message": f"Rate limiter reset for {client_id}",
        }
