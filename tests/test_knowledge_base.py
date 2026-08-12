"""Tests for knowledge base."""

import pytest
from knowledge_base import KnowledgeBase


def test_add_article():
    kb = KnowledgeBase()
    article = kb.add_article("Test", "Test content", ["test"])
    assert article["topic"] == "Test"


def test_get_article():
    kb = KnowledgeBase()
    kb.add_article("Test", "Test content")
    result = kb.get_article("Test")
    assert result["topic"] == "Test"


def test_search():
    kb = KnowledgeBase()
    kb.add_article("Python", "Python programming")
    results = kb.search("Python")
    assert len(results) > 0
