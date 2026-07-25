"""Omega AI v3 — Self-Registering Plugin Architecture

Plugin system where new capabilities can be added without modifying core_brain.py.

Example:
    @capability("weather", keywords=["weather", "forecast", "temperature"], priority=1)
    class WeatherPlugin:
        def handle(self, query: str) -> dict:
            return {"response": "Weather data here...", "sources": []}

    # Or manual registration:
    registry = PluginRegistry()
    registry.register("news", NewsPlugin, ["news", "headlines"], priority=2)

    # Match intent:
    handler = registry.match_intent("What's the weather in Tokyo?")
    result = handler.handle(query)
"""

from __future__ import annotations

import importlib
import importlib.util
import inspect
import json
import os
import pkgutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Generator, List, Optional, Type, Union


class PluginError(Exception):
    """Raised when a plugin operation fails."""


class PluginNotFoundError(PluginError):
    """Raised when a requested plugin handler is not found."""


class PluginInterface:
    """Abstract interface that all capability handler classes must implement.

    Subclasses must provide a ``handle(query: str) -> dict`` method.
    """

    def handle(self, query: str) -> dict:
        """Process the given query and return a response dict.

        Args:
            query: The raw user query string.

        Returns:
            A dictionary with at least a ``response`` key. Common keys:
            - ``response`` (str): The text response to show the user.
            - ``sources`` (list[str]): Optional list of source references.
            - ``data`` (Any): Optional structured data for downstream use.
        """
        raise NotImplementedError("Plugins must implement handle(query: str) -> dict")


# ---------------------------------------------------------------------------
# Internal record for a registered capability
# ---------------------------------------------------------------------------


class _CapabilityRecord:
    """Internal data holder for a registered capability."""

    __slots__ = ("name", "handler_class", "keywords", "priority", "instance")

    def __init__(
        self,
        name: str,
        handler_class: Type[PluginInterface],
        keywords: list[str],
        priority: int = 0,
    ) -> None:
        self.name = name
        self.handler_class = handler_class
        self.keywords = keywords
        self.priority = priority
        self.instance: PluginInterface | None = None

    def get_instance(self) -> PluginInterface:
        """Return a singleton instance of the handler class."""
        if self.instance is None:
            self.instance = self.handler_class()
        return self.instance

    def score(self, query: str) -> float:
        """Score how well this capability matches *query*.

        Scoring algorithm (higher = better match):
        - Exact keyword match in query: +1.0 per keyword
        - Partial (substring) match: +0.3 per keyword
        - Priority bonus: +priority * 0.01 (tie-breaker)
        """
        query_lower = query.lower()
        score = 0.0
        for kw in self.keywords:
            kw_lower = kw.lower()
            if kw_lower in query_lower:
                # Whole-word match scores higher
                for word in query_lower.split():
                    if kw_lower == word:
                        score += 1.0
                        break
                else:
                    score += 0.3
        # Priority acts as a tie-breaker
        score += self.priority * 0.01
        return score

    def to_dict(self) -> dict:
        """Serialise record metadata to a dict."""
        return {
            "name": self.name,
            "keywords": self.keywords,
            "priority": self.priority,
            "handler": f"{self.handler_class.__module__}.{self.handler_class.__qualname__}",
        }


# ---------------------------------------------------------------------------
# Plugin Registry (singleton)
# ---------------------------------------------------------------------------


class _PluginMetrics:
    """Usage metrics for a single plugin."""

    def __init__(self) -> None:
        self.invocations: int = 0
        self.errors: int = 0
        self.total_response_time_ms: float = 0.0
        self.last_invoked: float = 0.0
        self.last_error: str = ""

    def record(self, response_time_ms: float, error: str = "") -> None:
        self.invocations += 1
        self.total_response_time_ms += response_time_ms
        self.last_invoked = time.time()
        if error:
            self.errors += 1
            self.last_error = error

    @property
    def avg_response_time_ms(self) -> float:
        if self.invocations == 0:
            return 0.0
        return self.total_response_time_ms / self.invocations

    def to_dict(self) -> dict:
        return {
            "invocations": self.invocations,
            "errors": self.errors,
            "avg_response_time_ms": round(self.avg_response_time_ms, 1),
            "last_invoked": datetime.fromtimestamp(self.last_invoked).isoformat() if self.last_invoked else None,
            "last_error": self.last_error or None,
        }


class PluginRegistry:
    """Central registry for Omega-AI capability plugins.

    Use the module-level ``registry`` instance (or call ``PluginRegistry()``)
    to interact with the singleton.  New capabilities can be added via:

    1. **Decorator** — ``@capability(...)`` on a class definition.
    2. **Manual** — ``registry.register(...)``.
    3. **Auto-discovery** — ``registry.discover(directory)`` loads ``*.py`` files.

    v3.5.0 enhancements:
    - Plugin usage metrics (invocations, errors, response times)
    - Plugin health check system
    - Middleware hook support
    - Auto-discovery integration

    Attributes:
        _capabilities: Ordered dict mapping capability name → _CapabilityRecord.
        _metrics: Dict mapping capability name → _PluginMetrics.
        _middleware: List of middleware functions.
    """

    _instance: PluginRegistry | None = None
    _lock: bool = False  # naive re-entrancy guard for __new__

    def __new__(cls) -> PluginRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._capabilities: dict[str, _CapabilityRecord] = {}
            cls._instance._frozen = False
            cls._instance._metrics: dict[str, _PluginMetrics] = {}
            cls._instance._middleware: list[Callable] = []
            cls._instance._discovery_paths: list[str] = []
        return cls._instance

    # -- Registration -------------------------------------------------------

    def register(
        self,
        name: str,
        handler_class: Type[PluginInterface],
        keywords: list[str],
        priority: int = 0,
    ) -> None:
        """Manually register a capability handler.

        Args:
            name: Unique capability identifier (e.g. ``"weather"``).
            handler_class: Class implementing ``PluginInterface``.
            keywords: List of trigger words/phrases for intent scoring.
            priority: Higher values rank earlier in matching order.

        Raises:
            PluginError: If *handler_class* does not implement ``handle``.
            ValueError: If *name* is already registered and registry is frozen.
        """
        if not inspect.isclass(handler_class):
            raise PluginError(f"Handler for '{name}' must be a class, got {type(handler_class)}")
        if not hasattr(handler_class, "handle") or not callable(getattr(handler_class, "handle")):
            raise PluginError(f"Handler class for '{name}' must implement handle(query: str) -> dict")
        if name in self._capabilities and self._frozen:
            raise ValueError(f"Capability '{name}' is already registered and registry is frozen")

        self._capabilities[name] = _CapabilityRecord(
            name=name,
            handler_class=handler_class,
            keywords=keywords,
            priority=priority,
        )

    def unregister(self, name: str) -> None:
        """Remove a previously registered capability.

        Args:
            name: Capability name to remove.

        Raises:
            PluginNotFoundError: If *name* is not registered.
        """
        if name not in self._capabilities:
            raise PluginNotFoundError(f"Capability '{name}' not found in registry")
        del self._capabilities[name]

    # -- Decorator support --------------------------------------------------

    def decorator(
        self,
        name: str,
        keywords: list[str],
        priority: int = 0,
    ) -> Callable[[Type], Type]:
        """Return a class decorator that registers the decorated class.

        This is the machinery behind the module-level ``@capability`` helper.
        """

        def _wrapper(cls: Type) -> Type:
            self.register(name, cls, keywords, priority)
            return cls

        return _wrapper

    # -- Discovery ----------------------------------------------------------

    def discover(self, directory: str | Path, package_prefix: str = "") -> int:
        """Auto-discover and register plugins from *directory*.

        All ``*.py`` files (except those starting with ``_``) are imported;
        any classes decorated with ``@capability`` are automatically registered.

        Args:
            directory: Folder path to scan.
            package_prefix: Dotted package prefix (e.g. ``"omega_ai.plugins"``).

        Returns:
            Number of new capabilities registered during discovery.
        """
        count_before = len(self._capabilities)
        dir_path = Path(directory).resolve()
        if not dir_path.is_dir():
            raise PluginError(f"Plugin directory does not exist: {dir_path}")

        # Add directory to sys.path temporarily so bare imports work
        str_path = str(dir_path)
        added_to_path = False
        if str_path not in sys.path:
            sys.path.insert(0, str_path)
            added_to_path = True

        try:
            for entry in sorted(dir_path.glob("*.py")):
                if entry.name.startswith("_"):
                    continue
                module_name = f"{package_prefix}.{entry.stem}" if package_prefix else entry.stem
                try:
                    spec = importlib.util.spec_from_file_location(module_name, entry)
                    if spec is None or spec.loader is None:
                        continue
                    module = importlib.util.module_from_spec(spec)
                    sys.modules[module_name] = module
                    spec.loader.exec_module(module)
                except Exception as exc:
                    # Log but don't crash — one broken plugin shouldn't break the rest
                    print(f"[PluginRegistry] Failed to load {entry.name}: {exc}")
        finally:
            if added_to_path:
                sys.path.remove(str_path)

        return len(self._capabilities) - count_before

    # -- Query / lookup -----------------------------------------------------

    def get_handler(self, name: str) -> PluginInterface:
        """Retrieve the instantiated handler for *name*.

        Args:
            name: Registered capability name.

        Returns:
            An instance of the handler class (created lazily).

        Raises:
            PluginNotFoundError: If *name* is not registered.
        """
        if name not in self._capabilities:
            raise PluginNotFoundError(f"Capability '{name}' not found. Registered: {list(self._capabilities.keys())}")
        return self._capabilities[name].get_instance()

    def match_intent(self, query: str, threshold: float = 0.0) -> PluginInterface | None:
        """Score all registered plugins against *query* and return the best match.

        Args:
            query: User query string.
            threshold: Minimum score required to return a handler.

        Returns:
            The highest-scoring handler instance, or ``None`` if no plugin
            meets the threshold.
        """
        if not self._capabilities:
            return None

        scored = [
            (record, record.score(query))
            for record in self._capabilities.values()
        ]
        # Sort by score descending, then by priority descending as tie-break
        scored.sort(key=lambda x: (x[1], x[0].priority), reverse=True)

        best_record, best_score = scored[0]
        if best_score <= threshold:
            return None
        return best_record.get_instance()

    def list_capabilities(self) -> list[dict]:
        """Return a list of metadata dicts for every registered capability."""
        return [record.to_dict() for record in self._capabilities.values()]

    def freeze(self) -> None:
        """Freeze the registry — no new registrations allowed."""
        self._frozen = True

    def unfreeze(self) -> None:
        """Unfreeze the registry — allow new registrations."""
        self._frozen = False

    def __len__(self) -> int:
        return len(self._capabilities)

    def __contains__(self, name: str) -> bool:
        return name in self._capabilities

    # -- v3.5.0: Metrics & Analytics ----------------------------------------

    def record_invocation(self, name: str, response_time_ms: float = 0, error: str = "") -> None:
        """Record a plugin invocation for metrics tracking."""
        if name not in self._metrics:
            self._metrics[name] = _PluginMetrics()
        self._metrics[name].record(response_time_ms, error)

    def get_metrics(self, name: str) -> dict | None:
        """Get metrics for a specific plugin."""
        metrics = self._metrics.get(name)
        return metrics.to_dict() if metrics else None

    def get_all_metrics(self) -> dict[str, dict]:
        """Get metrics for all registered plugins."""
        return {name: m.to_dict() for name, m in self._metrics.items()}

    # -- v3.5.0: Health Checks ----------------------------------------------

    def health_check(self, name: str) -> dict:
        """Run a health check on a specific plugin.

        Returns a dict with keys:
            - status: "healthy" | "degraded" | "unhealthy"
            - registered: bool
            - invocations: int
            - error_rate: float (0.0-1.0)
            - avg_response_time_ms: float
            - message: str
        """
        if name not in self._capabilities:
            return {
                "status": "unhealthy",
                "registered": False,
                "message": f"Plugin '{name}' not registered",
            }

        metrics = self._metrics.get(name)
        if not metrics or metrics.invocations == 0:
            return {
                "status": "healthy",
                "registered": True,
                "invocations": 0,
                "error_rate": 0.0,
                "avg_response_time_ms": 0.0,
                "message": "Plugin registered but never invoked",
            }

        error_rate = metrics.errors / metrics.invocations
        avg_rt = metrics.avg_response_time_ms

        if error_rate > 0.5:
            status = "unhealthy"
        elif error_rate > 0.1 or avg_rt > 10000:
            status = "degraded"
        else:
            status = "healthy"

        return {
            "status": status,
            "registered": True,
            "invocations": metrics.invocations,
            "error_rate": round(error_rate, 3),
            "avg_response_time_ms": round(avg_rt, 1),
            "message": f"{metrics.invocations} invocations, {metrics.errors} errors",
        }

    def health_check_all(self) -> dict[str, dict]:
        """Run health checks on all registered plugins."""
        return {name: self.health_check(name) for name in self._capabilities}

    # -- v3.5.0: Middleware -------------------------------------------------

    def add_middleware(self, fn: Callable[[str, dict], dict]) -> None:
        """Add a middleware function that transforms plugin responses.

        Middleware signature: fn(query: str, response: dict) -> dict
        """
        self._middleware.append(fn)

    def apply_middleware(self, query: str, response: dict) -> dict:
        """Apply all registered middleware to a response."""
        for mw in self._middleware:
            try:
                response = mw(query, response)
            except Exception as e:
                # Middleware errors shouldn't break the response
                response.setdefault("_middleware_errors", []).append(str(e))
        return response

    # -- v3.5.0: Auto-discovery integration ---------------------------------

    def discover_and_register(self, directories: list[str] | None = None) -> int:
        """Auto-discover plugins from configured directories.

        Args:
            directories: List of directories to scan. If None, uses
                         previously configured discovery paths.

        Returns:
            Total number of new plugins registered.
        """
        dirs = directories or self._discovery_paths
        if not dirs:
            # Default: discover from plugins/ subdirectory
            project_root = Path(__file__).resolve().parent
            default_plugins = project_root / "plugins"
            if default_plugins.is_dir():
                dirs = [str(default_plugins)]
            else:
                return 0

        total = 0
        for d in dirs:
            try:
                count = self.discover(d)
                total += count
                if d not in self._discovery_paths:
                    self._discovery_paths.append(d)
            except PluginError as e:
                print(f"[PluginRegistry] Discovery skipped for {d}: {e}")

        return total

    def add_discovery_path(self, path: str) -> None:
        """Add a directory to the auto-discovery path list."""
        if path not in self._discovery_paths:
            self._discovery_paths.append(path)

    # -- v3.5.0: Full status report -----------------------------------------

    def get_full_status(self) -> dict:
        """Get complete registry status with metrics and health."""
        return {
            "version": "3.6.0",
            "total_plugins": len(self._capabilities),
            "frozen": self._frozen,
            "plugins": self.list_capabilities(),
            "metrics": self.get_all_metrics(),
            "health": self.health_check_all(),
            "discovery_paths": self._discovery_paths,
            "middleware_count": len(self._middleware),
        }

    def __repr__(self) -> str:
        names = ", ".join(self._capabilities.keys())
        return f"PluginRegistry({len(self._capabilities)} capabilities: {names})"


# ---------------------------------------------------------------------------
# Module-level singleton & convenience decorator
# ---------------------------------------------------------------------------

registry = PluginRegistry()


def capability(name: str, keywords: list[str], priority: int = 0) -> Callable[[Type], Type]:
    """Class decorator — register the decorated class as a named capability.

    Args:
        name: Unique capability identifier.
        keywords: Trigger words for intent matching.
        priority: Higher values rank earlier (tie-breaker).

    Example::

        @capability("weather", keywords=["weather", "forecast", "temperature"], priority=1)
        class WeatherPlugin:
            def handle(self, query: str) -> dict:
                return {"response": "Sunny, 22°C", "sources": []}
    """
    return registry.decorator(name, keywords, priority)


# ---------------------------------------------------------------------------
# Built-in example plugins (registered automatically when module is imported)
# ---------------------------------------------------------------------------

@capability("weather", keywords=["weather", "forecast", "temperature", "rain", "sunny"], priority=1)
class WeatherPlugin:
    """Example weather capability plugin."""

    def handle(self, query: str) -> dict:
        """Return a placeholder weather response.

        In a real deployment this would call a weather API.
        """
        return {
            "response": "Weather data would appear here... (integrate OpenWeatherMap or similar)",
            "sources": ["weather-api"],
            "data": {"temperature_c": None, "condition": "unknown"},
        }


@capability("news", keywords=["news", "headlines", "latest", "today"], priority=0)
class NewsPlugin:
    """Example news capability plugin."""

    def handle(self, query: str) -> dict:
        """Return a placeholder news response."""
        return {
            "response": "Latest headlines would appear here... (integrate NewsAPI or similar)",
            "sources": ["news-api"],
            "data": {"headlines": []},
        }


@capability("stocks", keywords=["stock", "price", "ticker", "market", "invest"], priority=2)
class StocksPlugin:
    """Example stock-market capability plugin."""

    def handle(self, query: str) -> dict:
        """Return a placeholder stock response."""
        return {
            "response": "Stock data would appear here... (integrate Yahoo Finance or similar)",
            "sources": ["yahoo-finance"],
            "data": {"ticker": None, "price": None},
        }


# ---------------------------------------------------------------------------
# CLI sanity-check
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("PluginRegistry — Luqi-AI Self-Registering Plugin System")
    print("=" * 60)

    print("\nRegistered capabilities:")
    for meta in registry.list_capabilities():
        print(f"  - {meta['name']} (priority={meta['priority']}, keywords={meta['keywords']})")

    print(f"\nRegistry: {registry}")

    # Intent matching demo
    queries = [
        "What's the weather in Tokyo?",
        "Show me stock prices for AAPL",
        "Latest news headlines",
        "Who is Satoshi Nakamoto?",  # No match expected
    ]

    print("\n--- Intent matching ---")
    for q in queries:
        handler = registry.match_intent(q)
        if handler:
            result = handler.handle(q)
            print(f"\nQuery: {q}")
            print(f"  Handler: {type(handler).__name__}")
            print(f"  Response: {result['response'][:80]}...")
        else:
            print(f"\nQuery: {q}")
            print("  No matching handler found")

    print("\n--- Manual registration demo ---")

    @capability("time", keywords=["time", "clock", "current time"], priority=0)
    class TimePlugin:
        def handle(self, query: str) -> dict:
            from datetime import datetime
            return {
                "response": f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "sources": ["system-clock"],
            }

    handler = registry.get_handler("time")
    print(f"TimePlugin response: {handler.handle('What time is it?')}")

    print("\nDone.")
