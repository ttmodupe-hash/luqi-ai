# Authenticated Omega queue bridge

The Node API and Python worker now share the versioned MySQL task store. This
adds a tested integration path, not an activated production agent service.
Both intake and worker execution default to disabled. No migration, new service,
provider request, billing activation or background loop is introduced automatically.
The task dashboard is documented in [OMEGA_TASK_DASHBOARD.md](OMEGA_TASK_DASHBOARD.md).

## Supported calculations

Only `travel.budget` and `vehicle.schedule`, both version `web-v1`, are exposed.
They call the existing Python domain adapters with bounded numeric/date inputs.
Travel adds same-currency decimal amounts; it does not fetch prices, FX or visas.
Vehicle calculates service timing from supplied readings and dates; it does not
access a vehicle registry or diagnose mechanical faults. Results explicitly say
`basis: user_supplied`. Weather, university and water providers remain separate
integration work; this release does not make all six Omega modules live.

Inputs cannot contain owner IDs, personal text, registration plates, URLs,
provider names, scripts, arbitrary handler names, approval or retry policies.
The shared JSON fixtures are validated independently in TypeScript and Python;
real MySQL CI checks Node-created tasks and Python-created results in both directions.

## Web API

All routes under `/api/v1/omega/tasks` first authenticate the existing Bearer JWT
and check the active persistent account and credential version. They return
`Cache-Control: no-store`; revoked, deleted or disabled accounts cannot read or
submit through the API. Owner identity is derived from the verified numeric
account ID as `luqi-user:<id>`, never from client data.

| Method / path | Behavior |
|---|---|
| `GET /status` | Disabled status by default; when enabled, probes task storage and reports `operator_run_only`, `workerVerified: false` |
| `POST /` | Submit an allowed calculation with mandatory `idempotencyKey`; 201 for new tasks, 200 for an identical replay |
| `GET /` | Owner-only list, default 20 and maximum 100; opaque UUID `before` cursor, ordered by UUID rather than creation time |
| `GET /:id` | Owner-only task state/result; missing and other-owner tasks both return 404 |
| `POST /:id/cancel` | Requires `{ "confirm": true }`; only pending/retry-wait tasks may be cancelled |

There are no public run, approval, recovery, administration, deletion or handler
registration endpoints. DTOs omit owner IDs, idempotency keys, audit actors and
lease tokens. Inputs are limited to 16 KiB, with strict field and domain bounds.
The queue has a fixed cap of **100 stored tasks per account**, including completed
and cancelled tasks. Intake locks the persistent user row and checks count in
the same transaction so replicas cannot race past that cap. Existing key replays
still work at the cap. No periodic quota reset or automatic deletion exists.
Retention and account-erasure rules must be completed before broad rollout.

The `LUQI_OMEGA_WEB_ENABLED=true` setting is a deliberate intake opt-in. It does
not claim a worker is connected. Storage failure or a missing migration returns
503 with a fixed code and never falls back to process memory or automatic DDL.
An uncertain commit response is not proof the submission failed: retry the same
idempotency key and unchanged payload to inspect/recover the existing task.

## Explicit worker execution

The bounded command is `python -m omega_ai.web_worker --task-id <task-uuid>`.
It needs a separately configured `LUQI_OMEGA_WORKER_ENABLED=true` and dedicated
`LUQI_OMEGA_DATABASE_URL`. It deliberately ignores general `DATABASE_URL`.
Do not place credentials in arguments. Public DB hosts require
`LUQI_OMEGA_MYSQL_CA` and verified TLS; unencrypted transport is limited to
loopback or Railway's private DNS. Use restricted DB credentials and review the
actual network/storage protection before production use.

The service's delegated execution policy permits only one existing task from
the two persisted read-only handler contracts. It joins the task owner to an
active user, checks its handler/version/effects, retry policy, key and payload,
then rechecks authority before the claim. It accepts no owner argument or broad
client-supplied grant. The worker uses the existing transaction/lease mechanism
and emits only task ID, state and fixed error codes. Credentials, task input and
results are never printed by this command.

This is service-level authority via the operator's restricted database account,
not a user login or a general admin role. The worker needs SELECT on the task
table and `users.id`/`users.is_active`, plus UPDATE on task execution state,
document and lease fields; it needs no task INSERT, DELETE, DDL or password access.
The web runtime retains its existing permissions. Role provisioning has not
been performed by this source change.

Account deactivation/deletion prevents a subsequent worker claim. A password
reset revokes new web requests; it does not revoke already accepted read-only
tasks. Cancellation must happen before execution. A claim already executing
cannot be forcibly cancelled. The command exits after one task and does not
automatically recover expired claims, scan other owners, poll, retry or launch
provider calls. Expired claims still require the reviewed recovery path described
in [the durable worker contract](OMEGA_DURABLE_WORKERS.md).

## Rollout, verification and rollback

The existing migration remains explicit and additive. The web image stays Node
only; no Python service is provisioned or deployed automatically. Keep intake off
until the migration, dedicated credentials, worker operating procedure, monitoring,
backup/restore, retention/erasure and designated-account acceptance checks are
ready. Paid AI and billing remain independently disabled. None of these tests
proves production backup recoverability or live provider quality.

`.github/workflows/omega-mysql.yml` runs real MySQL 8.4 with synthetic accounts.
Tests refuse execution unless both CI opt-in and the exact loopback fixture URL
match. The suite exercises real JWT/account checks, owner isolation, concurrent
idempotency and quota boundaries, cancellation, process competition, Python
results read by Node, changed contracts, disabled/deleted accounts, revoked login
tokens, failed-write rollback and missing schema without fallback. Its destructive
fixture operations never target Railway or read production credentials.
The normal web CI also probes mounted HTTP routes for unauthenticated rejection.

For a future activated rollout, stop intake and new worker invocations before
rollback. Preserve `omega_tasks_v1` and its records; do not rewrite running work
to pending or reinterpret stored handler versions. The API/worker code can be
rolled back without dropping tables or altering existing user data.
