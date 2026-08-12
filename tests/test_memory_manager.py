"""Tests for memory manager."""

import pytest
from memory_manager import MemoryManager


def test_add_turn():
    mm = MemoryManager()
    mm.add_turn("sess1", "user", "Hello")
    context = mm.get_context("sess1")
    assert len(context) == 1
    assert context[0]["role"] == "user"


def test_context_var():
    mm = MemoryManager()
    mm.set_context_var("sess1", "key", "value")
    assert mm.get_context_var("sess1", "key") == "value"


def test_clear_session():
    mm = MemoryManager()
    mm.add_turn("sess1", "user", "Hello")
    mm.clear_session("sess1")
    assert len(mm.get_context("sess1")) == 0
