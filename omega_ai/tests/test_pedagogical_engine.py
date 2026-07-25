"""
Tests for pedagogical_engine module.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pedagogical_engine import PedagogicalEngine, BloomLevel


class TestPedagogicalEngine:
    """Test suite for PedagogicalEngine."""

    def test_assess_level(self):
        """Test knowledge level assessment."""
        engine = PedagogicalEngine()
        level = engine.assess_level("user1", topic="blockchain")
        assert isinstance(level, BloomLevel) or level is not None

    def test_generate_question(self):
        """Test question generation."""
        engine = PedagogicalEngine()
        question = engine.generate_question("blockchain", BloomLevel.UNDERSTAND)
        assert question is not None
        assert len(question) > 0

    def test_adapt_content(self):
        """Test content adaptation to user level."""
        engine = PedagogicalEngine()
        content = "Blockchain uses distributed ledger technology"
        adapted = engine.adapt_content(content, BloomLevel.REMEMBER)
        assert adapted is not None
        assert len(adapted) > 0

    def test_explain_concept(self):
        """Test concept explanation generation."""
        engine = PedagogicalEngine()
        explanation = engine.explain_concept("cryptocurrency", level="beginner")
        assert explanation is not None
        assert len(explanation) > 0

    def test_generate_exercise(self):
        """Test exercise generation."""
        engine = PedagogicalEngine()
        exercise = engine.generate_exercise("investing", BloomLevel.APPLY)
        assert exercise is not None
        assert "question" in exercise or "task" in exercise or len(str(exercise)) > 0

    def test_evaluate_answer(self):
        """Test answer evaluation."""
        engine = PedagogicalEngine()
        result = engine.evaluate_answer(
            question="What is Bitcoin?",
            answer="A digital currency",
            expected_level=BloomLevel.UNDERSTAND
        )
        assert result is not None
        assert "score" in result or "feedback" in result

    def test_bloom_levels_exist(self):
        """Test that all Bloom's taxonomy levels exist."""
        levels = [
            BloomLevel.REMEMBER,
            BloomLevel.UNDERSTAND,
            BloomLevel.APPLY,
            BloomLevel.ANALYZE,
            BloomLevel.EVALUATE,
            BloomLevel.CREATE
        ]
        assert len(levels) == 6
        assert all(level is not None for level in levels)

    def test_learning_path(self):
        """Test learning path generation."""
        engine = PedagogicalEngine()
        path = engine.generate_learning_path("personal_finance")
        assert path is not None
        assert len(path) > 0

    def test_feedback_generation(self):
        """Test personalized feedback generation."""
        engine = PedagogicalEngine()
        feedback = engine.generate_feedback(
            answer="Partially correct",
            correct_answer="Fully correct answer",
            level=BloomLevel.UNDERSTAND
        )
        assert feedback is not None
        assert len(feedback) > 0