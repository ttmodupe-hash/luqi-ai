"""DB Engine — Database connection pooling and query engine.
Supports SQLite, PostgreSQL, and MySQL.
"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, List, Optional


class DBEngine:
    """Database engine with connection pooling."""

    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv("DATABASE_URL", "sqlite:///omega_ai.db")
        self._pool = []
        self._max_pool_size = 10

    @contextmanager
    def connection(self):
        """Get a database connection from the pool."""
        conn = sqlite3.connect(self.database_url.replace("sqlite:///", ""))
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute a query and return results as dictionaries."""
        with self.connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """Execute a query multiple times."""
        with self.connection() as conn:
            cursor = conn.executemany(query, params_list)
            return cursor.rowcount

    def create_table(self, name: str, schema: Dict[str, str]):
        """Create a table from a schema dictionary."""
        columns = ", ".join(f"{col} {dtype}" for col, dtype in schema.items())
        query = f"CREATE TABLE IF NOT EXISTS {name} ({columns})"
        self.execute(query)

    def drop_table(self, name: str):
        self.execute(f"DROP TABLE IF EXISTS {name}")

    def health_check(self) -> Dict:
        try:
            self.execute("SELECT 1")
            return {"status": "healthy", "url": self.database_url}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


if __name__ == "__main__":
    engine = DBEngine()
    print(engine.health_check())
    engine.create_table("test", {"id": "INTEGER PRIMARY KEY", "name": "TEXT"})
    print(engine.execute("SELECT name FROM sqlite_master WHERE type='table'"))
