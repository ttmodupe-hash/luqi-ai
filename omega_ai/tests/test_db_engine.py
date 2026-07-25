"""
Tests for db_engine module.
"""

import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from db_engine import DatabaseEngine


class TestDatabaseEngine:
    """Test suite for DatabaseEngine."""

    @pytest.fixture
    def db(self, tmp_path):
        """Create a temporary database for testing."""
        db_path = str(tmp_path / "test.db")
        engine = DatabaseEngine(db_path=db_path)
        yield engine
        engine.close()
        if os.path.exists(db_path):
            os.remove(db_path)

    def test_create_conversation(self, db):
        """Test conversation creation."""
        conv_id = db.create_conversation(user_id="test_user", title="Test")
        assert conv_id is not None
        conv = db.get_conversation(conv_id)
        assert conv["title"] == "Test"
        assert conv["user_id"] == "test_user"

    def test_add_message(self, db):
        """Test adding messages."""
        conv_id = db.create_conversation(user_id="user1")
        msg_id = db.add_message(conv_id, "user", "Hello")
        assert msg_id is not None
        messages = db.get_messages(conv_id)
        assert len(messages) == 1
        assert messages[0]["content"] == "Hello"

    def test_create_user(self, db):
        """Test user creation."""
        user_id = db.create_user(username="testuser", email="test@example.com")
        assert user_id is not None
        user = db.get_user(user_id=user_id)
        assert user["username"] == "testuser"

    def test_user_lookup_by_username(self, db):
        """Test looking up user by username."""
        db.create_user(username="lookup_user", email="look@example.com")
        user = db.get_user(username="lookup_user")
        assert user is not None
        assert user["username"] == "lookup_user"

    def test_knowledge_crud(self, db):
        """Test knowledge base CRUD operations."""
        entry_id = db.add_knowledge(
            category="test",
            title="Test Entry",
            content="Test content",
            confidence=0.95
        )
        assert entry_id is not None
        
        results = db.get_knowledge(category="test")
        assert len(results) == 1
        assert results[0]["title"] == "Test Entry"

    def test_cache_operations(self, db):
        """Test cache set/get/delete."""
        db.cache_set("key1", {"data": "value1"})
        result = db.cache_get("key1")
        assert result == {"data": "value1"}
        
        db.cache_delete("key1")
        assert db.cache_get("key1") is None

    def test_cache_ttl(self, db):
        """Test cache TTL expiration."""
        db.cache_set("temp", "value", ttl_seconds=0.01)
        assert db.cache_get("temp") == "value"
        import time
        time.sleep(0.02)
        assert db.cache_get("temp") is None

    def test_financial_records(self, db):
        """Test financial record operations."""
        record_id = db.add_financial_record(
            user_id="user1",
            record_type="expense",
            category="food",
            amount=25.50,
            description="Lunch"
        )
        assert record_id is not None
        
        records = db.get_financial_records(user_id="user1")
        assert len(records) == 1
        assert records[0]["amount"] == 25.50

    def test_list_conversations(self, db):
        """Test listing conversations."""
        db.create_conversation(user_id="u1", title="Conv 1")
        db.create_conversation(user_id="u1", title="Conv 2")
        db.create_conversation(user_id="u2", title="Conv 3")
        
        convs = db.list_conversations(user_id="u1")
        assert len(convs) == 2

    def test_search_messages(self, db):
        """Test message search."""
        conv_id = db.create_conversation(user_id="user1")
        db.add_message(conv_id, "user", "Hello world")
        db.add_message(conv_id, "user", "Goodbye world")
        
        results = db.search_messages(conv_id, "Hello")
        assert len(results) == 1
        assert "Hello" in results[0]["content"]