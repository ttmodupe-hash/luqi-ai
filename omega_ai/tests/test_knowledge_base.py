"""
Tests for knowledge_base module.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from knowledge_base import KnowledgeBase


class TestKnowledgeBase:
    """Test suite for KnowledgeBase."""

    def test_add_entry(self):
        """Test adding a knowledge entry."""
        kb = KnowledgeBase()
        entry_id = kb.add_entry("test", "Test Title", "Test content")
        assert entry_id is not None

    def test_search(self):
        """Test searching knowledge base."""
        kb = KnowledgeBase()
        kb.add_entry("finance", "Stocks", "Stocks are ownership shares")
        kb.add_entry("finance", "Bonds", "Bonds are debt instruments")
        
        results = kb.search("stocks")
        assert len(results) >= 1
        assert any("stock" in r["title"].lower() for r in results)

    def test_search_no_results(self):
        """Test search with no matching results."""
        kb = KnowledgeBase()
        results = kb.search("xyznonexistent")
        assert len(results) == 0

    def test_get_by_category(self):
        """Test getting entries by category."""
        kb = KnowledgeBase()
        kb.add_entry("crypto", "Bitcoin", "Digital currency")
        kb.add_entry("crypto", "Ethereum", "Smart contract platform")
        kb.add_entry("stocks", "Apple", "Tech company")
        
        crypto = kb.get_by_category("crypto")
        assert len(crypto) == 2
        assert all(e["category"] == "crypto" for e in crypto)

    def test_update_entry(self):
        """Test updating an entry."""
        kb = KnowledgeBase()
        entry_id = kb.add_entry("test", "Old Title", "Old content")
        kb.update_entry(entry_id, title="New Title", content="New content")
        
        results = kb.search("New Title")
        assert len(results) >= 1

    def test_delete_entry(self):
        """Test deleting an entry."""
        kb = KnowledgeBase()
        entry_id = kb.add_entry("temp", "To Delete", "Content")
        kb.delete_entry(entry_id)
        
        results = kb.search("To Delete")
        assert len(results) == 0