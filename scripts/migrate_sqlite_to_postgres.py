#!/usr/bin/env python3
"""
LUQI AI - SQLite to PostgreSQL Migration Script
================================================
Migrates data from a local SQLite database to PostgreSQL.
Useful when transitioning from development to production.

Usage:
    python migrate_sqlite_to_postgres.py \
        --sqlite-path ./dev.db \
        --postgres-url "postgresql+asyncpg://user:pass@host:5432/db"
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine


# =============================================================================
# Configuration
# =============================================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="Migrate SQLite database to PostgreSQL"
    )
    parser.add_argument(
        "--sqlite-path",
        required=True,
        help="Path to the SQLite database file",
    )
    parser.add_argument(
        "--postgres-url",
        required=True,
        help="PostgreSQL connection URL",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Number of rows to insert per batch",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without executing",
    )
    return parser.parse_args()


# =============================================================================
# Schema Discovery
# =============================================================================

def get_sqlite_tables(sqlite_engine):
    """Get all table names from SQLite database."""
    with sqlite_engine.connect() as conn:
        result = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        )
        return [row[0] for row in result]


def get_table_schema(sqlite_engine, table_name):
    """Get column information for a SQLite table."""
    with sqlite_engine.connect() as conn:
        result = conn.execute(text(f"PRAGMA table_info({table_name})"))
        columns = []
        for row in result:
            columns.append({
                "name": row[1],
                "type": row[2],
                "notnull": row[3],
                "default": row[4],
                "pk": row[5],
            })
        return columns


def get_table_data(sqlite_engine, table_name):
    """Get all data from a SQLite table."""
    with sqlite_engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        columns = result.keys()
        rows = [dict(zip(columns, row)) for row in result]
        return rows


# =============================================================================
# PostgreSQL Operations
# =============================================================================

def create_postgres_table(postgres_engine, table_name, columns):
    """Create a table in PostgreSQL matching SQLite schema."""
    type_mapping = {
        "INTEGER": "INTEGER",
        "TEXT": "TEXT",
        "REAL": "REAL",
        "BLOB": "BYTEA",
        "NUMERIC": "NUMERIC",
        "BOOLEAN": "BOOLEAN",
        "DATETIME": "TIMESTAMP",
        "DATE": "DATE",
        "TIME": "TIME",
    }

    column_defs = []
    primary_keys = []

    for col in columns:
        sqlite_type = col["type"].upper().split("(")[0]
        pg_type = type_mapping.get(sqlite_type, "TEXT")

        col_def = f'"{col["name"]}" {pg_type}'
        if col["notnull"]:
            col_def += " NOT NULL"
        if col["default"] is not None:
            col_def += f" DEFAULT {col['default']}"

        column_defs.append(col_def)

        if col["pk"]:
            primary_keys.append(f'"{col["name"]}"')

    if primary_keys:
        column_defs.append(f"PRIMARY KEY ({', '.join(primary_keys)})")

    create_sql = f"""
    CREATE TABLE IF NOT EXISTS "{table_name}" (
        {', '.join(column_defs)}
    )
    """

    return create_sql


def migrate_table(sqlite_engine, postgres_engine, table_name, batch_size, dry_run):
    """Migrate a single table from SQLite to PostgreSQL."""
    print(f"Migrating table: {table_name}")

    columns = get_table_schema(sqlite_engine, table_name)
    rows = get_table_data(sqlite_engine, table_name)

    if not rows:
        print(f"  Table {table_name} is empty, skipping")
        return

    create_sql = create_postgres_table(postgres_engine, table_name, columns)

    if dry_run:
        print(f"  [DRY RUN] Would execute: {create_sql[:100]}...")
        print(f"  [DRY RUN] Would insert {len(rows)} rows")
        return

    # Create table
    with postgres_engine.connect() as conn:
        conn.execute(text(create_sql))
        conn.commit()

    # Insert data in batches
    column_names = [f'"{col["name"]}"' for col in columns]
    placeholders = [f":{col['name']}" for col in columns]

    insert_sql = f"""
    INSERT INTO "{table_name}" ({', '.join(column_names)})
    VALUES ({', '.join(placeholders)})
    """

    with postgres_engine.connect() as conn:
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            conn.execute(text(insert_sql), batch)
            conn.commit()
            print(f"  Inserted batch {i // batch_size + 1}/{(len(rows) - 1) // batch_size + 1}")

    print(f"  Migrated {len(rows)} rows to {table_name}")


# =============================================================================
# Main
# =============================================================================

def main():
    args = parse_args()

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        print(f"Error: SQLite database not found at {sqlite_path}")
        sys.exit(1)

    print("=== LUQI AI Database Migration ===")
    print(f"Source: {sqlite_path}")
    print(f"Target: {args.postgres_url.replace('://', '://***:***@')}")
    print(f"Batch size: {args.batch_size}")
    if args.dry_run:
        print("Mode: DRY RUN (no changes will be made)")
    print("")

    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
    postgres_engine = create_engine(args.postgres_url)

    tables = get_sqlite_tables(sqlite_engine)
    print(f"Found {len(tables)} tables: {', '.join(tables)}")
    print("")

    for table in tables:
        migrate_table(sqlite_engine, postgres_engine, table, args.batch_size, args.dry_run)

    print("")
    print("=== Migration complete ===")


if __name__ == "__main__":
    main()
