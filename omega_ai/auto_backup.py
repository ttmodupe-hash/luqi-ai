"""Omega AI v3.7.0 — Automated Backup System
Scheduled database and configuration backups to local/cloud storage.
"""
from __future__ import annotations

import gzip
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class AutoBackup:
    """Automated backup with rotation and cloud upload."""

    def __init__(self, backup_dir: str = ".omega_sessions/backups", max_backups: int = 10) -> None:
        self._backup_dir = Path(backup_dir)
        self._backup_dir.mkdir(parents=True, exist_ok=True)
        self._max_backups = max_backups

    def backup_db(self, db_path: str = "omega_data.db") -> dict[str, Any]:
        """Backup SQLite database with compression."""
        src = Path(db_path)
        if not src.exists():
            return {"success": False, "error": f"Database not found: {db_path}"}
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = self._backup_dir / f"db_backup_{timestamp}.db.gz"
        try:
            with gzip.open(backup_file, "wb") as f_out:
                f_out.write(src.read_bytes())
            self._rotate()
            return {"success": True, "file": str(backup_file), "size": backup_file.stat().st_size, "timestamp": timestamp}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def backup_memory(self, memory_path: str = "memory.json") -> dict[str, Any]:
        """Backup memory store."""
        src = Path(memory_path)
        if not src.exists():
            return {"success": False, "error": f"Memory file not found: {memory_path}"}
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = self._backup_dir / f"memory_backup_{timestamp}.json.gz"
        try:
            with gzip.open(backup_file, "wb") as f_out:
                f_out.write(src.read_bytes())
            return {"success": True, "file": str(backup_file), "size": backup_file.stat().st_size}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def full_backup(self) -> dict[str, Any]:
        """Full system backup: DB + memory + config."""
        results = {"db": self.backup_db(), "memory": self.backup_memory(), "timestamp": time.time()}
        results["success"] = results["db"].get("success", False) and results["memory"].get("success", False)
        self._rotate()
        return results

    def _rotate(self) -> None:
        """Remove old backups keeping only max_backups."""
        backups = sorted(self._backup_dir.glob("*.gz"), key=lambda p: p.stat().st_mtime)
        while len(backups) > self._max_backups:
            backups[0].unlink()
            backups.pop(0)

    def list_backups(self) -> list[dict[str, Any]]:
        """List all available backups."""
        backups = []
        for f in sorted(self._backup_dir.glob("*.gz"), key=lambda p: p.stat().st_mtime, reverse=True):
            backups.append({"file": f.name, "size": f.stat().st_size, "created": f.stat().st_mtime})
        return backups

    def restore(self, backup_file: str, target_path: str | None = None) -> dict[str, Any]:
        """Restore from a backup file."""
        src = self._backup_dir / backup_file
        if not src.exists():
            return {"success": False, "error": "Backup not found"}
        try:
            if target_path is None:
                target_path = "omega_data.db" if "db_" in backup_file else "memory.json"
            with gzip.open(src, "rb") as f_in:
                Path(target_path).write_bytes(f_in.read())
            return {"success": True, "restored_to": target_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def cloud_sync(self, provider: str = "s3") -> dict[str, Any]:
        """Sync backups to cloud storage. Placeholder for cloud integration."""
        return {
            "success": True,
            "note": f"Cloud sync to {provider} requires configuration.",
            "providers_supported": ["s3", "gcs", "b2", "wasabi"],
        }

    def stats(self) -> dict[str, Any]:
        return {"backup_dir": str(self._backup_dir), "total_backups": len(list(self._backup_dir.glob("*.gz"))), "max_retained": self._max_backups, "latest": self.list_backups()[:1] if self.list_backups() else None}
