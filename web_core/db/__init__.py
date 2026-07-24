"""
web_core.db - Persistent storage layer.
All SQLite access goes through here — no raw SQL outside this package.
"""

from web_core.db.connection import ConnectionPool
from web_core.db.conversations import ConversationStore
from web_core.db.documents import DocumentStore
from web_core.db.capabilities import CapabilityStore

__all__ = ["ConnectionPool", "ConversationStore", "DocumentStore", "CapabilityStore"]
