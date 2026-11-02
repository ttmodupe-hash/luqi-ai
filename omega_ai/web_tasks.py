"""Versioned, non-billable web adapters. Inputs are numbers/dates, not PII.

Matches api/services/omegaTaskContract.ts. Cross-language CI submits through the
real authenticated Node API, executes here and reads the persisted result back.
"""
from dataclasses import asdict
from datetime import date
from decimal import Decimal
import re

from .travel_africa import BudgetItem, TravelAfrica
from .vehicle_manager import Vehicle, VehicleManager

VERSION = "web-v1"
HANDLERS = ("travel.budget", "vehicle.schedule")


def _keys(payload, keys):
    if type(payload) is not dict or set(payload) != set(keys):
        raise ValueError("Invalid web task fields")


def _date(value):
    if not isinstance(value, str) or not re.fullmatch(r"(?:19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Invalid calendar date")
    return date.fromisoformat(value)


def validate_payload(handler, payload):
    if handler == "travel.budget":
        _keys(payload, ("currency", "amounts"))
        if not isinstance(payload["currency"], str) or not re.fullmatch(r"[A-Z]{3}", payload["currency"]):
            raise ValueError("Invalid currency")
        amounts = payload["amounts"]
        if type(amounts) is not list or not 1 <= len(amounts) <= 50 or any(
            not isinstance(amount, str) or not re.fullmatch(r"(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?", amount)
            for amount in amounts
        ):
            raise ValueError("Invalid amounts")
    elif handler == "vehicle.schedule":
        _keys(payload, ("odometerKm", "lastServiceKm", "lastServiceDate", "today", "intervalKm", "intervalDays"))
        for key, minimum, maximum in (("odometerKm", 0, 10_000_000), ("lastServiceKm", 0, 10_000_000),
                                      ("intervalKm", 1, 1_000_000), ("intervalDays", 1, 3650)):
            if type(payload[key]) is not int or not minimum <= payload[key] <= maximum:
                raise ValueError("Invalid service interval or distance")
        if (payload["lastServiceKm"] > payload["odometerKm"] or
                _date(payload["lastServiceDate"]) > _date(payload["today"])):
            raise ValueError("Invalid service history")
    else:
        raise ValueError("Web handler not allowed")
    return payload


def budget_handler(context, payload):
    p = validate_payload("travel.budget", payload)
    total = TravelAfrica().budget([BudgetItem("", Decimal(value), p["currency"])
                                   for value in p["amounts"]], p["currency"])
    return {"total": str(total), "currency": p["currency"], "basis": "user_supplied",
            "notice": "Arithmetic from supplied amounts; no live prices or FX rates."}


def schedule_handler(context, payload):
    p = validate_payload("vehicle.schedule", payload)
    # Fresh calculator per task, with no shared vehicle records or account lookup.
    # Its input cannot contain an asset ID, another owner or a registration plate.
    fleet = VehicleManager()
    fleet.add(Vehicle("CALC", p["odometerKm"], p["lastServiceKm"], _date(p["lastServiceDate"]),
                      p["intervalKm"], p["intervalDays"]))
    report = asdict(fleet.status("CALC", today=_date(p["today"])))
    return {"kmRemaining": report["km_remaining"], "serviceDueDate": report["service_due_date"].isoformat(),
            "overdueByKm": report["overdue_by_km"], "overdueByDate": report["overdue_by_date"],
            "needsService": report["needs_service"], "basis": "user_supplied", "notice": report["notice"]}


def register_web_handlers(engine):
    engine.register("travel.budget", budget_handler, side_effects=False, version=VERSION)
    engine.register("vehicle.schedule", schedule_handler, side_effects=False, version=VERSION)
