"""
Tests for error_repair module.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from error_repair import ErrorRepair, RepairResult


class TestErrorRepair:
    """Test suite for ErrorRepair system."""

    def test_detect_syntax_error(self):
        """Test detection of syntax errors."""
        repair = ErrorRepair()
        code = "def foo():\n    print('missing closing"
        result = repair.analyze_code(code)
        assert result.has_errors or result.has_warnings

    def test_detect_undefined_variable(self):
        """Test detection of undefined variables."""
        repair = ErrorRepair()
        code = "print(undefined_variable)"
        result = repair.analyze_code(code)
        assert result.has_errors or len(result.issues) > 0

    def test_suggest_fix_for_simple_error(self):
        """Test suggesting fixes for simple errors."""
        repair = ErrorRepair()
        code = "for i in range(10)\n    print(i)"
        result = repair.analyze_code(code)
        if result.has_errors:
            fix = repair.suggest_fix(result)
            assert fix is not None
            assert ":" in fix or "fixed" in fix.lower()

    def test_empty_code(self):
        """Test handling of empty code."""
        repair = ErrorRepair()
        result = repair.analyze_code("")
        assert not result.has_errors

    def test_valid_code(self):
        """Test that valid code passes without errors."""
        repair = ErrorRepair()
        code = """
def hello():
    print("Hello, World!")

if __name__ == "__main__":
    hello()
"""
        result = repair.analyze_code(code)
        assert not result.has_errors

    def test_repair_result_structure(self):
        """Test RepairResult dataclass structure."""
        result = RepairResult(
            has_errors=True,
            has_warnings=False,
            issues=[{"line": 1, "message": "Test error"}],
            suggestions=["Fix the error"],
            fixed_code="# fixed"
        )
        assert result.has_errors is True
        assert len(result.issues) == 1

    def test_import_error_detection(self):
        """Test detection of import errors."""
        repair = ErrorRepair()
        code = "import nonexistent_module_xyz"
        result = repair.analyze_code(code)
        assert result.has_errors or len(result.issues) > 0

    def test_indentation_error(self):
        """Test detection of indentation errors."""
        repair = ErrorRepair()
        code = "def test():\nprint('no indent')"
        result = repair.analyze_code(code)
        assert result.has_errors