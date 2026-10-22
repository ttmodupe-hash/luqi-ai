"""Basic v27 endpoint and legacy-module structural checks.

These tests check source validity only. Integration tests requiring a configured
database, billing provider and model credentials run in a separate environment.
"""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_fastapi_main_is_valid_python():
    ast.parse((ROOT / "main.py").read_text(encoding="utf-8"))


def test_health_endpoint_is_registered():
    source = (ROOT / "main.py").read_text(encoding="utf-8")
    assert '"/health"' in source or '"/v1/health"' in source


def test_omega_modules_have_no_broken_legacy_placeholders():
    for path in (ROOT / "omega_ai").glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert not source.lstrip().startswith("PASTE"), path.name
        ast.parse(source, filename=str(path))
