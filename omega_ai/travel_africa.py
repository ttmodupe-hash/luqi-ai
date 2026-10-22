"""Travel Africa: deterministic itinerary budgeting and sourced visa guidance.

This package never fetches live visa, border, currency or route data by itself.
Hosts must supply verified, recently checked evidence for changing rules.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Mapping
import re


@dataclass(frozen=True)
class TravelLeg:
    destination: str
    arrival: date
    departure: date


@dataclass(frozen=True)
class BudgetItem:
    description: str
    amount: Decimal
    currency: str


@dataclass(frozen=True)
class VisaGuidance:
    nationality: str
    destination: str
    requirement: str
    source_url: str | None
    checked_at: datetime | None
    note: str = "Confirm requirements with the destination's official authority before travel."


def _currency(value: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Z]{3}", value):
        raise ValueError("Use a three-letter uppercase currency code")
    return value


def _positive(value: Any) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (ValueError, InvalidOperation) as exc:
        raise ValueError("Invalid monetary amount") from exc
    if not amount.is_finite() or amount < 0:
        raise ValueError("Amounts must be finite and nonnegative")
    return amount


class TravelAfrica:
    def __init__(self, visa_provider: Callable[[str, str], Mapping[str, Any]] | None = None):
        self.visa_provider = visa_provider

    def itinerary(self, legs: list[TravelLeg]) -> list[TravelLeg]:
        if not legs:
            raise ValueError("Provide at least one itinerary leg")
        previous_departure: date | None = None
        for leg in legs:
            if not leg.destination.strip() or leg.arrival > leg.departure:
                raise ValueError("Invalid stop or date range")
            if previous_departure is not None and leg.arrival < previous_departure:
                raise ValueError("Travel legs must be chronologically ordered")
            previous_departure = leg.departure
        return list(legs)

    def budget(self, items: list[BudgetItem], target_currency: str,
               rates: Mapping[tuple[str, str], Decimal] | None = None) -> Decimal:
        """Convert using only caller-supplied rates; never claim live FX."""
        target = _currency(target_currency)
        total = Decimal("0")
        for item in items:
            currency = _currency(item.currency)
            amount = _positive(item.amount)
            if currency != target:
                key = (currency, target)
                if rates is None or key not in rates:
                    raise ValueError(f"FX conversion {currency}/{target} requires supplied rate")
                rate = _positive(rates[key])
                if rate == 0:
                    raise ValueError("FX rate cannot be zero")
                amount *= rate
            total += amount
        return total.quantize(Decimal("0.01"))

    def visa_guidance(self, nationality: str, destination: str,
                      *, now: datetime | None = None,
                      max_age: timedelta = timedelta(days=30)) -> VisaGuidance:
        if not nationality.strip() or not destination.strip():
            raise ValueError("Nationality and destination are required")
        unknown = VisaGuidance(nationality, destination, "unknown", None, None)
        if self.visa_provider is None:
            return unknown
        record = self.visa_provider(nationality, destination)
        if not isinstance(record, Mapping) or not record.get("source_url"):
            return unknown
        checked_at = record.get("checked_at")
        try:
            checked = datetime.fromisoformat(checked_at) if isinstance(checked_at, str) else checked_at
        except (TypeError, ValueError):
            return unknown
        instant = now or datetime.now(timezone.utc)
        if not isinstance(checked, datetime) or checked.tzinfo is None or instant.tzinfo is None:
            return unknown
        if checked > instant or instant - checked > max_age:
            return unknown
        requirement = record.get("requirement")
        if requirement not in ("visa_required", "visa_free", "electronic_authorization",
                               "visa_on_arrival", "unknown"):
            return unknown
        return VisaGuidance(nationality, destination, requirement,
                            str(record["source_url"]), checked)
