"""Omega AI v3.7.0 — Persistent Memory Manager
JSON-based persistent memory with CRUD, search, and auto-compaction.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class MemoryManager:
    """Persistent memory store using JSON files with CRUD operations."""

    def __init__(self, memory_dir: str = ".omega_sessions") -> None:
        self._memory_dir = Path(memory_dir)
        self._memory_dir.mkdir(parents=True, exist_ok=True)
        self._memory_file = self._memory_dir / "memory.json"
        self._data: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        """Load memory from disk."""
        if self._memory_file.exists():
            try:
                return json.loads(self._memory_file.read_text())
            except (json.JSONDecodeError, OSError):
                return {}
        return {}

    def _save(self) -> None:
        """Persist memory to disk."""
        self._memory_file.write_text(json.dumps(self._data, indent=2, default=str))

    def set(self, key: str, value: Any) -> None:
        """Store a value."""
        self._data[key] = {"value": value, "updated": datetime.now(timezone.utc).isoformat()}
        self._save()

    def get(self, key: str, default: Any = None) -> Any:
        """Retrieve a value."""
        entry = self._data.get(key)
        return entry["value"] if entry else default

    def delete(self, key: str) -> bool:
        """Delete a key. Returns True if deleted."""
        if key in self._data:
            del self._data[key]
            self._save()
            return True
        return False

    def list_keys(self) -> list[str]:
        """List all memory keys."""
        return list(self._data.keys())

    def search(self, query: str) -> dict[str, Any]:
        """Search memory keys and values."""
        results = {}
        q = query.lower()
        for key, entry in self._data.items():
            val_str = str(entry.get("value", "")).lower()
            if q in key.lower() or q in val_str:
                results[key] = entry
        return results

    def clear(self) -> None:
        """Clear all memory."""
        self._data = {}
        self._save()

    def get_stats(self) -> dict[str, Any]:
        """Memory statistics."""
        return {"keys": len(self._data), "file_size": self._memory_file.stat().st_size if self._memory_file.exists() else 0}

    def export(self, path: str) -> None:
        """Export memory to a file."""
        Path(path).write_text(json.dumps(self._data, indent=2, default=str))

    def import_(self, path: str) -> None:
        """Import memory from a file."""
        data = json.loads(Path(path).read_text())
        self._data.update(data)
        self._save()
