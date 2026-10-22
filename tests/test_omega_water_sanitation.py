from datetime import datetime, timezone

import pytest

from omega_ai.water_sanitation import WaterCriteria, WaterSample, WaterSanitation


def setup():
    # Fixture criteria, not a claim about an actual jurisdiction.
    return WaterSanitation(WaterCriteria("TEST", "https://example.org/criteria",
                                       6.5, 8.5, 5.0, 0.0))


def test_elevated_ecoli_is_flagged():
    sample = WaterSample(datetime(2026, 10, 21, tzinfo=timezone.utc),
                         "fixture lab", ph=7.1, turbidity_ntu=2.0,
                         ecoli_cfu_per_100ml=1)
    result = setup().assess(sample)
    assert "ECOLI_SCREENING_EXCEEDED" in result.flags
    assert result.status == "screening_only"
    assert "not assume" in result.advice


def test_good_fields_never_imply_potability():
    sample = WaterSample(datetime(2026, 10, 21, tzinfo=timezone.utc),
                         "fixture sample", ph=7.0, turbidity_ntu=1.0, ecoli_cfu_per_100ml=0)
    result = setup().assess(sample)
    assert result.flags == ()
    assert result.status != "safe_to_drink"


def test_missing_and_invalid_readings():
    sample = WaterSample(datetime(2026, 10, 21, tzinfo=timezone.utc), "field")
    assert len(setup().assess(sample).missing) == 3
    with pytest.raises(ValueError):
        setup().assess(WaterSample(datetime(2026, 10, 21, tzinfo=timezone.utc),
                                   "field", ph=20))


def test_criteria_need_provenance():
    with pytest.raises(ValueError):
        WaterSanitation(WaterCriteria("TEST", "", 6, 9, 5, 0))
