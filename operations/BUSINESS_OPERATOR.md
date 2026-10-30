Private one-off Business Connect operator

Derived with esbuild --packages=external from scripts/prepare-business-storage.ts at e968534fa8d38e857cea543fbb9a085df5f4450f. Only the production source binding changes: this single-file function binds the exact project, environment, function service name/ID and reviewed-source marker; functions have no Git deployment identity. SQL, schema digest, grants, safeguards and default read-only mode are unchanged. mysql2 is pinned to 3.24.5. There is no listener/domain/cron and restart policy is NEVER. The create-absent intent must be set separately only after passing checks. No existing identities/roles or customer rows are changed.

The repository-connected helper failed to run its intended image; its logs must never be treated as successful setup evidence. Require the aggregate luqi.business-storage.v1 validated result plus terminal deployment SUCCESS.
