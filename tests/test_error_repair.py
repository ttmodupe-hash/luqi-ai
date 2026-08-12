"""Tests for error repair."""

import pytest
from error_repair import ErrorRepair


def test_diagnose():
    repair = ErrorRepair()
    try:
        raise KeyError("test")
    except Exception as e:
        result = repair.diagnose(e)
        assert result["type"] == "KeyError"


def test_repair():
    repair = ErrorRepair()
    try:
        raise ConnectionError("test")
    except Exception as e:
        result = repair.repair(e)
        assert result["repair_attempted"] is True
