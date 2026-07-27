"""Unified SQLite database layer for LUQI AI

Replaces JSON file storage with proper relational SQLite database.
All modules can import and use this for persistence.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from threading import Lock


class DatabaseLayer:
    """Central SQLite database for all LUQI modules."""

    DB_PATH = Path("data/luqi.db")
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        """Initialize all tables."""
        self.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.DB_PATH))
        c = conn.cursor()

        # Users table
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            last_login TEXT
        )''')

        # Training progress
        c.execute('''CREATE TABLE IF NOT EXISTS training_progress (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            course_id TEXT,
            module_id TEXT,
            lesson_id TEXT,
            completed INTEGER DEFAULT 0,
            score INTEGER,
            completed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Support tickets
        c.execute('''CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY,
            ticket_id TEXT UNIQUE,
            subject TEXT,
            description TEXT,
            customer_id TEXT,
            category TEXT,
            priority TEXT,
            status TEXT DEFAULT 'open',
            assignee TEXT,
            tags TEXT,
            created_at TEXT,
            resolved_at TEXT,
            resolution TEXT
        )''')

        # Ticket responses
        c.execute('''CREATE TABLE IF NOT EXISTS ticket_responses (
            id INTEGER PRIMARY KEY,
            ticket_id TEXT,
            message TEXT,
            responder_id TEXT,
            is_internal INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
        )''')

        # Tasks
        c.execute('''CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            task_id TEXT UNIQUE,
            user_id INTEGER,
            title TEXT,
            description TEXT,
            priority TEXT,
            status TEXT DEFAULT 'pending',
            due_date TEXT,
            tags TEXT,
            recurring TEXT,
            created_at TEXT,
            completed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Reminders
        c.execute('''CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY,
            reminder_id TEXT UNIQUE,
            user_id INTEGER,
            title TEXT,
            description TEXT,
            remind_at TEXT,
            repeat TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Notes
        c.execute('''CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            note_id TEXT UNIQUE,
            user_id INTEGER,
            title TEXT,
            content TEXT,
            category TEXT,
            tags TEXT,
            word_count INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Events
        c.execute('''CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY,
            event_id TEXT UNIQUE,
            user_id INTEGER,
            title TEXT,
            start_time TEXT,
            end_time TEXT,
            description TEXT,
            location TEXT,
            attendees TEXT,
            reminder_minutes_before INTEGER DEFAULT 15,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Cybersecurity assessments
        c.execute('''CREATE TABLE IF NOT EXISTS security_assessments (
            id INTEGER PRIMARY KEY,
            assessment_id TEXT UNIQUE,
            user_id INTEGER,
            domain TEXT,
            assessment_type TEXT,
            score INTEGER,
            risk_level TEXT,
            findings TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')

        # Audit log (blockchain-style)
        c.execute('''CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY,
            block_index INTEGER UNIQUE,
            timestamp TEXT,
            action TEXT,
            actor TEXT,
            details TEXT,
            prev_hash TEXT,
            block_hash TEXT
        )''')

        # Application settings
        c.execute('''CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        )''')

        conn.commit()
        conn.close()

    def get_connection(self):
        """Get a database connection."""
        return sqlite3.connect(str(self.DB_PATH))

    def execute(self, query: str, params: tuple = ()):
        """Execute a query and commit."""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute(query, params)
        conn.commit()
        lastrowid = c.lastrowid
        conn.close()
        return lastrowid

    def fetchone(self, query: str, params: tuple = ()):
        """Fetch one row."""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute(query, params)
        row = c.fetchone()
        conn.close()
        return row

    def fetchall(self, query: str, params: tuple = ()):
        """Fetch all rows."""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        return rows

    def get_stats(self) -> dict:
        """Get database statistics."""
        conn = self.get_connection()
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in c.fetchall()]
        stats = {}
        for table in tables:
            c.execute(f"SELECT COUNT(*) FROM {table}")
            stats[table] = c.fetchone()[0]
        conn.close()
        return {"tables": len(tables), "row_counts": stats}


# Singleton instance
db = DatabaseLayer()
