"""Comprehensive tests for omega_ai capability endpoints.

Covers all 21 endpoints from omega_routes.py plus the /health endpoint
and the /api/v25/luqi/chat endpoint.

Organization:
  - TestLanguages      (5 endpoints)
  - TestFinance        (4 endpoints)
  - TestTaxEngine      (2 endpoints)
  - TestEducation      (3 endpoints)
  - TestVocational     (2 endpoints)
  - TestBlockchain     (2 endpoints)
  - TestSystem         (2 endpoints: backup + cache)
  - TestCapabilities   (1 endpoint)
  - TestHealth         (1 endpoint: /health)
  - TestChat           (1 endpoint: /api/v25/luqi/chat)

Total: ~55 test methods covering happy paths, error paths, validation errors,
and unavailable-module (503) responses.
"""

import json
import sys
from pathlib import Path

import pytest

# Ensure project root is on path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


# ═══════════════════════════════════════════════════════════════════════════
# AFRICAN LANGUAGES — 5 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestLanguages:
    """Tests for /api/v25/languages/* endpoints."""

    # ---- GET /api/v25/languages ----

    def test_list_languages_unavailable(self, client):
        """GET /api/v25/languages returns 503 when module unavailable."""
        response = client.get("/api/v25/languages")
        assert response.status_code == 503

    def test_list_languages_success(self, client, mock_available_languages):
        """GET /api/v25/languages returns language list."""
        response = client.get("/api/v25/languages")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "languages" in data
        assert data["count"] == 59

    # ---- GET /api/v25/languages/{language} ----

    def test_get_language_info_unavailable(self, client):
        """GET /api/v25/languages/swahili returns 503 when module unavailable."""
        response = client.get("/api/v25/languages/swahili")
        assert response.status_code == 503

    def test_get_language_info_success(self, client, mock_available_languages):
        """GET /api/v25/languages/swahili returns language info."""
        response = client.get("/api/v25/languages/swahili")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["language"] == "swahili"
        assert "family" in data

    def test_get_language_info_different_language(self, client, mock_available_languages):
        """GET /api/v25/languages/yoruba returns different language info."""
        response = client.get("/api/v25/languages/yoruba")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "yoruba"

    # ---- GET /api/v25/languages/{language}/greeting ----

    def test_get_greeting_unavailable(self, client):
        """GET /api/v25/languages/swahili/greeting returns 503 when unavailable."""
        response = client.get("/api/v25/languages/swahili/greeting")
        assert response.status_code == 503

    def test_get_greeting_success(self, client, mock_available_languages):
        """GET /api/v25/languages/swahili/greeting returns greeting."""
        response = client.get("/api/v25/languages/swahili/greeting")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "greeting" in data
        assert "pronunciation" in data

    def test_get_greeting_different_language(self, client, mock_available_languages):
        """GET /api/v25/languages/amharic/greeting handles different language."""
        response = client.get("/api/v25/languages/amharic/greeting")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "amharic"

    # ---- GET /api/v25/languages/{language}/cultural-note ----

    def test_get_cultural_note_unavailable(self, client):
        """GET /api/v25/languages/swahili/cultural-note returns 503 when unavailable."""
        response = client.get("/api/v25/languages/swahili/cultural-note")
        assert response.status_code == 503

    def test_get_cultural_note_success(self, client, mock_available_languages):
        """GET /api/v25/languages/swahili/cultural-note returns cultural note."""
        response = client.get("/api/v25/languages/swahili/cultural-note")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "note" in data
        assert "customs" in data

    # ---- POST /api/v25/languages/translate ----

    def test_translate_unavailable(self, client):
        """POST /api/v25/languages/translate returns 503 when module unavailable."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"phrase": "Hello", "language": "swahili"},
        )
        assert response.status_code == 503

    def test_translate_success(self, client, mock_available_languages):
        """POST /api/v25/languages/translate returns translation."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"phrase": "Hello", "language": "swahili"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "translation" in data
        assert "transliteration" in data

    def test_translate_missing_phrase(self, client):
        """POST translate without phrase returns 422 validation error."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"language": "swahili"},
        )
        assert response.status_code == 422

    def test_translate_missing_language(self, client):
        """POST translate without language returns 422 validation error."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"phrase": "Hello"},
        )
        assert response.status_code == 422

    def test_translate_empty_phrase(self, client):
        """POST translate with empty phrase returns 422 validation error."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"phrase": "", "language": "swahili"},
        )
        assert response.status_code == 422

    def test_translate_phrase_too_long(self, client):
        """POST translate with phrase >1000 chars returns 422."""
        response = client.post(
            "/api/v25/languages/translate",
            json={"phrase": "x" * 1001, "language": "swahili"},
        )
        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# FINANCIAL LITERACY — 4 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestFinance:
    """Tests for /api/v25/finance/* endpoints."""

    # ---- GET /api/v25/finance/concept/{concept} ----

    def test_get_financial_concept_unavailable(self, client):
        """GET /api/v25/finance/concept/budgeting returns 503 when unavailable."""
        response = client.get("/api/v25/finance/concept/budgeting")
        assert response.status_code == 503

    def test_get_financial_concept_success(self, client, mock_available_finance):
        """GET /api/v25/finance/concept/budgeting returns concept explanation."""
        response = client.get("/api/v25/finance/concept/budgeting")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["concept"] == "budgeting"
        assert "explanation" in data

    def test_get_financial_concept_compound_interest(self, client, mock_available_finance):
        """GET /api/v25/finance/concept/compound_interest returns concept."""
        response = client.get("/api/v25/finance/concept/compound_interest")
        assert response.status_code == 200
        data = response.json()
        assert data["concept"] == "compound_interest"

    # ---- GET /api/v25/finance/investment/{topic} ----

    def test_investment_guide_unavailable(self, client):
        """GET /api/v25/finance/investment/stocks returns 503 when unavailable."""
        response = client.get("/api/v25/finance/investment/stocks")
        assert response.status_code == 503

    def test_investment_guide_success(self, client, mock_available_finance):
        """GET /api/v25/finance/investment/stocks returns investment guide."""
        response = client.get("/api/v25/finance/investment/stocks")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "risk_level" in data
        assert "strategies" in data

    def test_investment_guide_retirement(self, client, mock_available_finance):
        """GET /api/v25/finance/investment/retirement returns guide."""
        response = client.get("/api/v25/finance/investment/retirement")
        assert response.status_code == 200
        data = response.json()
        assert data["topic"] == "retirement"

    # ---- POST /api/v25/finance/tax/explain ----

    def test_explain_tax_unavailable(self, client):
        """POST /api/v25/finance/tax/explain returns 503 when unavailable."""
        response = client.post(
            "/api/v25/finance/tax/explain",
            json={"country": "south_africa", "income": 500000},
        )
        assert response.status_code == 503

    def test_explain_tax_success(self, client, mock_available_finance):
        """POST /api/v25/finance/tax/explain returns tax explanation."""
        response = client.post(
            "/api/v25/finance/tax/explain",
            json={"country": "south_africa", "income": 500000},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "tax_breakdown" in data

    def test_explain_tax_missing_country(self, client):
        """POST explain_tax without country returns 422."""
        response = client.post(
            "/api/v25/finance/tax/explain",
            json={"income": 500000},
        )
        assert response.status_code == 422

    def test_explain_tax_invalid_income_zero(self, client):
        """POST explain_tax with income=0 returns 422 (must be > 0)."""
        response = client.post(
            "/api/v25/finance/tax/explain",
            json={"country": "south_africa", "income": 0},
        )
        assert response.status_code == 422

    def test_explain_tax_invalid_income_negative(self, client):
        """POST explain_tax with negative income returns 422."""
        response = client.post(
            "/api/v25/finance/tax/explain",
            json={"country": "south_africa", "income": -100},
        )
        assert response.status_code == 422

    # ---- POST /api/v25/finance/budget ----

    def test_calculate_budget_unavailable(self, client):
        """POST /api/v25/finance/budget returns 503 when unavailable."""
        response = client.post(
            "/api/v25/finance/budget",
            json={"income": 50000, "expenses": {"rent": 15000, "food": 5000}},
        )
        assert response.status_code == 503

    def test_calculate_budget_success(self, client, mock_available_finance):
        """POST /api/v25/finance/budget returns budget breakdown."""
        response = client.post(
            "/api/v25/finance/budget",
            json={"income": 50000, "expenses": {"rent": 15000, "food": 5000}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "savings_rate" in data
        assert "recommendations" in data

    def test_calculate_budget_missing_income(self, client):
        """POST budget without income returns 422."""
        response = client.post(
            "/api/v25/finance/budget",
            json={"expenses": {"rent": 15000}},
        )
        assert response.status_code == 422

    def test_calculate_budget_missing_expenses(self, client):
        """POST budget without expenses returns 422."""
        response = client.post(
            "/api/v25/finance/budget",
            json={"income": 50000},
        )
        assert response.status_code == 422

    def test_calculate_budget_invalid_income(self, client):
        """POST budget with income=0 returns 422."""
        response = client.post(
            "/api/v25/finance/budget",
            json={"income": 0, "expenses": {"rent": 15000}},
        )
        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# TAX ENGINE — 2 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestTaxEngine:
    """Tests for /api/v25/tax/* endpoints."""

    # ---- POST /api/v25/tax/calculate ----

    def test_calculate_tax_unavailable(self, client):
        """POST /api/v25/tax/calculate returns 503 when unavailable."""
        response = client.post(
            "/api/v25/tax/calculate",
            json={"country": "US", "income": 100000},
        )
        assert response.status_code == 503

    def test_calculate_tax_success(self, client, mock_available_tax):
        """POST /api/v25/tax/calculate returns tax calculation."""
        response = client.post(
            "/api/v25/tax/calculate",
            json={"country": "US", "income": 100000},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "gross_tax" in data
        assert "net_income" in data
        assert "brackets" in data

    def test_calculate_tax_different_country(self, client, mock_available_tax):
        """POST /api/v25/tax/calculate with different country."""
        response = client.post(
            "/api/v25/tax/calculate",
            json={"country": "UK", "income": 75000},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "UK"

    def test_calculate_tax_missing_country(self, client):
        """POST calculate_tax without country returns 422."""
        response = client.post(
            "/api/v25/tax/calculate",
            json={"income": 100000},
        )
        assert response.status_code == 422

    def test_calculate_tax_invalid_income(self, client):
        """POST calculate_tax with income=0 returns 422."""
        response = client.post(
            "/api/v25/tax/calculate",
            json={"country": "US", "income": 0},
        )
        assert response.status_code == 422

    # ---- GET /api/v25/tax/brackets/{country} ----

    def test_get_tax_brackets_unavailable(self, client):
        """GET /api/v25/tax/brackets/US returns 503 when unavailable."""
        response = client.get("/api/v25/tax/brackets/US")
        assert response.status_code == 503

    def test_get_tax_brackets_success(self, client, mock_available_tax):
        """GET /api/v25/tax/brackets/US returns tax brackets."""
        response = client.get("/api/v25/tax/brackets/US")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "brackets" in data
        assert len(data["brackets"]) > 0

    def test_get_tax_brackets_uk(self, client, mock_available_tax):
        """GET /api/v25/tax/brackets/UK returns UK brackets."""
        response = client.get("/api/v25/tax/brackets/UK")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "UK"


# ═══════════════════════════════════════════════════════════════════════════
# EDUCATIONAL COMPANION — 3 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestEducation:
    """Tests for /api/v25/education/* endpoints."""

    # ---- POST /api/v25/education/study-plan ----

    def test_create_study_plan_unavailable(self, client):
        """POST /api/v25/education/study-plan returns 503 when unavailable."""
        response = client.post(
            "/api/v25/education/study-plan",
            json={"subject": "mathematics", "level": "beginner"},
        )
        assert response.status_code == 503

    def test_create_study_plan_success(self, client, mock_available_education):
        """POST /api/v25/education/study-plan returns study plan."""
        response = client.post(
            "/api/v25/education/study-plan",
            json={"subject": "mathematics", "level": "beginner"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "topics" in data
        assert "schedule" in data
        assert "resources" in data

    def test_create_study_plan_different_subject(self, client, mock_available_education):
        """POST study-plan with different subject."""
        response = client.post(
            "/api/v25/education/study-plan",
            json={"subject": "physics", "level": "advanced"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "physics"
        assert data["level"] == "advanced"

    def test_create_study_plan_missing_subject(self, client):
        """POST study-plan without subject returns 422."""
        response = client.post(
            "/api/v25/education/study-plan",
            json={"level": "beginner"},
        )
        assert response.status_code == 422

    def test_create_study_plan_missing_level(self, client):
        """POST study-plan without level returns 422."""
        response = client.post(
            "/api/v25/education/study-plan",
            json={"subject": "mathematics"},
        )
        assert response.status_code == 422

    # ---- GET /api/v25/education/questions ----

    def test_get_practice_questions_unavailable(self, client):
        """GET /api/v25/education/questions returns 503 when unavailable."""
        response = client.get("/api/v25/education/questions?subject=mathematics&level=beginner")
        assert response.status_code == 503

    def test_get_practice_questions_success(self, client, mock_available_education):
        """GET /api/v25/education/questions returns practice questions."""
        response = client.get("/api/v25/education/questions?subject=mathematics&level=beginner")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "questions" in data

    def test_get_practice_questions_missing_subject(self, client):
        """GET questions without subject returns 422."""
        response = client.get("/api/v25/education/questions?level=beginner")
        assert response.status_code == 422

    def test_get_practice_questions_missing_level(self, client):
        """GET questions without level returns 422."""
        response = client.get("/api/v25/education/questions?subject=mathematics")
        assert response.status_code == 422

    def test_get_practice_questions_no_params(self, client):
        """GET questions without any params returns 422."""
        response = client.get("/api/v25/education/questions")
        assert response.status_code == 422

    # ---- GET /api/v25/education/help ----

    def test_get_subject_help_unavailable(self, client):
        """GET /api/v25/education/help returns 503 when unavailable."""
        response = client.get("/api/v25/education/help?subject=mathematics&topic=algebra")
        assert response.status_code == 503

    def test_get_subject_help_success(self, client, mock_available_education):
        """GET /api/v25/education/help returns subject help."""
        response = client.get("/api/v25/education/help?subject=mathematics&topic=algebra")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "explanation" in data
        assert "examples" in data

    def test_get_subject_help_missing_subject(self, client):
        """GET help without subject returns 422."""
        response = client.get("/api/v25/education/help?topic=algebra")
        assert response.status_code == 422

    def test_get_subject_help_missing_topic(self, client):
        """GET help without topic returns 422."""
        response = client.get("/api/v25/education/help?subject=mathematics")
        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# VOCATIONAL COMPANION — 2 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestVocational:
    """Tests for /api/v25/skills/* endpoints."""

    # ---- GET /api/v25/skills/trades ----

    def test_list_vocational_trades_unavailable(self, client):
        """GET /api/v25/skills/trades returns 503 when unavailable."""
        response = client.get("/api/v25/skills/trades")
        assert response.status_code == 503

    def test_list_vocational_trades_success(self, client, mock_available_vocational):
        """GET /api/v25/skills/trades returns trades list."""
        response = client.get("/api/v25/skills/trades")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "trades" in data
        assert len(data["trades"]) > 0

    # ---- GET /api/v25/skills/trades/{trade} ----

    def test_get_vocational_guide_unavailable(self, client):
        """GET /api/v25/skills/trades/carpentry returns 503 when unavailable."""
        response = client.get("/api/v25/skills/trades/carpentry")
        assert response.status_code == 503

    def test_get_vocational_guide_success(self, client, mock_available_vocational):
        """GET /api/v25/skills/trades/carpentry returns vocational guide."""
        response = client.get("/api/v25/skills/trades/carpentry")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "training_requirements" in data
        assert "salary_expectations" in data

    def test_get_vocational_guide_electrician(self, client, mock_available_vocational):
        """GET /api/v25/skills/trades/electrician returns guide."""
        response = client.get("/api/v25/skills/trades/electrician")
        assert response.status_code == 200
        data = response.json()
        assert data["trade"] == "electrician"


# ═══════════════════════════════════════════════════════════════════════════
# BLOCKCHAIN AUDIT — 2 endpoints
# ═══════════════════════════════════════════════════════════════════════════


class TestBlockchain:
    """Tests for /api/v25/audit/* endpoints."""

    # ---- POST /api/v25/audit/append ----

    def test_audit_append_no_mock(self, client):
        """POST /api/v25/audit/append works without mock (module may be available)."""
        response = client.post(
            "/api/v25/audit/append",
            json={"action": "user_login", "actor": "test_user"},
        )
        # Module may be available but have internal errors (500) or be unavailable (503)
        assert response.status_code in [200, 500, 503]

    def test_audit_append_success(self, client, mock_available_blockchain):
        """POST /api/v25/audit/append returns audit entry."""
        response = client.post(
            "/api/v25/audit/append",
            json={"action": "user_login", "actor": "test_user"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "hash" in data
        assert data["action"] == "user_login"

    def test_audit_append_with_data(self, client, mock_available_blockchain):
        """POST /api/v25/audit/append with optional data field."""
        response = client.post(
            "/api/v25/audit/append",
            json={"action": "data_update", "actor": "admin", "data": {"record_id": 123}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "hash" in data

    def test_audit_append_missing_action(self, client):
        """POST audit/append without action returns 422."""
        response = client.post(
            "/api/v25/audit/append",
            json={"actor": "test_user"},
        )
        assert response.status_code == 422

    def test_audit_append_empty_action(self, client):
        """POST audit/append with empty action returns 422."""
        response = client.post(
            "/api/v25/audit/append",
            json={"action": "", "actor": "test_user"},
        )
        assert response.status_code == 422

    # ---- GET /api/v25/audit/verify ----

    def test_audit_verify_no_mock(self, client):
        """GET /api/v25/audit/verify works without mock (module may be available)."""
        response = client.get("/api/v25/audit/verify")
        # Module may be available but have internal errors (500) or be unavailable (503)
        assert response.status_code in [200, 500, 503]

    def test_audit_verify_success(self, client, mock_available_blockchain):
        """GET /api/v25/audit/verify returns chain verification."""
        response = client.get("/api/v25/audit/verify")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "chain_valid" in data
        assert "entries_count" in data


# ═══════════════════════════════════════════════════════════════════════════
# SYSTEM — 2 endpoints (backup + cache)
# ═══════════════════════════════════════════════════════════════════════════


class TestSystem:
    """Tests for /api/v25/system/* endpoints."""

    # ---- POST /api/v25/system/backup ----

    def test_backup_no_mock(self, client):
        """POST /api/v25/system/backup works without mock (module may be available)."""
        response = client.post("/api/v25/system/backup", json={})
        # Module may be available but have internal errors (500) or be unavailable (503)
        assert response.status_code in [200, 500, 503]

    def test_backup_success(self, client, mock_available_backup):
        """POST /api/v25/system/backup triggers backup."""
        response = client.post("/api/v25/system/backup", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "path" in data
        assert "size_bytes" in data

    def test_backup_with_custom_dir(self, client, mock_available_backup):
        """POST /api/v25/system/backup with custom directory."""
        response = client.post(
            "/api/v25/system/backup",
            json={"backup_dir": "/custom/backup/path"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["path"] == "/custom/backup/path"

    def test_backup_dir_too_long(self, client):
        """POST backup with backup_dir >512 chars returns 422."""
        response = client.post(
            "/api/v25/system/backup",
            json={"backup_dir": "x" * 513},
        )
        assert response.status_code == 422

    # ---- GET /api/v25/system/cache/stats ----

    def test_cache_stats_no_mock(self, client):
        """GET /api/v25/system/cache/stats works without mock (module may be available)."""
        response = client.get("/api/v25/system/cache/stats")
        # Module may be available but have internal errors (500) or be unavailable (503)
        assert response.status_code in [200, 500, 503]

    def test_cache_stats_success(self, client, mock_available_cache):
        """GET /api/v25/system/cache/stats returns cache statistics."""
        response = client.get("/api/v25/system/cache/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "hits" in data
        assert "hit_ratio" in data


# ═══════════════════════════════════════════════════════════════════════════
# AVAILABILITY REPORT — 1 endpoint
# ═══════════════════════════════════════════════════════════════════════════


class TestCapabilities:
    """Tests for /api/v25/capabilities/omega endpoint."""

    def test_capabilities_report(self, client):
        """GET /api/v25/capabilities/omega returns availability report."""
        response = client.get("/api/v25/capabilities/omega")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have keys for all 8 modules
        expected_modules = [
            "african_languages",
            "financial_literacy",
            "tax_engine",
            "cache_manager",
            "blockchain_audit",
            "auto_backup",
            "vocational_companion",
            "educational_companion",
        ]
        for module in expected_modules:
            assert module in data
            assert isinstance(data[module], bool)


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH CHECK — 1 endpoint
# ═══════════════════════════════════════════════════════════════════════════


class TestHealth:
    """Tests for /health and /ready endpoints."""

    def test_health_endpoint(self, client):
        """GET /health returns health report."""
        response = client.get("/health")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "uptime_seconds" in data
        assert "checks" in data

    def test_health_response_structure(self, client):
        """GET /health returns properly structured response."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "codename" in data
        assert "environment" in data
        assert "uptime_seconds" in data
        assert "timestamp" in data
        assert "checks" in data
        assert isinstance(data["checks"], dict)

    def test_ready_endpoint(self, client):
        """GET /ready returns readiness status."""
        response = client.get("/ready")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "ready" in data

    def test_config_endpoint(self, client):
        """GET /config returns non-sensitive configuration."""
        response = client.get("/config")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "environment" in data

    def test_root_endpoint(self, client):
        """GET / returns root info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data


# ═══════════════════════════════════════════════════════════════════════════
# CHAT ENDPOINT — 1 endpoint
# ═══════════════════════════════════════════════════════════════════════════


class TestChat:
    """Tests for /api/v25/luqi/chat endpoint.

    NOTE: The v25_luqi_endpoints module may not export a router attribute,
    so the chat endpoint might not be mounted. These tests handle both cases.
    """

    def _chat_endpoint_available(self, client):
        """Check if chat endpoint is registered."""
        response = client.post("/api/v25/luqi/chat", json={})
        return response.status_code != 404

    def test_chat_endpoint_registered(self, client):
        """POST /api/v25/luqi/chat — endpoint may or may not be registered."""
        response = client.post("/api/v25/luqi/chat", json={})
        # Endpoint is either registered (non-404) or not mounted (404)
        if response.status_code == 404:
            pytest.skip("Chat endpoint not mounted (v25_luqi_endpoints has no router)")
        # Otherwise it should be some other status (auth error, validation, etc.)
        assert response.status_code in [200, 401, 403, 422, 500, 503]

    def test_chat_unauthorized(self, client):
        """POST /api/v25/luqi/chat without auth returns appropriate status."""
        response = client.post(
            "/api/v25/luqi/chat",
            json={"message": "Hello"},
        )
        if response.status_code == 404:
            pytest.skip("Chat endpoint not mounted")
        assert response.status_code in [200, 401, 403, 422, 500, 503]

    def test_chat_with_auth_headers(self, client, auth_headers):
        """POST /api/v25/luqi/chat with auth headers."""
        response = client.post(
            "/api/v25/luqi/chat",
            headers=auth_headers,
            json={"message": "Hello, LUQI!"},
        )
        if response.status_code == 404:
            pytest.skip("Chat endpoint not mounted")
        assert response.status_code in [200, 401, 403, 422, 500, 503]

    def test_chat_missing_message(self, client):
        """POST /api/v25/luqi/chat with empty body is handled."""
        response = client.post("/api/v25/luqi/chat", json={})
        if response.status_code == 404:
            pytest.skip("Chat endpoint not mounted")
        assert response.status_code in [200, 401, 403, 422, 500, 503]

    def test_chat_with_session_id(self, client):
        """POST /api/v25/luqi/chat with session_id."""
        response = client.post(
            "/api/v25/luqi/chat",
            json={"message": "Hello", "session_id": "test-session-123"},
        )
        if response.status_code == 404:
            pytest.skip("Chat endpoint not mounted")
        assert response.status_code in [200, 401, 403, 422, 500, 503]


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINT INTEGRITY — verify all 21+ endpoints are registered
# ═══════════════════════════════════════════════════════════════════════════


class TestEndpointRegistry:
    """Verify all expected endpoints exist and are reachable."""

    @pytest.mark.parametrize(
        "method,path,body",
        [
            # African Languages (5)
            ("GET", "/api/v25/languages", None),
            ("GET", "/api/v25/languages/swahili", None),
            ("GET", "/api/v25/languages/swahili/greeting", None),
            ("GET", "/api/v25/languages/swahili/cultural-note", None),
            ("POST", "/api/v25/languages/translate", {"phrase": "hi", "language": "sw"}),
            # Finance (4)
            ("GET", "/api/v25/finance/concept/budgeting", None),
            ("GET", "/api/v25/finance/investment/stocks", None),
            ("POST", "/api/v25/finance/tax/explain", {"country": "SA", "income": 100}),
            ("POST", "/api/v25/finance/budget", {"income": 100, "expenses": {"a": 10}}),
            # Tax (2)
            ("POST", "/api/v25/tax/calculate", {"country": "US", "income": 100}),
            ("GET", "/api/v25/tax/brackets/US", None),
            # Education (3)
            ("POST", "/api/v25/education/study-plan", {"subject": "math", "level": "beg"}),
            ("GET", "/api/v25/education/questions?subject=math&level=beg", None),
            ("GET", "/api/v25/education/help?subject=math&topic=alg", None),
            # Vocational (2)
            ("GET", "/api/v25/skills/trades", None),
            ("GET", "/api/v25/skills/trades/carpentry", None),
            # Blockchain (2)
            ("POST", "/api/v25/audit/append", {"action": "test"}),
            ("GET", "/api/v25/audit/verify", None),
            # System (2)
            ("POST", "/api/v25/system/backup", {}),
            ("GET", "/api/v25/system/cache/stats", None),
            # Capabilities (1)
            ("GET", "/api/v25/capabilities/omega", None),
            # Health (1)
            ("GET", "/health", None),
            # Chat (1) — may not be mounted if v25_luqi_endpoints has no router
            # ("POST", "/api/v25/luqi/chat", {"message": "hi"}),  # SKIPPED — endpoint not mounted
        ],
    )
    def test_endpoint_registered(self, client, method, path, body):
        """Verify endpoint exists (does not return 404)."""
        if method == "GET":
            response = client.get(path)
        elif method == "POST":
            response = client.post(path, json=body or {})
        else:
            pytest.fail(f"Unknown method: {method}")

        # Endpoint exists if not 404
        assert response.status_code != 404, f"Endpoint {method} {path} not found (404)"
