"""Real domain adapters through the task runner using synthetic offline evidence.

These host-side bindings are fixtures, not installed production endpoints.
"""
from datetime import date, datetime, timezone
from decimal import Decimal

from omega_ai.travel_africa import BudgetItem, TravelAfrica
from omega_ai.university_guide import Programme, UniversityGuide
from omega_ai.vehicle_manager import Vehicle, VehicleManager
from omega_ai.water_sanitation import WaterCriteria, WaterSample, WaterSanitation
from omega_ai.weather_africa import WeatherAfrica
from omega_ai.workflow_engine import State, WorkflowEngine

STAMP = datetime(2026, 10, 22, tzinfo=timezone.utc)


def test_five_domain_adapters_execute_through_the_authenticated_workflow_core():
    runner = WorkflowEngine(authorizer=lambda actor, _: actor == "fixture-account")
    weather = WeatherAfrica(lambda *_: {
        "source": "synthetic test observation", "observed_at": STAMP, "temperature_c": 25,
    })
    travel = TravelAfrica()
    guide = UniversityGuide([Programme(
        "Fixture university", "ZA", "Fixture programme", "physics", "degree",
        "https://example.invalid/catalog", STAMP,
    )])
    fleet = VehicleManager()
    fleet.add(Vehicle("asset-001", 1000, 0, date(2026, 10, 1)))
    water = WaterSanitation(WaterCriteria(
        "synthetic jurisdiction", "https://example.invalid/screening", 6.5, 8.5, 5, 0,
    ))
    runner.register("weather.assess", lambda _ctx, p: weather.assess(p["lat"], p["lon"], now=STAMP), side_effects=False)
    runner.register("travel.budget", lambda _ctx, p: travel.budget(
        [BudgetItem("fixture quote", Decimal(p["amount"]), "ZAR")], "ZAR"), side_effects=False)
    runner.register("university.search", lambda _ctx, p: guide.search(subject=p["subject"], now=STAMP), side_effects=False)
    runner.register("vehicle.status", lambda _ctx, p: fleet.status(p["asset_id"], today=STAMP.date()), side_effects=False)
    runner.register("water.screen", lambda _ctx, _: water.assess(
        WaterSample(STAMP, "synthetic lab fixture", ph=7, turbidity_ntu=1, ecoli_cfu_per_100ml=0)), side_effects=False)
    for handler, payload in [
        ("weather.assess", {"lat": -26.2, "lon": 28.0}),
        ("travel.budget", {"amount": "100.25"}),
        ("university.search", {"subject": "physics"}),
        ("vehicle.status", {"asset_id": "asset-001"}),
        ("water.screen", {}),
    ]:
        runner.submit(handler, payload, actor="fixture-account")
    completed = runner.run_due(actor="fixture-account")
    assert len(completed) == 5 and all(task.state == State.COMPLETED for task in completed)
    results = {task.handler: task.result for task in completed}
    assert results["weather.assess"].source == "synthetic test observation"
    assert results["travel.budget"] == Decimal("100.25")
    assert results["university.search"][0].institution == "Fixture university"
    assert results["vehicle.status"].needs_service is False
    assert results["water.screen"].status == "screening_only"
    assert "Do not assume water is potable" in results["water.screen"].advice


def test_trusted_handler_context_selects_owned_domain_data_not_payload_identity():
    fleets = {owner: VehicleManager() for owner in ("owner-a", "owner-b")}
    fleets["owner-a"].add(Vehicle("asset-001", 1000, 0, date(2026, 10, 1)))
    fleets["owner-b"].add(Vehicle("asset-001", 12000, 0, date(2026, 10, 1)))
    runner = WorkflowEngine(authorizer=lambda actor, _: actor in fleets)
    runner.register("vehicle.status", lambda ctx, p: fleets[ctx.owner_id].status(
        p["asset_id"], today=STAMP.date()), side_effects=False)
    outcomes = []
    for owner in fleets:
        task = runner.submit("vehicle.status", {"asset_id": "asset-001", "owner_id": "owner-b"},
                             actor=owner, idempotency_key="same-key")
        outcomes.append(runner.run(task.id, actor=owner).result.needs_service)
    assert outcomes == [False, True]


def test_failed_provider_does_not_become_a_successful_domain_result():
    def unavailable(*_):
        raise TimeoutError("sensitive provider transport detail")
    runner = WorkflowEngine(authorizer=lambda actor, _: actor == "fixture-account")
    weather = WeatherAfrica(unavailable)
    runner.register("weather.assess", lambda _ctx, p: weather.assess(p["lat"], p["lon"], now=STAMP), side_effects=False)
    task = runner.submit("weather.assess", {"lat": -26.2, "lon": 28.0}, actor="fixture-account", max_attempts=1)
    result = runner.run(task.id, actor="fixture-account")
    assert result.state == State.FAILED and result.result is None
    assert result.error == "HANDLER_FAILED" and "sensitive" not in repr(result)
