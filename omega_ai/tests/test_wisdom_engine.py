"""
Tests for wisdom_engine module.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from wisdom_engine import WisdomEngine


class TestWisdomEngine:
    """Test suite for WisdomEngine."""

    def test_get_proverb(self):
        """Test getting a proverb."""
        engine = WisdomEngine()
        proverb = engine.get_proverb()
        assert proverb is not None
        assert len(proverb) > 0

    def test_get_proverb_by_theme(self):
        """Test getting a proverb by theme."""
        engine = WisdomEngine()
        proverb = engine.get_proverb(theme="wisdom")
        assert proverb is not None

    def test_get_proverb_by_origin(self):
        """Test getting a proverb by origin."""
        engine = WisdomEngine()
        proverb = engine.get_proverb(origin="yoruba")
        assert proverb is not None

    def test_get_random_proverb(self):
        """Test getting random proverb."""
        engine = WisdomEngine()
        p1 = engine.get_random_proverb()
        p2 = engine.get_random_proverb()
        assert p1 is not None
        assert p2 is not None

    def test_search_proverbs(self):
        """Test searching proverbs."""
        engine = WisdomEngine()
        results = engine.search("water")
        assert isinstance(results, list)

    def test_get_daily_proverb(self):
        """Test daily proverb functionality."""
        engine = WisdomEngine()
        proverb = engine.get_daily_proverb()
        assert proverb is not None
        assert len(proverb) > 0

    def test_proverb_structure(self):
        """Test that proverbs have proper structure."""
        engine = WisdomEngine()
        proverb = engine.get_proverb()
        # Proverb should be a string or dict with content
        assert isinstance(proverb, (str, dict))
        if isinstance(proverb, dict):
            assert "text" in proverb or "proverb" in proverb or "content" in proverb

    def test_multiple_themes(self):
        """Test proverbs across different themes."""
        engine = WisdomEngine()
        themes = ["wisdom", "patience", "community", "hard_work"]
        
        for theme in themes:
            proverb = engine.get_proverb(theme=theme)
            assert proverb is not None, f"No proverb found for theme: {theme}"

    def test_explain_proverb(self):
        """Test proverb explanation."""
        engine = WisdomEngine()
        explanation = engine.explain_proverb("A bird in hand is worth two in the bush")
        assert explanation is not None
        assert len(explanation) > 0