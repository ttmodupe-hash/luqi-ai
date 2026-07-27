"""
Omega AI — Capability Modules
==============================
Domain-specific advisors and calculators for health, legal,
agriculture, and real estate use cases.

Modules:
    health_advisor      — BMI, BMR, medication reference, first aid, nutrition
    legal_assistant     — SA laws, legal terms, contract clauses, rights, court procedures
    agriculture_advisor — Crop/livestock guides, yield estimates, pest info, market prices
    real_estate_calculator — Bond, rental yield, transfer duty, CGT, buy-vs-rent

Usage:
    from omega_ai.health_advisor import HealthAdvisor
    advisor = HealthAdvisor()
    result = advisor.calculate_bmi(height_m=1.75, weight_kg=70)
"""

__version__ = "1.0.0"
__author__ = "Omega AI"

from .health_advisor import HealthAdvisor
from .legal_assistant import LegalAssistant
from .agriculture_advisor import AgricultureAdvisor
from .real_estate_calculator import RealEstateCalculator

__all__ = [
    "HealthAdvisor",
    "LegalAssistant",
    "AgricultureAdvisor",
    "RealEstateCalculator",
]
