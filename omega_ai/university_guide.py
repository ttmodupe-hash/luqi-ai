"""Evidence-driven university and scholarship discovery.

No curated catalog, admission outcome, accreditation status or tuition amount
is invented. A trusted host supplies catalog records with source timestamps.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable


@dataclass(frozen=True)
class Programme:
    institution: str
    country: str
    title: str
    subject: str
    qualification: str
    source_url: str
    checked_at: datetime
    tuition: str | None = None
    deadline: datetime | None = None


@dataclass(frozen=True)
class Scholarship:
    name: str
    countries: tuple[str, ...]
    qualifications: tuple[str, ...]
    subjects: tuple[str, ...]
    source_url: str
    checked_at: datetime


@dataclass(frozen=True)
class ScholarshipMatch:
    scholarship: Scholarship
    status: str = "potential_match_only"
    note: str = "An application and independent eligibility review are still required."


def _verified(record: Programme | Scholarship, now: datetime,
              max_age: timedelta) -> bool:
    return bool(record.source_url and record.source_url.startswith("https://")
                and record.checked_at.tzinfo is not None
                and record.checked_at <= now
                and now - record.checked_at <= max_age)


class UniversityGuide:
    def __init__(self, programmes: Iterable[Programme] = (),
                 scholarships: Iterable[Scholarship] = (),
                 *, max_age: timedelta = timedelta(days=180)):
        if max_age.total_seconds() <= 0:
            raise ValueError("max_age must be positive")
        self.programmes = tuple(programmes)
        self.scholarships = tuple(scholarships)
        self.max_age = max_age

    def search(self, *, country: str | None = None, subject: str | None = None,
               qualification: str | None = None,
               now: datetime | None = None) -> list[Programme]:
        instant = now or datetime.now(timezone.utc)
        if instant.tzinfo is None:
            raise ValueError("Time must include timezone")
        return [p for p in self.programmes
                if _verified(p, instant, self.max_age)
                and (not country or p.country.casefold() == country.casefold())
                and (not subject or subject.casefold() in p.subject.casefold())
                and (not qualification or p.qualification.casefold() ==
                     qualification.casefold())]

    def match_scholarships(self, *, country: str, qualification: str, subject: str,
                           now: datetime | None = None) -> list[ScholarshipMatch]:
        instant = now or datetime.now(timezone.utc)
        def matches(needle: str, values: tuple[str, ...]) -> bool:
            return not values or needle.casefold() in (v.casefold() for v in values)
        return [ScholarshipMatch(s) for s in self.scholarships
                if _verified(s, instant, self.max_age)
                and matches(country, s.countries)
                and matches(qualification, s.qualifications)
                and matches(subject, s.subjects)]
