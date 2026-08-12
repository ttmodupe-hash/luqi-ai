"""Tests for cache manager."""

import pytest
from cache_manager import CacheManager


def test_cache_set_get():
    cache = CacheManager()
    cache.set("key1", "value1")
    assert cache.get("key1") == "value1"


def test_cache_expiry():
    cache = CacheManager()
    cache.set("key2", "value2", ttl=0)
    assert cache.get("key2") is None


def test_cache_delete():
    cache = CacheManager()
    cache.set("key3", "value3")
    cache.delete("key3")
    assert cache.get("key3") is None
