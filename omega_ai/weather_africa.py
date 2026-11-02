"""Provenance-first weather adapter for African locations.

No live weather network client is included. The host injects a reliable provider,
which must return a timestamped observation with source metadata.
Derived alerts are screening flags, not official weather-service warnings.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import isfinite
from typing import Any, Callable, Mapping


@dataclass(frozen=True)
class WeatherResult:
    latitude: float
    longitude: float
    observed_at: datetime
    source: str
    temperature_c: float | None
    wind_kmh: float | None
    rain_24h_mm: float | None
    screening_flags: tuple[str, ...]
    provider_reported_official_alerts: tuple[str, ...]
    note: str = "Derived screening flags are not official forecasts or warnings."


def _timestamp(raw: Any) -> datetime:
    try:
        instant = datetime.fromisoformat(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError) as exc:
        raise ValueError("Missing or malformed observation timestamp") from exc
    if not isinstance(instant, datetime) or instant.tzinfo is None:
        raise ValueError("Weather timestamp must include a timezone")
    return instant.astimezone(timezone.utc)


def _reading(value: Any, name: str, lower: float, upper: float) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"Invalid {name} reading")
    value = float(value)
    if not isfinite(value) or value < lower or value > upper:
        raise ValueError(f"{name} out of supported bounds")
    return value


class WeatherAfrica:
    """Check weather from injected provider; never fabricate unavailable data."""

    def __init__(self, provider: Callable[[float, float], Mapping[str, Any]],
                 *, max_age: timedelta = timedelta(hours=6)) -> None:
        if not callable(provider) or max_age.total_seconds() <= 0:
            raise ValueError("Provider and positive max_age are required")
        self.provider = provider
        self.max_age = max_age

    def assess(self, latitude: float, longitude: float,
               *, now: datetime | None = None) -> WeatherResult:
        if isinstance(latitude, bool) or isinstance(longitude, bool):
            raise ValueError("Invalid coordinates")
        if not all(isinstance(v, (int, float)) and isfinite(v)
                   for v in (latitude, longitude)):
            raise ValueError("Invalid coordinates")
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError("Invalid coordinates")
        instant = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        record = self.provider(float(latitude), float(longitude))
        if not isinstance(record, Mapping) or not record.get("source"):
            raise ValueError("Weather provider did not return a named source")
        observed = _timestamp(record.get("observed_at"))
        if observed > instant + timedelta(minutes=5) or instant - observed > self.max_age:
            raise ValueError("Weather data is stale or in the future")
        temperature = _reading(record.get("temperature_c"), "temperature", -100, 70)
        wind = _reading(record.get("wind_kmh"), "wind", 0, 500)
        rain = _reading(record.get("rain_24h_mm"), "rainfall", 0, 2000)
        flags: list[str] = []
        if temperature is not None and temperature >= 40:
            flags.append("HEAT_SCREENING")
        if wind is not None and wind >= 60:
            flags.append("WIND_SCREENING")
        if rain is not None and rain >= 50:
            flags.append("HEAVY_RAIN_SCREENING")
        # Caller may only pass official alerts when provenance is supplied.
        official = record.get("official_alerts", [])
        if not isinstance(official, list) or not all(
                isinstance(item, str) and item.strip() for item in official):
            raise ValueError("official_alerts must be a list of alert labels")
        if official and not record.get("official_alert_source"):
            raise ValueError("Official alerts require a source reference")
        return WeatherResult(float(latitude), float(longitude), observed,
                             str(record["source"]), temperature, wind, rain,
                             tuple(flags), tuple(official))
