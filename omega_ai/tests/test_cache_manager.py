"""
Tests for cache_manager module.
"""

import pytest
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from cache_manager import CacheManager


class TestCacheManager:
    """Test suite for CacheManager."""

    def test_basic_set_get(self):
        """Test basic set and get operations."""
        cache = CacheManager(max_size=10)
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_get_missing_key(self):
        """Test getting a key that doesn't exist."""
        cache = CacheManager()
        assert cache.get("missing") is None

    def test_ttl_expiration(self):
        """Test that TTL expiration works."""
        cache = CacheManager()
        cache.set("temp", "data", ttl_seconds=0.1)
        assert cache.get("temp") == "data"
        time.sleep(0.2)
        assert cache.get("temp") is None

    def test_lru_eviction(self):
        """Test LRU eviction when max_size is reached."""
        cache = CacheManager(max_size=2)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        assert cache.get("a") is None  # 'a' should be evicted
        assert cache.get("b") == 2
        assert cache.get("c") == 3

    def test_delete(self):
        """Test delete operation."""
        cache = CacheManager()
        cache.set("del_me", "value")
        assert cache.get("del_me") == "value"
        cache.delete("del_me")
        assert cache.get("del_me") is None

    def test_clear(self):
        """Test clear operation."""
        cache = CacheManager()
        cache.set("x", 1)
        cache.set("y", 2)
        cache.clear()
        assert cache.get("x") is None
        assert cache.get("y") is None

    def test_stats(self):
        """Test stats reporting."""
        cache = CacheManager()
        cache.set("s1", "v1")
        cache.set("s2", "v2")
        cache.get("s1")
        cache.get("s1")
        stats = cache.get_stats()
        assert stats["size"] == 2
        assert stats["hits"] == 2
        assert stats["misses"] == 0