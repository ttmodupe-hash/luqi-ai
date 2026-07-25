"""
Tests for memory_manager module.
"""

import pytest
import os
import json
import tempfile
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from memory_manager import MemoryManager


class TestMemoryManager:
    """Test suite for MemoryManager."""

    @pytest.fixture
    def mm(self, tmp_path):
        """Create a MemoryManager with a temporary file."""
        mem_file = str(tmp_path / "test_memory.json")
        manager = MemoryManager(memory_file=mem_file)
        yield manager
        if os.path.exists(mem_file):
            os.remove(mem_file)

    def test_store_and_retrieve(self, mm):
        """Test basic store and retrieve."""
        mm.store("name", "John")
        assert mm.retrieve("name") == "John"

    def test_retrieve_missing(self, mm):
        """Test retrieving non-existent key."""
        assert mm.retrieve("nonexistent") is None

    def test_update_existing(self, mm):
        """Test updating existing key."""
        mm.store("counter", 1)
        mm.store("counter", 2)
        assert mm.retrieve("counter") == 2

    def test_delete(self, mm):
        """Test deleting a key."""
        mm.store("temp", "value")
        assert mm.retrieve("temp") == "value"
        mm.delete("temp")
        assert mm.retrieve("temp") is None

    def test_search(self, mm):
        """Test searching memory."""
        mm.store("user_pref_theme", "dark")
        mm.store("user_pref_lang", "en")
        mm.store("other_key", "value")
        
        results = mm.search("pref")
        assert len(results) == 2

    def test_persistence(self, tmp_path):
        """Test that data persists across instances."""
        mem_file = str(tmp_path / "persist_test.json")
        
        mm1 = MemoryManager(memory_file=mem_file)
        mm1.store("persisted", "data")
        del mm1
        
        mm2 = MemoryManager(memory_file=mem_file)
        assert mm2.retrieve("persisted") == "data"
        
        os.remove(mem_file)

    def test_list_keys(self, mm):
        """Test listing all keys."""
        mm.store("a", 1)
        mm.store("b", 2)
        mm.store("c", 3)
        
        keys = mm.list_keys()
        assert set(keys) == {"a", "b", "c"}

    def test_bulk_store(self, mm):
        """Test bulk store operation."""
        data = {"k1": "v1", "k2": "v2", "k3": "v3"}
        mm.bulk_store(data)
        
        assert mm.retrieve("k1") == "v1"
        assert mm.retrieve("k2") == "v2"
        assert mm.retrieve("k3") == "v3"

    def test_memory_stats(self, mm):
        """Test memory statistics."""
        mm.store("s1", "v1")
        mm.store("s2", "v2")
        stats = mm.get_stats()
        assert stats["total_keys"] == 2

    def test_complex_values(self, mm):
        """Test storing complex data types."""
        data = {"nested": {"key": "value"}, "list": [1, 2, 3]}
        mm.store("complex", data)
        retrieved = mm.retrieve("complex")
        assert retrieved == data