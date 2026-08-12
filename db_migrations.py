"""DB Migrations — Schema versioning and migration runner."""

import json
import os
from typing import List


class DBMigrations:
    """Database migration manager."""

    def __init__(self, migrations_dir: str = "./migrations"):
        self.migrations_dir = migrations_dir
        os.makedirs(migrations_dir, exist_ok=True)

    def create_migration(self, name: str, up_sql: str, down_sql: str = "") -> str:
        """Create a new migration file."""
        timestamp = int(os.times().system + os.times().user)
        filename = f"{timestamp:014d}_{name}.json"
        path = os.path.join(self.migrations_dir, filename)
        migration = {
            "name": name,
            "up": up_sql,
            "down": down_sql,
            "applied": False,
        }
        with open(path, "w") as f:
            json.dump(migration, f, indent=2)
        return filename

    def list_migrations(self) -> List[str]:
        files = sorted(os.listdir(self.migrations_dir))
        return [f for f in files if f.endswith(".json")]

    def apply_migration(self, filename: str):
        path = os.path.join(self.migrations_dir, filename)
        with open(path, "r") as f:
            migration = json.load(f)
        # In production, execute the SQL here
        migration["applied"] = True
        with open(path, "w") as f:
            json.dump(migration, f, indent=2)
        return migration["up"]

    def rollback_migration(self, filename: str):
        path = os.path.join(self.migrations_dir, filename)
        with open(path, "r") as f:
            migration = json.load(f)
        migration["applied"] = False
        with open(path, "w") as f:
            json.dump(migration, f, indent=2)
        return migration["down"]


if __name__ == "__main__":
    migrator = DBMigrations()
    print(migrator.list_migrations())
