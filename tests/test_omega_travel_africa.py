from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest

from omega_ai.travel_africa import BudgetItem, TravelAfrica, TravelLeg


def test_budget_needs_supplied_fx():
    travel = TravelAfrica()
    items = [BudgetItem("hotel", Decimal("100"), "ZAR"),
             BudgetItem("rail", Decimal("20"), "KES")]
    with pytest.raises(ValueError, match="FX"):
        travel.budget(items, "ZAR")
    assert travel.budget(items, "ZAR", {("KES", "ZAR"): Decimal("0.15")}) == Decimal("103.00")


def test_itinerary_dates():
    travel = TravelAfrica()
    with pytest.raises(ValueError):
        travel.itinerary([TravelLeg("Nairobi", date(2026, 11, 3), date(2026, 11, 1))])


def test_visas_without_current_evidence_are_unknown():
    now = datetime(2026, 10, 22, tzinfo=timezone.utc)
    assert TravelAfrica().visa_guidance("ZA", "KE", now=now).requirement == "unknown"
    stale = lambda n, d: {"requirement": "visa_free", "source_url": "https://example.org/rules",
                          "checked_at": now - timedelta(days=90)}
    assert TravelAfrica(stale).visa_guidance("ZA", "KE", now=now).requirement == "unknown"


def test_supported_visa_result_requires_evidence():
    now = datetime(2026, 10, 22, tzinfo=timezone.utc)
    current = lambda n, d: {"requirement": "visa_required", "source_url": "https://example.org/rules",
                            "checked_at": now - timedelta(days=1)}
    result = TravelAfrica(current).visa_guidance("ZA", "KE", now=now)
    assert result.requirement == "visa_required"
    assert result.source_url
