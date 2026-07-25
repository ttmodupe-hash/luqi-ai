"""Omega AI Unique Capabilities -- FastAPI Router

Exposes all 27 safe wrapper functions from omega_capabilities.py as RESTful
HTTP endpoints under /api/v25/*.  Each endpoint delegates to a safe wrapper
that gracefully handles missing omega_ai modules.

Modules covered:
  - African Languages (5 endpoints)
  - Financial Literacy (4 endpoints)
  - Tax Engine (2 endpoints)
  - Educational Companion (3 endpoints)
  - Vocational Companion (2 endpoints)
  - Blockchain Audit (2 endpoints)
  - Auto Backup (1 endpoint)
  - Cache Manager (1 endpoint)
  - Availability Report (1 endpoint)

Total: 21 endpoints
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

import backend.omega_capabilities as _oc

logger = logging.getLogger(__name__)
router = APIRouter(tags=["omega"])


# ---------------------------------------------------------------------------
# Helper functions for endpoints that need inline wrappers
# ---------------------------------------------------------------------------

def safe_get_cultural_note(language: str) -> Dict[str, Any]:
    """Safely get a cultural note for a language, handling missing omega_ai."""
    if not _oc.AFRICAN_LANGUAGES_AVAILABLE:
        return {"status": "unavailable", "message": "African languages module not loaded"}
    return _oc.get_cultural_note(language)


def verify_chain() -> Dict[str, Any]:
    """Verify the integrity of the blockchain audit chain."""
    if not _oc.BLOCKCHAIN_AVAILABLE:
        return {"status": "unavailable", "message": "Blockchain audit module not loaded"}
    audit = _oc.BlockchainAuditLog()
    return audit.verify()


def cache_stats() -> Dict[str, Any]:
    """Get cache manager statistics."""
    if not _oc.CACHE_AVAILABLE:
        return {"status": "unavailable", "message": "Cache manager module not loaded"}
    cache = _oc.get_cache()
    return cache.stats()


# ---------------------------------------------------------------------------
# Pydantic Request Models (POST bodies)
# ---------------------------------------------------------------------------

class TranslateRequest(BaseModel):
    """Request body for the translate endpoint."""
    phrase: str = Field(..., min_length=1, max_length=1000, description="Phrase to translate")
    language: str = Field(..., min_length=1, max_length=128, description="Target African language")


class TaxExplainRequest(BaseModel):
    """Request body for the tax explanation endpoint."""
    country: str = Field(..., min_length=1, max_length=128, description="Country code or name")
    income: float = Field(..., gt=0, description="Annual income amount")


class BudgetRequest(BaseModel):
    """Request body for the budget calculation endpoint."""
    income: float = Field(..., gt=0, description="Total monthly or annual income")
    expenses: Dict[str, float] = Field(..., description="Mapping of expense category to amount")


class TaxCalculateRequest(BaseModel):
    """Request body for the tax calculation endpoint."""
    country: str = Field(..., min_length=1, max_length=128, description="Country code or name")
    income: float = Field(..., gt=0, description="Annual income amount")


class StudyPlanRequest(BaseModel):
    """Request body for the study plan endpoint."""
    subject: str = Field(..., min_length=1, max_length=256, description="Subject to study")
    level: str = Field(..., min_length=1, max_length=128, description="Education level (e.g. beginner, intermediate, advanced)")


class BlockchainAuditRequest(BaseModel):
    """Request body for the blockchain audit append endpoint."""
    action: str = Field(..., min_length=1, max_length=256, description="Action being audited")
    actor: str = Field(default="", max_length=256, description="Actor performing the action")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Optional additional audit data")


class BackupRequest(BaseModel):
    """Request body for the backup endpoint."""
    backup_dir: Optional[str] = Field(default=None, max_length=512, description="Directory to store backup (optional)")


# ═══════════════════════════════════════════════════════════════════════════════
#  AFRICAN LANGUAGES (5 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/languages")
async def api_omega_list_languages():
    """List all supported African languages (59 languages).

    Returns a dictionary containing the list of languages with their
    codes, names, and family groupings.
    """
    try:
        result = _oc.safe_list_languages()
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("List languages error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages/{language}")
async def api_omega_get_language_info(language: str):
    """Get detailed information about a specific African language.

    Parameters
    ----------
    language: Language code or name (e.g. "swahili", "yoruba", "zulu")

    Returns language metadata including family, speakers, regions, and scripts.
    """
    try:
        result = _oc.safe_get_language_info(language)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get language info error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages/{language}/greeting")
async def api_omega_get_greeting(language: str):
    """Get a traditional greeting in the specified African language.

    Parameters
    ----------
    language: Language code or name (e.g. "swahili", "amharic")

    Returns the greeting text, pronunciation guide, and cultural context.
    """
    try:
        result = _oc.safe_get_greeting(language)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get greeting error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages/{language}/cultural-note")
async def api_omega_get_cultural_note(language: str):
    """Get a cultural note for the specified African language.

    Parameters
    ----------
    language: Language code or name (e.g. "swahili", "yoruba")

    Returns cultural context, customs, and communication etiquette.
    """
    try:
        result = safe_get_cultural_note(language)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get cultural note error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/languages/translate")
async def api_omega_translate(request: TranslateRequest):
    """Translate a phrase into a target African language.

    Request Body
    ------------
    phrase: Text to translate (1-1000 characters)
    language: Target African language code or name

    Returns the translated text, transliteration, and audio hint if available.
    """
    try:
        result = _oc.safe_translate(request.phrase, request.language)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Translate error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  FINANCIAL LITERACY (4 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/finance/concept/{concept}")
async def api_omega_get_financial_concept(concept: str):
    """Get an explanation of a financial concept.

    Parameters
    ----------
    concept: Financial concept name (e.g. "compound_interest", "inflation",
             "diversification", "liquidity")

    Returns a plain-language explanation with examples and relevance.
    """
    try:
        result = _oc.safe_get_financial_concept(concept)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get financial concept error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/finance/investment/{topic}")
async def api_omega_investment_guide(topic: str):
    """Get an investment guide for a specific topic.

    Parameters
    ----------
    topic: Investment topic (e.g. "stocks", "bonds", "real_estate",
           "crypto", "retirement")

    Returns investment guidance including risk levels, strategies, and tips.
    """
    try:
        result = _oc.safe_investment_guide(topic)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Investment guide error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finance/tax/explain")
async def api_omega_explain_tax(request: TaxExplainRequest):
    """Explain tax obligations for a given country and income.

    Request Body
    ------------
    country: Country code or name
    income: Annual income amount (must be > 0)

    Returns a breakdown of tax obligations, deductions, and effective rates.
    """
    try:
        result = _oc.safe_explain_tax(request.country, request.income)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Explain tax error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finance/budget")
async def api_omega_calculate_budget(request: BudgetRequest):
    """Calculate a budget breakdown from income and expenses.

    Request Body
    ------------
    income: Total income amount (must be > 0)
    expenses: Dictionary mapping expense categories to amounts

    Returns budget analysis including savings rate, recommendations, and alerts.
    """
    try:
        if not _oc.FINANCIAL_AVAILABLE:
            raise HTTPException(status_code=503, detail="Financial literacy module not loaded")
        result = _oc.calculate_budget(request.income, request.expenses)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Calculate budget error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  TAX ENGINE (2 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/tax/calculate")
async def api_omega_calculate_tax(request: TaxCalculateRequest):
    """Calculate tax for a given country and income.

    Request Body
    ------------
    country: Country code or name (e.g. "US", "UK", "NG", "KE")
    income: Annual gross income (must be > 0)

    Returns tax calculation including gross tax, effective rate, net income,
    and bracket breakdown.
    """
    try:
        result = _oc.safe_calculate_tax(request.country, request.income)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Calculate tax error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/brackets/{country}")
async def api_omega_get_tax_brackets(country: str):
    """Get tax brackets for a specific country.

    Parameters
    ----------
    country: Country code or name (e.g. "US", "UK", "NG", "KE")

    Returns the tax bracket structure with rates and thresholds.
    """
    try:
        result = _oc.safe_get_tax_brackets(country)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get tax brackets error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  EDUCATIONAL COMPANION (3 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/education/study-plan")
async def api_omega_create_study_plan(request: StudyPlanRequest):
    """Create a personalized study plan for a subject.

    Request Body
    ------------
    subject: Subject to study (e.g. "mathematics", "physics", "history")
    level: Education level (e.g. "beginner", "intermediate", "advanced",
           "primary", "secondary", "university")

    Returns a structured study plan with topics, schedule, and resources.
    """
    try:
        result = _oc.safe_create_study_plan(request.subject, request.level)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Create study plan error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/education/questions")
async def api_omega_get_practice_questions(
    subject: str = Query(..., min_length=1, max_length=256, description="Subject for practice questions"),
    level: str = Query(..., min_length=1, max_length=128, description="Difficulty level")
):
    """Get practice questions for a subject at a given level.

    Query Parameters
    ----------------
    subject: Subject area (e.g. "mathematics", "biology", "english")
    level: Difficulty level (e.g. "beginner", "intermediate", "advanced")

    Returns a set of practice questions with answers and explanations.
    """
    try:
        result = _oc.safe_get_practice_questions(subject, level)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get practice questions error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/education/help")
async def api_omega_get_subject_help(
    subject: str = Query(..., min_length=1, max_length=256, description="Subject area"),
    topic: str = Query(..., min_length=1, max_length=256, description="Specific topic within the subject")
):
    """Get help and explanations for a specific topic within a subject.

    Query Parameters
    ----------------
    subject: Subject area (e.g. "mathematics", "chemistry")
    topic: Specific topic (e.g. "quadratic_equations", "periodic_table")

    Returns an explanation, examples, and learning resources for the topic.
    """
    try:
        if not _oc.EDUCATIONAL_AVAILABLE:
            raise HTTPException(status_code=503, detail="Educational companion module not loaded")
        result = _oc.get_subject_help(subject, topic)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get subject help error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  VOCATIONAL COMPANION (2 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/skills/trades")
async def api_omega_list_vocational_trades():
    """List all available vocational trades and skills.

    Returns a catalog of trades with descriptions, requirements,
    and career outlook information.
    """
    try:
        result = _oc.safe_list_vocational_trades()
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("List vocational trades error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/trades/{trade}")
async def api_omega_get_vocational_guide(trade: str):
    """Get a detailed vocational guide for a specific trade.

    Parameters
    ----------
    trade: Trade name or identifier (e.g. "carpentry", "electrician",
           "plumbing", "welding")

    Returns training requirements, certification paths, salary expectations,
    and market demand for the trade.
    """
    try:
        result = _oc.safe_get_vocational_guide(trade)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get vocational guide error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  BLOCKCHAIN AUDIT (2 endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/audit/append")
async def api_omega_blockchain_audit_append(request: BlockchainAuditRequest):
    """Append an entry to the blockchain audit log.

    Request Body
    ------------
    action: Action being audited (e.g. "user_login", "data_update")
    actor: Entity performing the action (optional)
    data: Additional contextual data (optional JSON object)

    Returns the audit entry hash and confirmation.
    """
    try:
        result = _oc.safe_blockchain_audit(request.action, request.actor, request.data)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Blockchain audit append error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/verify")
async def api_omega_blockchain_audit_verify():
    """Verify the integrity of the blockchain audit chain.

    Checks cryptographic hashes linking all audit entries and reports
    any tampering or chain breaks.
    """
    try:
        result = verify_chain()
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Blockchain audit verify error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTO BACKUP (1 endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/system/backup")
async def api_omega_backup(request: BackupRequest):
    """Trigger an automatic system backup.

    Request Body
    ------------
    backup_dir: Optional custom directory to store the backup.
                If omitted, uses the default backup location.

    Returns backup metadata including path, size, and timestamp.
    """
    try:
        result = _oc.safe_backup(request.backup_dir)
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Backup error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  CACHE MANAGER (1 endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/system/cache/stats")
async def api_omega_cache_stats():
    """Get cache manager statistics.

    Returns hit/miss ratios, entry counts, memory usage, and
    per-module cache status.
    """
    try:
        result = cache_stats()
        if result.get("status") == "unavailable":
            raise HTTPException(status_code=503, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Cache stats error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  AVAILABILITY REPORT (1 endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/capabilities/omega")
async def api_omega_capabilities():
    """Get availability report for all omega_ai capability modules.

    Returns a boolean map indicating which of the 8 omega_ai modules
    are currently loaded and available:
      - african_languages
      - financial_literacy
      - tax_engine
      - cache_manager
      - blockchain_audit
      - auto_backup
      - vocational_companion
      - educational_companion
    """
    try:
        return _oc.get_availability_report()
    except Exception as e:
        logger.error("Capabilities report error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


logger.info("Omega AI unique capability router registered: 21 endpoints across 9 modules")
