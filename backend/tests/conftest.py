"""Shared fixtures for LUQI AI backend tests."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Return a TestClient instance for the LUQI AI FastAPI app."""
    import sys
    from pathlib import Path

    project_root = Path(__file__).parent.parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from main import app

    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Return headers with a test API key."""
    return {"x-api-key": "test-key"}


@pytest.fixture
def mock_available_languages(monkeypatch):
    """Patch omega_capabilities to simulate African languages module available."""
    import backend.omega_capabilities as _oc

    monkeypatch.setattr(_oc, "AFRICAN_LANGUAGES_AVAILABLE", True)
    monkeypatch.setattr(
        _oc,
        "safe_list_languages",
        lambda: {
            "status": "success",
            "count": 59,
            "languages": [
                {"code": "swahili", "name": "Swahili", "family": "Bantu"},
                {"code": "yoruba", "name": "Yoruba", "family": "Niger-Congo"},
                {"code": "zulu", "name": "Zulu", "family": "Bantu"},
            ],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_get_language_info",
        lambda language: {
            "status": "success",
            "language": language,
            "family": "Bantu",
            "speakers": "200M+",
            "regions": ["East Africa"],
            "scripts": ["Latin"],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_get_greeting",
        lambda language: {
            "status": "success",
            "language": language,
            "greeting": "Habari!",
            "pronunciation": "ha-BA-ri",
            "context": "General greeting used throughout the day.",
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_translate",
        lambda phrase, language: {
            "status": "success",
            "original": phrase,
            "translation": f"Translated '{phrase}' to {language}",
            "transliteration": "test-transliteration",
        },
    )

    # Patch the inline helper in omega_routes
    import backend.omega_routes as _routes

    def mock_cultural_note(language):
        return {
            "status": "success",
            "language": language,
            "note": "Cultural communication etiquette.",
            "customs": ["Greet elders first", "Use right hand"],
        }

    monkeypatch.setattr(_routes, "safe_get_cultural_note", mock_cultural_note)


@pytest.fixture
def mock_available_finance(monkeypatch):
    """Patch omega_capabilities to simulate financial literacy module available."""
    import backend.omega_capabilities as _oc
    import backend.omega_routes as _routes

    monkeypatch.setattr(_oc, "FINANCIAL_AVAILABLE", True)
    monkeypatch.setattr(
        _oc,
        "safe_get_financial_concept",
        lambda concept: {
            "status": "success",
            "concept": concept,
            "explanation": f"Explanation of {concept}",
            "examples": ["Example 1", "Example 2"],
            "relevance": "High",
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_investment_guide",
        lambda topic: {
            "status": "success",
            "topic": topic,
            "risk_level": "Medium",
            "strategies": ["Strategy 1", "Strategy 2"],
            "tips": ["Tip 1", "Tip 2"],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_explain_tax",
        lambda country, income: {
            "status": "success",
            "country": country,
            "income": income,
            "tax_breakdown": {"gross_tax": income * 0.25, "effective_rate": "25%"},
        },
    )
    # calculate_budget may not exist on the module when FINANCIAL_AVAILABLE is False
    monkeypatch.setattr(_oc, "calculate_budget", lambda income, expenses: {
        "status": "success",
        "income": income,
        "total_expenses": sum(expenses.values()),
        "savings_rate": 0.2,
        "recommendations": ["Track spending"],
        "alerts": [],
    }, raising=False)


@pytest.fixture
def mock_available_tax(monkeypatch):
    """Patch omega_capabilities to simulate tax engine module available."""
    import backend.omega_capabilities as _oc

    monkeypatch.setattr(_oc, "TAX_AVAILABLE", True)
    monkeypatch.setattr(
        _oc,
        "safe_calculate_tax",
        lambda country, income: {
            "status": "success",
            "country": country,
            "income": income,
            "gross_tax": income * 0.3,
            "effective_rate": 0.3,
            "net_income": income * 0.7,
            "brackets": [{"rate": 0.2, "threshold": 0}, {"rate": 0.3, "threshold": 500000}],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_get_tax_brackets",
        lambda country: {
            "status": "success",
            "country": country,
            "brackets": [
                {"rate": 0.0, "min": 0, "max": 10000},
                {"rate": 0.2, "min": 10001, "max": 500000},
                {"rate": 0.35, "min": 500001, "max": None},
            ],
        },
    )


@pytest.fixture
def mock_available_education(monkeypatch):
    """Patch omega_capabilities to simulate educational companion module available."""
    import backend.omega_capabilities as _oc

    monkeypatch.setattr(_oc, "EDUCATIONAL_AVAILABLE", True)
    monkeypatch.setattr(
        _oc,
        "safe_create_study_plan",
        lambda subject, level: {
            "status": "success",
            "subject": subject,
            "level": level,
            "topics": ["Topic 1", "Topic 2", "Topic 3"],
            "schedule": "Weekly schedule",
            "resources": ["Resource 1", "Resource 2"],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_get_practice_questions",
        lambda subject, level: {
            "status": "success",
            "subject": subject,
            "level": level,
            "questions": [
                {
                    "question": "What is 2+2?",
                    "answer": "4",
                    "explanation": "Basic addition.",
                }
            ],
        },
    )
    monkeypatch.setattr(
        _oc,
        "get_subject_help",
        lambda subject, topic: {
            "status": "success",
            "subject": subject,
            "topic": topic,
            "explanation": f"Explanation of {topic} in {subject}",
            "examples": ["Example 1"],
            "resources": ["Resource 1"],
        },
        raising=False,
    )


@pytest.fixture
def mock_available_vocational(monkeypatch):
    """Patch omega_capabilities to simulate vocational companion module available."""
    import backend.omega_capabilities as _oc

    monkeypatch.setattr(_oc, "VOCATIONAL_AVAILABLE", True)
    monkeypatch.setattr(
        _oc,
        "safe_list_vocational_trades",
        lambda: {
            "status": "success",
            "trades": [
                {"name": "carpentry", "description": "Woodworking trade"},
                {"name": "electrician", "description": "Electrical work"},
                {"name": "plumbing", "description": "Plumbing systems"},
            ],
        },
    )
    monkeypatch.setattr(
        _oc,
        "safe_get_vocational_guide",
        lambda trade: {
            "status": "success",
            "trade": trade,
            "training_requirements": ["Apprenticeship", "Certification"],
            "certification_paths": ["Level 1", "Level 2"],
            "salary_expectations": "$30k - $60k",
            "market_demand": "High",
        },
    )


@pytest.fixture
def mock_available_blockchain(monkeypatch):
    """Patch omega_capabilities to simulate blockchain audit module available."""
    import backend.omega_capabilities as _oc
    import backend.omega_routes as _routes

    monkeypatch.setattr(_oc, "BLOCKCHAIN_AVAILABLE", True)

    class MockAuditLog:
        def append(self, action, actor, data):
            return {
                "status": "success",
                "hash": "abc123hash",
                "action": action,
                "actor": actor,
                "timestamp": "2024-01-01T00:00:00Z",
            }

        def verify(self):
            return {
                "status": "success",
                "chain_valid": True,
                "entries_count": 42,
                "last_hash": "def456hash",
            }

    monkeypatch.setattr(_oc, "BlockchainAuditLog", MockAuditLog, raising=False)
    monkeypatch.setattr(
        _oc,
        "safe_blockchain_audit",
        lambda action, actor, data: {
            "status": "success",
            "hash": "abc123hash",
            "action": action,
            "actor": actor,
            "timestamp": "2024-01-01T00:00:00Z",
        },
        raising=False,
    )
    # Also patch the verify_chain helper directly in omega_routes
    def mock_verify_chain():
        return {
            "status": "success",
            "chain_valid": True,
            "entries_count": 42,
            "last_hash": "def456hash",
        }
    monkeypatch.setattr(_routes, "verify_chain", mock_verify_chain)


@pytest.fixture
def mock_available_backup(monkeypatch):
    """Patch omega_capabilities to simulate auto-backup module available."""
    import backend.omega_capabilities as _oc

    monkeypatch.setattr(_oc, "BACKUP_AVAILABLE", True)

    class MockAutoBackup:
        def __init__(self, backup_dir=None):
            self.backup_dir = backup_dir or "/tmp/backups"

        def run(self):
            return {
                "status": "success",
                "path": self.backup_dir,
                "size_bytes": 1024000,
                "timestamp": "2024-01-01T00:00:00Z",
                "files_backed_up": 150,
            }

    monkeypatch.setattr(_oc, "AutoBackup", MockAutoBackup, raising=False)
    monkeypatch.setattr(
        _oc,
        "safe_backup",
        lambda backup_dir=None: {
            "status": "success",
            "path": backup_dir or "/tmp/backups",
            "size_bytes": 1024000,
            "timestamp": "2024-01-01T00:00:00Z",
            "files_backed_up": 150,
        },
        raising=False,
    )


@pytest.fixture
def mock_available_cache(monkeypatch):
    """Patch omega_capabilities to simulate cache manager module available."""
    import backend.omega_capabilities as _oc
    import backend.omega_routes as _routes

    monkeypatch.setattr(_oc, "CACHE_AVAILABLE", True)

    class MockCache:
        def stats(self):
            return {
                "status": "success",
                "hits": 1000,
                "misses": 50,
                "hit_ratio": 0.95,
                "entries": 200,
                "memory_mb": 12.5,
            }

    monkeypatch.setattr(_oc, "get_cache", lambda: MockCache(), raising=False)
    # Also patch the cache_stats helper directly in omega_routes
    def mock_cache_stats():
        return {
            "status": "success",
            "hits": 1000,
            "misses": 50,
            "hit_ratio": 0.95,
            "entries": 200,
            "memory_mb": 12.5,
        }
    monkeypatch.setattr(_routes, "cache_stats", mock_cache_stats)
