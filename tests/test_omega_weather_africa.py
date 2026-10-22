from datetime import datetime, timedelta, timezone

import pytest

from omega_ai.weather_africa import WeatherAfrica


NOW = datetime(2026, 10, 22, 12, tzinfo=timezone.utc)


def provider(lat, lon):
    assert -90 <= lat <= 90 and -180 <= lon <= 180
    return {"source": "fixture-weather-service", "observed_at": NOW.isoformat(),
            "temperature_c": 41, "wind_kmh": 61, "rain_24h_mm": 55}


def test_alerts_are_derived_not_official():
    result = WeatherAfrica(provider).assess(-25.7479, 28.2293, now=NOW)
    assert result.screening_flags == (
        "HEAT_SCREENING", "WIND_SCREENING", "HEAVY_RAIN_SCREENING")
    assert result.verified_official_alerts == ()


def test_stale_weather_is_rejected():
    with pytest.raises(ValueError, match="stale"):
        WeatherAfrica(provider).assess(-1, 36, now=NOW + timedelta(days=1))


def test_official_alerts_require_verifiable_source():
    def unsigned(_, __):
        return {**provider(-25, 28), "official_alerts": ["flood"]}
    with pytest.raises(ValueError, match="source"):
        WeatherAfrica(unsigned).assess(0, 0, now=NOW)


def test_coordinates_and_readings_validated():
    weather = WeatherAfrica(provider)
    with pytest.raises(ValueError):
        weather.assess(-91, 28, now=NOW)
    with pytest.raises(ValueError):
        WeatherAfrica(lambda a, b: {**provider(a, b), "wind_kmh": -10}).assess(0, 0, now=NOW)
