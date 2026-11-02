from datetime import date
from decimal import Decimal

import pytest

from omega_ai.vehicle_manager import Vehicle, VehicleManager


def sample():
    return Vehicle("FLEET-001", 20500, 11000, date(2025, 10, 1),
                   interval_km=10000, interval_days=365)


def test_service_due_by_odometer_or_calendar():
    manager = VehicleManager()
    manager.add(sample())
    assert manager.status("FLEET-001", today=date(2026, 10, 22)).needs_service
    manager.record_odometer("FLEET-001", 21500)
    status = manager.status("FLEET-001", today=date(2026, 1, 1))
    assert status.overdue_by_km
    assert not status.overdue_by_date


def test_monotonic_odometer_and_atomic_service():
    manager = VehicleManager()
    manager.add(sample())
    with pytest.raises(ValueError):
        manager.record_odometer("FLEET-001", 20000)
    with pytest.raises(ValueError):
        manager.record_service("FLEET-001", when=date(2024, 1, 1), odometer_km=30000)
    assert manager.get("FLEET-001").odometer_km == 20500
    manager.record_service("FLEET-001", when=date(2026, 10, 22), odometer_km=21000)
    assert not manager.status("FLEET-001", today=date(2026, 10, 23)).needs_service


def test_duplicate_ids_and_quoted_price():
    manager = VehicleManager()
    manager.add(sample())
    with pytest.raises(ValueError):
        manager.add(sample())
    assert manager.service_cost_forecast("FLEET-001", Decimal("1200.40"), 2) == Decimal("2400.80")
