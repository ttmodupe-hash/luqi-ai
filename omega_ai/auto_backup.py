"""
auto_backup.py - Backup and restore manager for LUQI AI.

Creates timestamped backups under ``data/backups/`` with a JSON manifest
that tracks every file backed up.  Supports full restore by backup id and
listing all available backups.

Usage::

    engine = __import__("auto_backup").BackupManager()
    info = engine.create_backup()
    restored = engine.restore(info["backup_id"])
    all_backups = engine.list_backups()
"""

from __future__ import annotations

import json
import os
import shutil
import time
import logging
import base64
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class BackupManager:
    """Manages creation, restoration, and listing of data backups."""

    # --------------------------------------------------------------------- #
    # Constants
    # --------------------------------------------------------------------- #
    DEFAULT_BACKUP_DIR = Path("data/backups")
    SOURCE_DIR = Path("data")
    MANIFEST_NAME = "manifest.json"

    # --------------------------------------------------------------------- #
    # Lifecycle
    # --------------------------------------------------------------------- #
    def __init__(
        self,
        backup_dir: str | Path | None = None,
        source_dir: str | Path | None = None,
    ) -> None:
        """Initialise the backup manager.

        Parameters
        ----------
        backup_dir : str | Path, optional
            Directory where backups are stored (default: ``data/backups``).
        source_dir : str | Path, optional
            Directory to back up (default: ``data``).
        """
        self.backup_dir = Path(backup_dir) if backup_dir else self.DEFAULT_BACKUP_DIR
        self.source_dir = Path(source_dir) if source_dir else self.SOURCE_DIR
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #
    def _generate_backup_id(self) -> str:
        """Generate a unique backup id from the current timestamp."""
        return datetime.utcnow().strftime("%Y%m%d_%H%M%S_") + str(
            int(time.time())
        )

    def _manifest_path(self, backup_id: str) -> Path:
        """Return the path to the manifest for *backup_id*."""
        return self.backup_dir / backup_id / self.MANIFEST_NAME

    def _backup_path(self, backup_id: str) -> Path:
        """Return the root directory for *backup_id*."""
        return self.backup_dir / backup_id

    @staticmethod
    def _get_dir_size(path: Path) -> int:
        """Calculate total size in bytes of all files under *path*."""
        total = 0
        if path.exists():
            for entry in path.rglob("*"):
                if entry.is_file():
                    total += entry.stat().st_size
        return total

    @staticmethod
    def _copytree(src: Path, dst: Path) -> int:
        """Copy a directory tree, returning number of files copied.

        Skips the backup directory itself to avoid recursion.
        """
        files_copied = 0
        for item in src.rglob("*"):
            if not item.is_file():
                continue
            # Avoid backing up the backup dir itself
            try:
                if src in item.parents or item == src:
                    rel = item.relative_to(src)
                else:
                    continue
            except ValueError:
                continue

            dest_file = dst / rel
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_file)
            files_copied += 1
        return files_copied

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def create_backup(self) -> Dict[str, Any]:
        """Create a new backup of the source data directory.

        Returns
        -------
        dict
            ::

                {
                    "result": dict,     # same as "data"
                    "data": {
                        "backup_id": str,
                        "timestamp": str,
                        "files_backed_up": int,
                        "size_bytes": int,
                    },
                    "status": "success" | "error",
                    "success": bool,
                    "message": str,
                }
        """
        backup_id = self._generate_backup_id()
        timestamp = datetime.utcnow().isoformat() + "Z"
        backup_root = self._backup_path(backup_id)

        try:
            backup_root.mkdir(parents=True, exist_ok=True)

            # Copy files
            files_backed_up = 0
            if self.source_dir.exists():
                # Exclude the backups directory from backup to avoid recursion
                for item in self.source_dir.iterdir():
                    if item.name == "backups":
                        continue
                    dest = backup_root / item.name
                    if item.is_dir():
                        files_backed_up += self._copytree(item, dest)
                    elif item.is_file():
                        shutil.copy2(item, dest)
                        files_backed_up += 1

            size_bytes = self._get_dir_size(backup_root)

            # Write manifest
            manifest = {
                "backup_id": backup_id,
                "timestamp": timestamp,
                "files_backed_up": files_backed_up,
                "size_bytes": size_bytes,
                "source_dir": str(self.source_dir),
                "manifest_version": "1.0",
            }
            manifest_path = backup_root / self.MANIFEST_NAME
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)

            logger.info(
                "Backup %s created: %d files, %d bytes",
                backup_id,
                files_backed_up,
                size_bytes,
            )

            return {
                "result": {
                    "backup_id": backup_id,
                    "timestamp": timestamp,
                    "files_backed_up": files_backed_up,
                    "size_bytes": size_bytes,
                },
                "data": {
                    "backup_id": backup_id,
                    "timestamp": timestamp,
                    "files_backed_up": files_backed_up,
                    "size_bytes": size_bytes,
                },
                "status": "success",
                "success": True,
                "message": f"Backup {backup_id} created successfully.",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Backup creation failed")
            return {
                "result": {},
                "data": {},
                "status": "error",
                "success": False,
                "message": str(exc),
            }

    def restore(self, backup_id: str) -> Dict[str, Any]:
        """Restore data from a previously created backup.

        Parameters
        ----------
        backup_id : str
            The identifier of the backup to restore.

        Returns
        -------
        dict
            ::

                {
                    "result": dict,     # same as "data"
                    "data": {
                        "success": bool,
                        "files_restored": int,
                        "backup_id": str,
                    },
                    "status": "success" | "error",
                    "success": bool,
                    "message": str,
                }
        """
        backup_root = self._backup_path(backup_id)
        manifest_path = self._manifest_path(backup_id)

        if not backup_root.exists():
            return {
                "result": {},
                "data": {
                    "success": False,
                    "files_restored": 0,
                    "backup_id": backup_id,
                },
                "status": "error",
                "success": False,
                "message": f"Backup '{backup_id}' not found.",
            }

        try:
            # Load manifest if present
            manifest: Dict[str, Any] = {}
            if manifest_path.exists():
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)

            files_restored = 0
            # Ensure source directory exists
            self.source_dir.mkdir(parents=True, exist_ok=True)

            for item in backup_root.iterdir():
                if item.name == self.MANIFEST_NAME:
                    continue
                dest = self.source_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                    files_restored += sum(1 for _ in dest.rglob("*") if _.is_file())
                elif item.is_file():
                    shutil.copy2(item, dest)
                    files_restored += 1

            logger.info(
                "Backup %s restored: %d files",
                backup_id,
                files_restored,
            )

            return {
                "result": {
                    "success": True,
                    "files_restored": files_restored,
                    "backup_id": backup_id,
                },
                "data": {
                    "success": True,
                    "files_restored": files_restored,
                    "backup_id": backup_id,
                },
                "status": "success",
                "success": True,
                "message": f"Backup '{backup_id}' restored successfully.",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Restore failed")
            return {
                "result": {},
                "data": {
                    "success": False,
                    "files_restored": 0,
                    "backup_id": backup_id,
                },
                "status": "error",
                "success": False,
                "message": str(exc),
            }

    def list_backups(self) -> Dict[str, Any]:
        """List all available backups.

        Returns
        -------
        dict
            ::

                {
                    "result": list,     # same as "backups" inside data
                    "data": {
                        "backups": [
                            {
                                "backup_id": str,
                                "timestamp": str,
                                "files_backed_up": int,
                                "size_bytes": int,
                            },
                            ...
                        ]
                    },
                    "status": "success",
                    "success": True,
                    "message": "",
                }
        """
        backups: List[Dict[str, Any]] = []

        try:
            if not self.backup_dir.exists():
                return {
                    "result": [],
                    "data": {"backups": []},
                    "status": "success",
                    "success": True,
                    "message": "Backup directory does not exist yet.",
                }

            for entry in sorted(self.backup_dir.iterdir(), reverse=True):
                if not entry.is_dir():
                    continue
                manifest_path = entry / self.MANIFEST_NAME
                if manifest_path.exists():
                    with open(manifest_path, "r", encoding="utf-8") as f:
                        manifest = json.load(f)
                    backups.append(
                        {
                            "backup_id": manifest.get("backup_id", entry.name),
                            "timestamp": manifest.get("timestamp", ""),
                            "files_backed_up": manifest.get(
                                "files_backed_up", 0
                            ),
                            "size_bytes": manifest.get("size_bytes", 0),
                        }
                    )
                else:
                    # Directory without manifest - basic info
                    backups.append(
                        {
                            "backup_id": entry.name,
                            "timestamp": "",
                            "files_backed_up": 0,
                            "size_bytes": self._get_dir_size(entry),
                        }
                    )

            return {
                "result": backups,
                "data": {"backups": backups},
                "status": "success",
                "success": True,
                "message": f"Found {len(backups)} backup(s).",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Listing backups failed")
            return {
                "result": [],
                "data": {"backups": []},
                "status": "error",
                "success": False,
                "message": str(exc),
            }

    def delete_backup(self, backup_id: str) -> Dict[str, Any]:
        """Permanently delete a backup.

        Parameters
        ----------
        backup_id : str
            The backup identifier to delete.

        Returns
        -------
        dict
            Standard result dictionary.
        """
        backup_root = self._backup_path(backup_id)
        if not backup_root.exists():
            return {
                "result": False,
                "data": {"deleted": False},
                "status": "error",
                "success": False,
                "message": f"Backup '{backup_id}' not found.",
            }
        try:
            shutil.rmtree(backup_root)
            return {
                "result": True,
                "data": {"deleted": True, "backup_id": backup_id},
                "status": "success",
                "success": True,
                "message": f"Backup '{backup_id}' deleted.",
            }
        except Exception as exc:
            logger.exception("Delete backup failed")
            return {
                "result": False,
                "data": {"deleted": False},
                "status": "error",
                "success": False,
                "message": str(exc),
            }
