"""
Plugin Marketplace Module for LUQI AI.

Provides discovery, installation, and management of LUQI extensions.
Plugins are referenced by ID and carry metadata for versioning, authorship,
and categorisation.

Usage:
    mod = __import__("omega_ai.plugin_marketplace")
    engine = mod.Marketplace()
    plugins = engine.list_plugins()
    engine.install("weather")
"""

from __future__ import annotations

from typing import Any


_PLUGIN_CATALOG: list[dict[str, Any]] = [
    {
        "id": "weather",
        "name": "Weather",
        "description": "Real-time weather forecasts and alerts for any city worldwide.",
        "version": "1.2.0",
        "author": "LUQI Team",
        "category": "utilities",
        "installed": False,
    },
    {
        "id": "news",
        "name": "News Aggregator",
        "description": "Curated news headlines from global sources with sentiment analysis.",
        "version": "2.0.1",
        "author": "LUQI Team",
        "category": "information",
        "installed": False,
    },
    {
        "id": "calculator",
        "name": "Smart Calculator",
        "description": "Advanced calculator with unit-aware expression evaluation.",
        "version": "1.0.3",
        "author": "LUQI Team",
        "category": "utilities",
        "installed": False,
    },
    {
        "id": "translator",
        "name": "Translator",
        "description": "Neural machine translation across 50+ languages.",
        "version": "1.4.0",
        "author": "LUQI Team",
        "category": "language",
        "installed": False,
    },
    {
        "id": "unit_converter",
        "name": "Unit Converter",
        "description": "Convert between metric, imperial, and specialised unit systems.",
        "version": "1.1.0",
        "author": "LUQI Team",
        "category": "utilities",
        "installed": False,
    },
    {
        "id": "calendar",
        "name": "Calendar",
        "description": "Event scheduling, reminders, and calendar management.",
        "version": "1.3.2",
        "author": "LUQI Team",
        "category": "productivity",
        "installed": False,
    },
    {
        "id": "notes",
        "name": "Notes",
        "description": "Rich-text note taking with markdown support and tagging.",
        "version": "1.0.5",
        "author": "LUQI Team",
        "category": "productivity",
        "installed": False,
    },
    {
        "id": "reminders",
        "name": "Reminders",
        "description": "Create and manage time-based and location-based reminders.",
        "version": "1.2.1",
        "author": "LUQI Team",
        "category": "productivity",
        "installed": False,
    },
    {
        "id": "stocks",
        "name": "Stock Tracker",
        "description": "Live stock quotes, charts, and portfolio tracking.",
        "version": "1.5.0",
        "author": "LUQI Team",
        "category": "finance",
        "installed": False,
    },
    {
        "id": "dictionary",
        "name": "Dictionary",
        "description": "Definitions, synonyms, etymology, and pronunciation guides.",
        "version": "1.0.0",
        "author": "LUQI Team",
        "category": "language",
        "installed": False,
    },
    {
        "id": "code_runner",
        "name": "Code Runner",
        "description": "Execute Python and JavaScript snippets in a sandboxed environment.",
        "version": "0.9.0",
        "author": "LUQI Team",
        "category": "developer",
        "installed": False,
    },
]


class Marketplace:
    """Plugin marketplace for LUQI extensions."""

    def __init__(self) -> None:
        """Initialize the marketplace with the built-in plugin catalog."""
        self.plugins: dict[str, dict[str, Any]] = self._load_catalog()

    # ── internal helpers ──────────────────────────────────────────────────

    def _load_catalog(self) -> dict[str, dict[str, Any]]:
        """Load built-in plugin catalog (11 plugins).

        Returns:
            Mapping of plugin_id -> plugin metadata dictionary.
        """
        return {p["id"]: dict(p) for p in _PLUGIN_CATALOG}

    # ── public API ────────────────────────────────────────────────────────

    def list_plugins(self) -> dict:
        """List available plugins.

        Returns:
            Dictionary with a list of plugin metadata records.
        """
        items = [dict(p) for p in self.plugins.values()]
        return {
            "result": "success",
            "status": "ok",
            "data": items,
        }

    def get_plugin(self, plugin_id: str) -> dict:
        """Get plugin details.

        Args:
            plugin_id: Unique plugin identifier.

        Returns:
            Dictionary with plugin metadata or an error payload.
        """
        plugin = self.plugins.get(plugin_id)
        if plugin is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {"message": f"Plugin {plugin_id!r} not found."},
            }
        return {
            "result": "success",
            "status": "ok",
            "data": dict(plugin),
        }

    def install(self, plugin_id: str) -> dict:
        """Install a plugin.

        Args:
            plugin_id: Unique plugin identifier.

        Returns:
            Dictionary with success flag, plugin_id, and a message.
        """
        plugin = self.plugins.get(plugin_id)
        if plugin is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {
                    "success": False,
                    "plugin_id": plugin_id,
                    "message": f"Plugin {plugin_id!r} does not exist in catalog.",
                },
            }
        if plugin["installed"]:
            return {
                "result": "success",
                "status": "already_installed",
                "data": {
                    "success": True,
                    "plugin_id": plugin_id,
                    "message": f"Plugin {plugin['name']!r} is already installed.",
                },
            }
        plugin["installed"] = True
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "success": True,
                "plugin_id": plugin_id,
                "message": f"Plugin {plugin['name']!r} v{plugin['version']} installed successfully.",
            },
        }

    def uninstall(self, plugin_id: str) -> dict:
        """Uninstall a plugin.

        Args:
            plugin_id: Unique plugin identifier.

        Returns:
            Dictionary with success flag, plugin_id, and a message.
        """
        plugin = self.plugins.get(plugin_id)
        if plugin is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {
                    "success": False,
                    "plugin_id": plugin_id,
                    "message": f"Plugin {plugin_id!r} does not exist in catalog.",
                },
            }
        if not plugin["installed"]:
            return {
                "result": "success",
                "status": "not_installed",
                "data": {
                    "success": True,
                    "plugin_id": plugin_id,
                    "message": f"Plugin {plugin['name']!r} was not installed.",
                },
            }
        plugin["installed"] = False
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "success": True,
                "plugin_id": plugin_id,
                "message": f"Plugin {plugin['name']!r} uninstalled successfully.",
            },
        }

    def list_installed(self) -> dict:
        """List only installed plugins.

        Returns:
            Dictionary with a filtered list of installed plugin records.
        """
        items = [dict(p) for p in self.plugins.values() if p["installed"]]
        return {
            "result": "success",
            "status": "ok",
            "data": items,
        }

    def list_by_category(self, category: str) -> dict:
        """List plugins filtered by category.

        Args:
            category: Category string to filter by.

        Returns:
            Dictionary with matching plugin records.
        """
        items = [dict(p) for p in self.plugins.values() if p["category"] == category]
        return {
            "result": "success",
            "status": "ok",
            "data": items,
        }
