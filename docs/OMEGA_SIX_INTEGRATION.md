# Omega Six — integrated offline domain cores

These six Python modules are available as importable, deterministic domain
adapters. An opt-in [authenticated queue bridge](OMEGA_WEB_BRIDGE.md) now covers
travel arithmetic and vehicle service scheduling, with a one-task Python worker.
Production intake/workers remain disabled. These are **not** live data feeds or
continuously running agents. This avoids fabricated live outputs.

| Module | Actual capability | Must still be integrated |
|---|---|---|
| `omega_ai.workflow_engine` | Owner-scoped tasks and idempotency, fail-closed host authorization, opt-in MySQL claims/leases/recovery, and an authenticated Node/Python queue bridge for two bounded calculations | Production persistence/worker rollout, remaining domain integration, operator RBAC, monitoring and an authorized reconciliation workflow |
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

- `WorkflowEngine` stores task data **only in process memory**. The opt-in
  `MySQLWorkflowEngine` persists tasks and claims when explicitly configured; see
  [durable worker requirements](OMEGA_DURABLE_WORKERS.md). Neither engine
  schedules unattended workers, executes shell code, opens
  provider accounts, transfers money, deploys releases, or self-modifies source.
- Side-effect handlers demand an idempotency key and authenticated-host
  approval from the authenticated owner. If a side-effect handler throws or
  is interrupted after a possible remote action, its state becomes
  `reconciliation_required`, not success or confirmed failure. It is never
  retried automatically; no automatic resolution/reset operation exists.
- The in-memory workflow lock coordinates one instance. The durable engine uses
  InnoDB row locks, expiring claims and token checks across processes; expired
  side effects require reconciliation. Running work cannot be force-cancelled;
  cancellation applies only before a claim.
- None of the other five adapters invents current authoritative data.
  Providers must be injected with valid citations, timestamps and bounds.
  Passing a water screening test does **not** mean a sample is potable.
- No credentials, API keys, production routes or billable provider calls
  are added by these source modules.
- Tests: `python -m pytest -q tests/test_omega_*.py`.
  The existing Python 3.10/3.11/3.12 GitHub matrix also runs these tests.
- Before exposing these modules to users: implement versioned, authenticated
  APIs; actual provider adapters; failure and observability contracts;
  production retention/encryption and deployment controls; per-account quotas; human evaluations.
  Gate production rollout on the requirements in GitHub issue #133.

## Workflow host integration contract

Both workflow APIs require an explicit `actor` on submit, get, run, run_due,
approve and cancel. `WorkflowEngine()` without an `authorizer` denies all such
operations. The host callback `authorizer(actor, action)` must verify that actor
against the current authenticated request/session and return literal `True`.
A request field, hardcoded account allowlist or truthy callback result is not
proof of identity. Policy errors fail closed without exposing their details.

Tasks are owned by that authenticated actor. Missing and other-owner task IDs
produce the same `KeyError("Task not found")`; batches only consider the owner's
tasks. Idempotency keys are scoped to the owner and cannot be reused with a
changed handler, payload or retry policy. Separate accounts may use the same key.
Only the owner may approve a task, and a separate human-authorization callback
must verify the approval. Delegated operator review is still unimplemented.

Registered handlers now have the signature `handler(context, payload)`, where
`context` is a frozen `TaskContext` containing the trusted owner ID, task ID,
idempotency key and attempt number. Its identity comes from the stored task,
never a payload's claimed owner field. Handlers must use this context to enforce
ownership of any domain resources they access (such as vehicles); workflow
ownership alone is not a substitute for domain authorization. Registration is
trusted host configuration, not a user-controlled API or a code sandbox.

Policy callbacks and handlers execute outside the shared task lock or database transaction. State is
checked again after approval authorization, so a concurrent cancellation cannot
be undone by a stale approval. Claim and attempt increment happen together;
other tasks can run while one handler blocks. Batches skip already-claimed or
cancelled work. Returned task snapshots and handler payloads are detached copies.

Ordinary read-only failures use bounded backoff. Interruptions are recorded as
terminal outcomes and re-raised; potentially external side effects require
reconciliation. Error fields contain fixed codes, and audit entries contain
transition metadata rather than payloads or exception messages.

Tests cover two-account isolation, default-deny and malformed authorization,
revoked access, simultaneous submissions/runners/batches, approval/cancellation
races, interruption, retry bounds and ambiguous outcomes. These are offline
synthetic tests. Integration fixtures also run all five domain adapters through
the workflow engine, verify owner-specific vehicle selection and preserve
provider failure without invented results. They do not establish live
authenticated Omega access, exactly-once remote effects or self-healing/self-improvement.
The separate MySQL CI fixture verifies durable state, independent worker claims
and recovery after process death; production rollout remains gated by
[the durable worker contract](OMEGA_DURABLE_WORKERS.md).

## Relationship to older Omega pull requests

This consolidated source PR supersedes the separate *domain-core implementation*
changes in #127–#132. Each original PR remains useful for reviewing that
adapter's design and tests; neither the old PRs nor this integration establish
live service connectivity.
