"""Omega AI Capability Bridge -- Ports unique omega_ai capabilities to the modern backend."""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add omega_ai to path
OMEGA_DIR = Path(__file__).parent.parent / "omega_ai"
if str(OMEGA_DIR) not in sys.path:
    sys.path.insert(0, str(OMEGA_DIR))

# African Languages (59 languages)
try:
    from african_languages import (
        get_language_info, translate_phrase, list_languages,
        get_greeting, get_cultural_note, AFRICAN_LANGUAGES
    )
    AFRICAN_LANGUAGES_AVAILABLE = True
except ImportError:
    AFRICAN_LANGUAGES_AVAILABLE = False

# Financial Literacy
try:
    from financial_literacy import (
        get_financial_concept, calculate_budget, investment_guide,
        explain_tax, retirement_calculator
    )
    FINANCIAL_AVAILABLE = True
except ImportError:
    FINANCIAL_AVAILABLE = False

# Tax Engine
try:
    from tax_engine import calculate_tax, get_tax_brackets, format_tax_report
    TAX_AVAILABLE = True
except ImportError:
    TAX_AVAILABLE = False

# Cache Manager
try:
    from cache_manager import CacheManager, ModuleCache, get_cache
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False

# Blockchain Audit
try:
    from blockchain_audit import BlockchainAuditLog
    BLOCKCHAIN_AVAILABLE = True
except ImportError:
    BLOCKCHAIN_AVAILABLE = False

# Auto Backup
try:
    from auto_backup import AutoBackup
    BACKUP_AVAILABLE = True
except ImportError:
    BACKUP_AVAILABLE = False

# Vocational Companion
try:
    from vocational_companion import get_vocational_guide, list_vocational_trades
    VOCATIONAL_AVAILABLE = True
except ImportError:
    VOCATIONAL_AVAILABLE = False

# Educational Companion
try:
    from educational_companion import (
        get_subject_help, create_study_plan, get_practice_questions
    )
    EDUCATIONAL_AVAILABLE = True
except ImportError:
    EDUCATIONAL_AVAILABLE = False


__all__ = [
    "AFRICAN_LANGUAGES_AVAILABLE", "FINANCIAL_AVAILABLE", "TAX_AVAILABLE",
    "CACHE_AVAILABLE", "BLOCKCHAIN_AVAILABLE", "BACKUP_AVAILABLE",
    "VOCATIONAL_AVAILABLE", "EDUCATIONAL_AVAILABLE",
    # Re-exports
    "get_language_info", "translate_phrase", "list_languages",
    "get_financial_concept", "calculate_budget", "investment_guide",
    "calculate_tax", "get_tax_brackets",
    "CacheManager", "ModuleCache", "get_cache",
    "BlockchainAuditLog", "AutoBackup",
    "get_vocational_guide", "list_vocational_trades",
    "get_subject_help", "create_study_plan", "get_practice_questions",
    # Safe wrappers
    "safe_translate", "safe_calculate_tax", "safe_get_financial_concept",
    "safe_investment_guide", "safe_explain_tax", "safe_get_tax_brackets",
    "safe_create_study_plan", "safe_get_practice_questions",
    "safe_get_vocational_guide", "safe_list_vocational_trades",
    "safe_list_languages", "safe_get_language_info", "safe_get_greeting",
    "safe_blockchain_audit", "safe_backup", "get_availability_report",
]


# Safe wrapper functions -- handle missing omega_ai modules gracefully

def safe_translate(phrase: str, language: str) -> Dict[str, Any]:
    if not AFRICAN_LANGUAGES_AVAILABLE:
        return {"status": "unavailable", "message": "African languages module not loaded"}
    return translate_phrase(phrase, language)

def safe_calculate_tax(country: str, income: float) -> Dict[str, Any]:
    if not TAX_AVAILABLE:
        return {"status": "unavailable", "message": "Tax engine not loaded"}
    return calculate_tax(country, income)

def safe_get_financial_concept(concept: str) -> Dict[str, Any]:
    if not FINANCIAL_AVAILABLE:
        return {"status": "unavailable", "message": "Financial literacy module not loaded"}
    return get_financial_concept(concept)

def safe_investment_guide(topic: str) -> Dict[str, Any]:
    if not FINANCIAL_AVAILABLE:
        return {"status": "unavailable", "message": "Financial literacy module not loaded"}
    return investment_guide(topic)

def safe_explain_tax(country: str, income: float) -> Dict[str, Any]:
    if not FINANCIAL_AVAILABLE:
        return {"status": "unavailable", "message": "Financial literacy module not loaded"}
    return explain_tax(country, income)

def safe_get_tax_brackets(country: str) -> Dict[str, Any]:
    if not TAX_AVAILABLE:
        return {"status": "unavailable", "message": "Tax engine not loaded"}
    return get_tax_brackets(country)

def safe_create_study_plan(subject: str, level: str) -> Dict[str, Any]:
    if not EDUCATIONAL_AVAILABLE:
        return {"status": "unavailable", "message": "Educational companion module not loaded"}
    return create_study_plan(subject, level)

def safe_get_practice_questions(subject: str, level: str) -> Dict[str, Any]:
    if not EDUCATIONAL_AVAILABLE:
        return {"status": "unavailable", "message": "Educational companion module not loaded"}
    return get_practice_questions(subject, level)

def safe_get_vocational_guide(trade: str) -> Dict[str, Any]:
    if not VOCATIONAL_AVAILABLE:
        return {"status": "unavailable", "message": "Vocational companion module not loaded"}
    return get_vocational_guide(trade)

def safe_list_vocational_trades() -> Dict[str, Any]:
    if not VOCATIONAL_AVAILABLE:
        return {"status": "unavailable", "message": "Vocational companion module not loaded"}
    return list_vocational_trades()

def safe_list_languages() -> Dict[str, Any]:
    if not AFRICAN_LANGUAGES_AVAILABLE:
        return {"status": "unavailable", "message": "African languages module not loaded"}
    return list_languages()

def safe_get_language_info(language: str) -> Dict[str, Any]:
    if not AFRICAN_LANGUAGES_AVAILABLE:
        return {"status": "unavailable", "message": "African languages module not loaded"}
    return get_language_info(language)

def safe_get_greeting(language: str) -> Dict[str, Any]:
    if not AFRICAN_LANGUAGES_AVAILABLE:
        return {"status": "unavailable", "message": "African languages module not loaded"}
    return get_greeting(language)

def safe_blockchain_audit(action: str, actor: str = "", data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not BLOCKCHAIN_AVAILABLE:
        return {"status": "unavailable", "message": "Blockchain audit module not loaded"}
    audit = BlockchainAuditLog()
    return audit.append(action, actor, data or {})

def safe_backup(backup_dir: Optional[str] = None) -> Dict[str, Any]:
    if not BACKUP_AVAILABLE:
        return {"status": "unavailable", "message": "Auto-backup module not loaded"}
    backup = AutoBackup(backup_dir=backup_dir)
    return backup.full_backup()

def get_availability_report() -> Dict[str, bool]:
    return {
        "african_languages": AFRICAN_LANGUAGES_AVAILABLE,
        "financial_literacy": FINANCIAL_AVAILABLE,
        "tax_engine": TAX_AVAILABLE,
        "cache_manager": CACHE_AVAILABLE,
        "blockchain_audit": BLOCKCHAIN_AVAILABLE,
        "auto_backup": BACKUP_AVAILABLE,
        "vocational_companion": VOCATIONAL_AVAILABLE,
        "educational_companion": EDUCATIONAL_AVAILABLE,
    }
