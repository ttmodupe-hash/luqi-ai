# Read-only opt-in Omega role verification — 25 October 2026

## Problem
The existing locked-down `luqi_web_runtime` has eight core table grant sets.
The operator CLI's exact-grant audit rejected every `LUQI_OMEGA_WEB_ENABLED=true`
invocation, even if an authorized operator independently applied the reviewed
Omega migration and task-table permissions. That left a gap in verifying the
optional ninth grant without weakening least-privilege checks.

## Repair
The **read-only** `--check` path may now verify the already-provisioned fixed
Omega grant: `SELECT, INSERT, UPDATE, DELETE` on `omega_tasks_v1` only, alongside
all eight original core table sets. It rejects missing/extra permissions,
unexpected roles, invalid schema or storage and unsafe connection settings.
The `--provision-new` path remains prohibited with Omega enabled and cannot
change any pre-existing user.

No schema migration, GRANT, REVOKE, database password access change or process
reconfiguration is performed by this code release. No production table, web
variable, worker, provider inference, payment or customer data is touched.
The operator still must privately inventory and approve the changes in an
isolated target before any production rollout, including backup recovery,
proper worker identity without DELETE, TTL/erasure and real-user acceptance.

## Evidence
The disposable MySQL 8.4 CI fixture provisions a synthetic ninth grant using a
throwaway root account, confirms the isolated read-only role check accepts the
exact contract, proves provision-new refuses when Omega is enabled, and confirms
a core-only check still rejects surplus Omega access. The normal production
service remains on `LUQI_OMEGA_WEB_ENABLED=false`. See #133/#202 for remaining
operational and commercial launch requirements.
