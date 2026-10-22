"""Privacy-respecting vehicle maintenance planning (not mechanical diagnostics).

Only internal fleet asset IDs are accepted. Odometer readings must increase.
A service can be due by elapsed days OR travelled kilometres.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, timedelta
from decimal import Decimal
import re


@dataclass(frozen=True)
class Vehicle:
    asset_id: str
    odometer_km: int
    last_service_km: int
    last_service_date: date
    interval_km: int = 10000
    interval_days: int = 365
    make: str = ""
    model: str = ""


@dataclass(frozen=True)
class MaintenanceReport:
    asset_id: str
    km_remaining: int
    service_due_date: date
    overdue_by_km: bool
    overdue_by_date: bool
    needs_service: bool
    notice: str = "Scheduling aid only; follow manufacturer instructions and a mechanic's advice."


class VehicleManager:
    def __init__(self) -> None:
        self._fleet: dict[str, Vehicle] = {}
        self._history: dict[str, list[tuple[date, int, str]]] = {}

    def add(self, vehicle: Vehicle) -> None:
        if not re.fullmatch(r"[A-Za-z0-9_-]{3,48}", vehicle.asset_id):
            raise ValueError("Use an internal asset ID, not a personal identifier")
        if vehicle.asset_id in self._fleet:
            raise ValueError("Duplicate asset ID")
        if not all(isinstance(n, int) and not isinstance(n, bool) for n in
                   (vehicle.odometer_km, vehicle.last_service_km,
                    vehicle.interval_km, vehicle.interval_days)):
            raise ValueError("Kilometres and service intervals must be integers")
        if (vehicle.odometer_km < vehicle.last_service_km or
                vehicle.last_service_km < 0 or vehicle.interval_km <= 0 or
                vehicle.interval_days <= 0):
            raise ValueError("Invalid odometer or maintenance interval")
        self._fleet[vehicle.asset_id] = vehicle
        self._history[vehicle.asset_id] = []

    def get(self, asset_id: str) -> Vehicle:
        return self._fleet[asset_id]

    def record_odometer(self, asset_id: str, reading_km: int) -> Vehicle:
        current = self._fleet[asset_id]
        if isinstance(reading_km, bool) or not isinstance(reading_km, int) or (
                reading_km < current.odometer_km):
            raise ValueError("Odometer cannot decrease or be invalid")
        updated = replace(current, odometer_km=reading_km)
        self._fleet[asset_id] = updated
        return updated

    def record_service(self, asset_id: str, *, when: date,
                       odometer_km: int, description: str = "") -> Vehicle:
        current = self._fleet[asset_id]
        if when < current.last_service_date:
            raise ValueError("Service cannot precede previous service")
        if (isinstance(odometer_km, bool) or not isinstance(odometer_km, int)
                or odometer_km < current.odometer_km):
            raise ValueError("Odometer cannot decrease or be invalid")
        updated = replace(current, odometer_km=odometer_km,
                          last_service_km=odometer_km, last_service_date=when)
        self._fleet[asset_id] = updated
        self._history[asset_id].append((when, odometer_km, description[:200]))
        return updated

    def status(self, asset_id: str, *, today: date | None = None) -> MaintenanceReport:
        current = self._fleet[asset_id]
        day = today or date.today()
        next_service = current.last_service_date + timedelta(days=current.interval_days)
        remaining = current.last_service_km + current.interval_km - current.odometer_km
        by_km = remaining <= 0
        by_date = day >= next_service
        return MaintenanceReport(asset_id, remaining, next_service,
                                 by_km, by_date, by_km or by_date)

    def service_cost_forecast(self, asset_id: str, price_per_service: Decimal,
                              upcoming_services: int = 1) -> Decimal:
        self._fleet[asset_id]
        price = Decimal(str(price_per_service))
        if not price.is_finite() or price < 0 or not 1 <= upcoming_services <= 24:
            raise ValueError("Supply a valid nonnegative service quote and count")
        return (price * upcoming_services).quantize(Decimal("0.01"))
