# Omega Six — integrated offline domain cores

These six Python modules are available as importable, deterministic domain
adapters. They are **not** yet user-facing LUQI web features, connected data
feeds, or continuously running agents. This avoids fabricated live outputs.

| Module | Actual capability | Must still be integrated |
|---|---|---|
| `omega_ai.workflow_engine` | Task states, explicit handler registration, authenticated-host approval callback, bounded non-financial retries, idempotency key for side effects, audit metadata | Persistent queue, worker leases, operator authentication, monitoring, reconciliation before side effects |
| `omega_ai.weather_africa` | Validate time-stamped injected weather readings and derive screening flags | Authoritative African weather-service feeds and verified alerts |
| `omega_ai.travel_africa` | Ordered travel dates, money budgeting with explicit FX rates, sourced and age-checked visa evidence | Official visas/entry rules, live FX and routing sources |
| `omega_ai.university_guide` | Search verified-timestamp programme records; identify **potential** scholarships | Verified university records, deadlines, accreditation, eligibility confirmation |
| `omega_ai.vehicle_manager` | Local odometer/service-date schedule and quoted maintenance projections | Authenticated user ownership, encrypted persistent vehicle history |
| `omega_ai.water_sanitation` | Sourced-threshold laboratory screening with missing-data warnings | Local jurisdiction rules, qualified lab ingestion and human review |

## Safe demonstration

```python
from datetime import date
from omega_ai.vehicle_manager import Vehicle, VehicleManager

fleet = VehicleManager()
fleet.add(Vehicle(
    asset_id="FLEET-001", odometer_km=24500,
    last_service_km=16000, last_service_date=date(2026, 1, 1)
))
report = fleet.status("FLEET-001", today=date(2026, 10, 22))
print(report.needs_service)
```

## Security and release requirements

- The Python Workflow Engine stores task data **only in process memory**.
  It does **not** schedule unattended workers, execute shell code, open
  provider accounts, transfer money, deploy releases, or self-modify source.
- Side-effect handlers demand an idempotency key and authenticated-host
  approval. If a side-effect handler throws after a possible remote action,
  it is NOT retried automatically; manual reconciliation is required.
- None of the other five adapters invents current authoritative data.
  Providers must be injected with valid citations, timestamps and bounds.
  Passing a water screening test does **not** mean a sample is potable.
- No credentials, API keys, production routes or billable provider calls
  are added by these source modules.
- Tests: `python -m pytest -q tests/test_omega_*.py`.
  The existing Python 3.10/3.11/3.12 GitHub matrix also runs these tests.
- Before exposing these modules to users: implement versioned, authenticated
  APIs; actual provider adapters; failure and observability contracts;
  database-backed retention/locking; per-account quotas; human evaluations.
  Gate production rollout on the requirements in GitHub issue #133.

## Relationship to older Omega pull requests

This consolidated source PR supersedes the separate *domain-core implementation*
changes in #127–#132. Each original PR remains useful for reviewing that
adapter's design and tests; neither the old PRs nor this integration establish
live service connectivity.
