"""Omega AI domain package.

Import implemented capabilities lazily. The earlier package imported a
placeholder health module and a non-existent legal module at import time,
preventing even independent working calculators from being imported.

Only verified imports are exported here. Unrestored modules remain explicitly
unavailable; no synthetic output or medical/legal advice is manufactured.
"""

from importlib import import_module

__version__ = "1.0.1"
__author__ = "Omega AI"

_IMPLEMENTED = {
    "AgricultureAdvisor": "agriculture_advisor",
    "RealEstateCalculator": "real_estate_calculator",
    "LoanCalculator": "loan_calculator",
    "SolarCalculator": "solar_calculator",
    "CommunityEvents": "community_events",
}

__all__ = list(_IMPLEMENTED)


def __getattr__(name):
    module = _IMPLEMENTED.get(name)
    if module is None:
        raise AttributeError(
            f"omega_ai.{name} is not an enabled capability; source recovery "
            "and validation are required"
        )
    capability = getattr(import_module(f".{module}", __name__), name)
    globals()[name] = capability
    return capability
