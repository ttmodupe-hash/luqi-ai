"""DB Layer — Abstraction layer for database operations."""

from typing import Any, Dict, List, Optional

from db_engine import DBEngine


class DBLayer:
    """High-level database abstraction."""

    def __init__(self, engine: DBEngine = None):
        self.engine = engine or DBEngine()

    def insert(self, table: str, data: Dict[str, Any]) -> int:
        columns = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        return self.engine.execute(query, tuple(data.values()))

    def select(self, table: str, where: Dict[str, Any] = None, limit: int = 100) -> List[Dict]:
        query = f"SELECT * FROM {table}"
        params = ()
        if where:
            conditions = " AND ".join(f"{k} = ?" for k in where)
            query += f" WHERE {conditions}"
            params = tuple(where.values())
        query += f" LIMIT {limit}"
        return self.engine.execute(query, params)

    def update(self, table: str, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        set_clause = ", ".join(f"{k} = ?" for k in data)
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        params = tuple(list(data.values()) + list(where.values()))
        return self.engine.execute(query, params)

    def delete(self, table: str, where: Dict[str, Any]) -> int:
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        query = f"DELETE FROM {table} WHERE {where_clause}"
        return self.engine.execute(query, tuple(where.values()))


if __name__ == "__main__":
    layer = DBLayer()
    print(layer.select("sqlite_master"))
