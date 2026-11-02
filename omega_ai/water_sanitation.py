"""Water and sanitation screening, not a potability certificate.

Regulatory thresholds must be supplied with jurisdiction and provenance.
A passing screening result NEVER establishes that water is safe to drink.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import isfinite


@dataclass(frozen=True)
class WaterSample:
    observed_at: datetime
    source: str
    ph: float | None = None
    turbidity_ntu: float | None = None
    ecoli_cfu_per_100ml: float | None = None


@dataclass(frozen=True)
class WaterCriteria:
    jurisdiction: str
    source_url: str
    ph_min: float
    ph_max: float
    turbidity_max_ntu: float
    ecoli_max_cfu_per_100ml: float


@dataclass(frozen=True)
class WaterAssessment:
    status: str
    observed_at: datetime
    flags: tuple[str, ...]
    missing: tuple[str, ...]
    guideline_source: str
    advice: str = (
        "Screening only. Do not assume water is potable; obtain appropriate "
        "accredited lab and local-authority testing before drinking."
    )


def _valid_optional(value: float | None, lower: float, upper: float,
                    name: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ValueError(f"Invalid {name} reading")
    result = float(value)
    if not isfinite(result) or not lower <= result <= upper:
        raise ValueError(f"{name} reading out of range")
    return result


class WaterSanitation:
    def __init__(self, criteria: WaterCriteria):
        if not criteria.jurisdiction or not criteria.source_url.startswith("https://"):
            raise ValueError("Provide sourced local screening criteria")
        if not 0 <= criteria.ph_min <= criteria.ph_max <= 14:
            raise ValueError("Invalid pH screening criteria")
        if (criteria.turbidity_max_ntu < 0 or
                criteria.ecoli_max_cfu_per_100ml < 0 or not
                all(isfinite(x) for x in (criteria.turbidity_max_ntu,
                                          criteria.ecoli_max_cfu_per_100ml))):
            raise ValueError("Invalid sample limits")
        self.criteria = criteria

    def assess(self, sample: WaterSample) -> WaterAssessment:
        if sample.observed_at.tzinfo is None or not sample.source:
            raise ValueError("Timestamp with timezone and sample source required")
        if sample.observed_at > datetime.now(timezone.utc):
            raise ValueError("Sample timestamp cannot be in the future")
        ph = _valid_optional(sample.ph, 0, 14, "pH")
        turbidity = _valid_optional(sample.turbidity_ntu, 0, 100000, "turbidity")
        ecoli = _valid_optional(sample.ecoli_cfu_per_100ml, 0, 1e9, "E. coli")
        missing = tuple(name for name, value in
                        (("ph", ph), ("turbidity_ntu", turbidity),
                         ("ecoli_cfu_per_100ml", ecoli)) if value is None)
        flags: list[str] = []
        if ph is not None and not self.criteria.ph_min <= ph <= self.criteria.ph_max:
            flags.append("PH_OUTSIDE_SCREENING_RANGE")
        if turbidity is not None and turbidity > self.criteria.turbidity_max_ntu:
            flags.append("TURBIDITY_SCREENING_EXCEEDED")
        if ecoli is not None and ecoli > self.criteria.ecoli_max_cfu_per_100ml:
            flags.append("ECOLI_SCREENING_EXCEEDED")
        return WaterAssessment("screening_only", sample.observed_at, tuple(flags),
                               missing, self.criteria.source_url)
