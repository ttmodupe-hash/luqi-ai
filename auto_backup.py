"""Auto Backup — Automated backup scheduler for Omega AI data."""

import json
import os
import shutil
import tarfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import List


class AutoBackup:
    """Automated backup system."""

    def __init__(self, source_dir: str = "./data", backup_dir: str = "./backups"):
        self.source_dir = Path(source_dir)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self, name: str = None) -> str:
        """Create a timestamped backup archive."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = name or f"backup_{timestamp}"
        archive_path = self.backup_dir / f"{name}.tar.gz"

        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(self.source_dir, arcname="data")

        return str(archive_path)

    def list_backups(self) -> List[dict]:
        """List available backups."""
        backups = []
        for f in self.backup_dir.glob("*.tar.gz"):
            backups.append({
                "name": f.stem,
                "size": f.stat().st_size,
                "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return sorted(backups, key=lambda x: x["created"], reverse=True)

    def restore_backup(self, name: str) -> bool:
        """Restore from a backup archive."""
        archive_path = self.backup_dir / f"{name}.tar.gz"
        if not archive_path.exists():
            return False

        # Clear current data
        if self.source_dir.exists():
            shutil.rmtree(self.source_dir)

        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(path=self.source_dir.parent)

        return True

    def prune_old_backups(self, days: int = 30):
        """Remove backups older than specified days."""
        cutoff = datetime.now() - timedelta(days=days)
        for f in self.backup_dir.glob("*.tar.gz"):
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()


if __name__ == "__main__":
    backup = AutoBackup()
    print(backup.create_backup())
    print(json.dumps(backup.list_backups(), indent=2))
