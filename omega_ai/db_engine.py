Omega AI - SQLite Database Engine

A thread-safe SQLite backend that replaces JSON file storage
with proper relational storage, indexing, and query capabilities.
"""

import sqlite3
import json
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import contextmanager
from typing import Dict, List, Optional, Any, Tuple, Union
import logging

logger = logging.getLogger(__name__)


class DatabaseEngine:
    """Thread-safe SQLite database engine with connection pooling."""
    
    def __init__(self, db_path: str = "omega_ai.db"):
        self.db_path = db_path
        self._local = threading.local()
        self._lock = threading.RLock()
        self._ensure_tables()
    
    @contextmanager
    def _get_connection(self):
        """Get thread-local database connection."""
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA foreign_keys = ON")
            self._local.conn.execute("PRAGMA journal_mode = WAL")
        try:
            yield self._local.conn
        except Exception:
            self._local.conn.rollback()
            raise
    
    def _ensure_tables(self):
        """Create all required tables if they don't exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Conversations table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT DEFAULT 'New Conversation',
                    model TEXT DEFAULT 'default',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT DEFAULT '{}'
                )
            ''')
            
            # Messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                    content TEXT NOT NULL,
                    model TEXT,
                    tokens_used INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                )
            ''')
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    settings TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Knowledge base entries
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_entries (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}'
                )
            ''')
            
            # Financial records
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS financial_records (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    record_type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    description TEXT,
                    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT DEFAULT '{}'
                )
            ''')
            
            # Cache table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_messages_conversation 
                ON messages(conversation_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_knowledge_category 
                ON knowledge_entries(category)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_financial_user 
                ON financial_records(user_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_cache_expires 
                ON cache(expires_at)
            ''')
            
            conn.commit()
    
    # Conversation operations
    def create_conversation(self, user_id: str, title: str = "New Conversation", 
                          model: str = "default", metadata: Dict = None) -> str:
        """Create a new conversation."""
        conv_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO conversations (id, user_id, title, model, metadata)
                VALUES (?, ?, ?, ?, ?)
            ''', (conv_id, user_id, title, model, json.dumps(metadata or {})))
            conn.commit()
        return conv_id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """Get conversation by ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM conversations WHERE id = ?
            ''', (conversation_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def list_conversations(self, user_id: str, limit: int = 50, 
                          offset: int = 0) -> List[Dict]:
        """List conversations for a user."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM conversations 
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
            ''', (user_id, limit, offset))
            return [dict(row) for row in cursor.fetchall()]
    
    def update_conversation(self, conversation_id: str, 
                          updates: Dict[str, Any]) -> bool:
        """Update conversation fields."""
        allowed_fields = ['title', 'model', 'metadata']
        set_clause = []
        values = []
        
        for field, value in updates.items():
            if field in allowed_fields:
                set_clause.append(f"{field} = ?")
                if field == 'metadata':
                    values.append(json.dumps(value))
                else:
                    values.append(value)
        
        if not set_clause:
            return False
        
        set_clause.append("updated_at = CURRENT_TIMESTAMP")
        values.append(conversation_id)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'''
                UPDATE conversations 
                SET {', '.join(set_clause)}
                WHERE id = ?
            ''', values)
            conn.commit()
            return cursor.rowcount > 0
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation and all its messages."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    # Message operations
    def add_message(self, conversation_id: str, role: str, content: str,
                   model: str = None, tokens_used: int = 0,
                   metadata: Dict = None) -> str:
        """Add a message to a conversation."""
        msg_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO messages (id, conversation_id, role, content, model, tokens_used, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (msg_id, conversation_id, role, content, model, tokens_used,
                  json.dumps(metadata or {})))
            
            # Update conversation timestamp
            cursor.execute('''
                UPDATE conversations 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (conversation_id,))
            
            conn.commit()
        return msg_id
    
    def get_messages(self, conversation_id: str, limit: int = 100,
                    offset: int = 0) -> List[Dict]:
        """Get messages for a conversation."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM messages 
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT ? OFFSET ?
            ''', (conversation_id, limit, offset))
            return [dict(row) for row in cursor.fetchall()]
    
    def search_messages(self, conversation_id: str, query: str) -> List[Dict]:
        """Search messages within a conversation."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM messages 
                WHERE conversation_id = ? AND content LIKE ?
                ORDER BY created_at ASC
            ''', (conversation_id, f'%{query}%'))
            return [dict(row) for row in cursor.fetchall()]
    
    def delete_message(self, message_id: str) -> bool:
        """Delete a message."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM messages WHERE id = ?', (message_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    # User operations
    def create_user(self, username: str, email: str = None,
                   password_hash: str = None, settings: Dict = None) -> str:
        """Create a new user."""
        user_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (id, username, email, password_hash, settings)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, username, email, password_hash,
                  json.dumps(settings or {})))
            conn.commit()
        return user_id
    
    def get_user(self, user_id: str = None, username: str = None) -> Optional[Dict]:
        """Get user by ID or username."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            elif username:
                cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            else:
                return None
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update user fields."""
        allowed_fields = ['username', 'email', 'password_hash', 'settings']
        set_clause = []
        values = []
        
        for field, value in updates.items():
            if field in allowed_fields:
                set_clause.append(f"{field} = ?")
                if field == 'settings':
                    values.append(json.dumps(value))
                else:
                    values.append(value)
        
        if not set_clause:
            return False
        
        values.append(user_id)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'''
                UPDATE users SET {', '.join(set_clause)}
                WHERE id = ?
            ''', values)
            conn.commit()
            return cursor.rowcount > 0
    
    # Knowledge base operations
    def add_knowledge(self, category: str, title: str, content: str,
                     source: str = None, confidence: float = 1.0,
                     metadata: Dict = None) -> str:
        """Add a knowledge base entry."""
        entry_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO knowledge_entries 
                (id, category, title, content, source, confidence, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (entry_id, category, title, content, source, confidence,
                  json.dumps(metadata or {})))
            conn.commit()
        return entry_id
    
    def get_knowledge(self, category: str = None, query: str = None,
                     limit: int = 50) -> List[Dict]:
        """Search knowledge base."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if category and query:
                cursor.execute('''
                    SELECT * FROM knowledge_entries 
                    WHERE category = ? AND (title LIKE ? OR content LIKE ?)
                    ORDER BY confidence DESC, access_count DESC
                    LIMIT ?
                ''', (category, f'%{query}%', f'%{query}%', limit))
            elif category:
                cursor.execute('''
                    SELECT * FROM knowledge_entries 
                    WHERE category = ?
                    ORDER BY confidence DESC, access_count DESC
                    LIMIT ?
                ''', (category, limit))
            elif query:
                cursor.execute('''
                    SELECT * FROM knowledge_entries 
                    WHERE title LIKE ? OR content LIKE ?
                    ORDER BY confidence DESC, access_count DESC
                    LIMIT ?
                ''', (f'%{query}%', f'%{query}%', limit))
            else:
                cursor.execute('''
                    SELECT * FROM knowledge_entries 
                    ORDER BY updated_at DESC
                    LIMIT ?
                ''', (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def update_knowledge_access(self, entry_id: str) -> None:
        """Increment access count for a knowledge entry."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE knowledge_entries 
                SET access_count = access_count + 1
                WHERE id = ?
            ''', (entry_id,))
            conn.commit()
    
    # Financial operations
    def add_financial_record(self, user_id: str, record_type: str,
                            category: str, amount: float, currency: str = 'USD',
                            description: str = None, metadata: Dict = None) -> str:
        """Add a financial record."""
        record_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO financial_records 
                (id, user_id, record_type, category, amount, currency, description, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (record_id, user_id, record_type, category, amount, currency,
                  description, json.dumps(metadata or {})))
            conn.commit()
        return record_id
    
    def get_financial_records(self, user_id: str, 
                             record_type: str = None,
                             start_date: str = None,
                             end_date: str = None) -> List[Dict]:
        """Get financial records for a user."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = 'SELECT * FROM financial_records WHERE user_id = ?'
            params = [user_id]
            
            if record_type:
                query += ' AND record_type = ?'
                params.append(record_type)
            if start_date:
                query += ' AND record_date >= ?'
                params.append(start_date)
            if end_date:
                query += ' AND record_date <= ?'
                params.append(end_date)
            
            query += ' ORDER BY record_date DESC'
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_financial_summary(self, user_id: str, 
                             record_type: str = None) -> Dict:
        """Get financial summary for a user."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = '''
                SELECT 
                    COUNT(*) as count,
                    SUM(amount) as total,
                    AVG(amount) as average,
                    category
                FROM financial_records 
                WHERE user_id = ?
            '''
            params = [user_id]
            
            if record_type:
                query += ' AND record_type = ?'
                params.append(record_type)
            
            query += ' GROUP BY category ORDER BY total DESC'
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    # Cache operations
    def cache_set(self, key: str, value: Any, ttl_seconds: int = None) -> None:
        """Set a cached value with optional TTL."""
        expires_at = None
        if ttl_seconds:
            expires_at = (datetime.now() + timedelta(seconds=ttl_seconds)).isoformat()
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO cache (key, value, expires_at)
                VALUES (?, ?, ?)
            ''', (key, json.dumps(value), expires_at))
            conn.commit()
    
    def cache_get(self, key: str) -> Optional[Any]:
        """Get a cached value if not expired."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT value, expires_at FROM cache WHERE key = ?
            ''', (key,))
            row = cursor.fetchone()
            
            if row:
                expires_at = row['expires_at']
                if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
                    cursor.execute('DELETE FROM cache WHERE key = ?', (key,))
                    conn.commit()
                    return None
                return json.loads(row['value'])
            return None
    
    def cache_delete(self, key: str) -> None:
        """Delete a cached value."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM cache WHERE key = ?', (key,))
            conn.commit()
    
    def cache_clear_expired(self) -> int:
        """Clear all expired cache entries."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM cache 
                WHERE expires_at IS NOT NULL 
                AND expires_at < ?
            ''', (datetime.now().isoformat(),))
            conn.commit()
            return cursor.rowcount
    
    # Maintenance
    def vacuum(self) -> None:
        """Optimize database."""
        with self._get_connection() as conn:
            conn.execute('VACUUM')
    
    def get_stats(self) -> Dict:
        """Get database statistics."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            stats = {}
            
            for table in ['conversations', 'messages', 'users', 
                         'knowledge_entries', 'financial_records', 'cache']:
                cursor.execute(f'SELECT COUNT(*) FROM {table}')
                stats[table] = cursor.fetchone()[0]
            
            # Database file size
            db_size = Path(self.db_path).stat().st_size if Path(self.db_path).exists() else 0
            stats['db_size_bytes'] = db_size
            
            return stats
    
    def export_to_json(self, output_path: str) -> None:
        """Export entire database to JSON."""
        export = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            for table in ['conversations', 'messages', 'users',
                         'knowledge_entries', 'financial_records']:
                cursor.execute(f'SELECT * FROM {table}')
                rows = cursor.fetchall()
                export[table] = [dict(row) for row in rows]
        
        with open(output_path, 'w') as f:
            json.dump(export, f, indent=2, default=str)
    
    def close(self):
        """Close database connections."""
        if hasattr(self._local, 'conn') and self._local.conn:
            self._local.conn.close()
            self._local.conn = None


# Singleton instance
db = DatabaseEngine()


def get_db() -> DatabaseEngine:
    """Get the singleton database engine instance."""
    return db