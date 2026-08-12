"""Tests for pedagogical engine."""

import pytest
from pedagogical_engine import PedagogicalEngine


def test_create_curriculum():
    engine = PedagogicalEngine()
    curriculum = engine.create_curriculum("Math", "Grade 10", ["Algebra", "Geometry"])
    assert curriculum["subject"] == "Math"


def test_generate_quiz():
    engine = PedagogicalEngine()
    quiz = engine.generate_quiz("Algebra", 3)
    assert len(quiz) == 3


def test_adaptive_path():
    engine = PedagogicalEngine()
    path = engine.adaptive_path("beginner", "Math")
    assert len(path) > 0
