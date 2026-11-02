# Public release verification

The GitHub Actions workflow "LUQI Public Release Checks" runs
scripts/verify-public-release.mjs against the fixed public Railway origin.
It runs when its script/workflow changes in a pull request and can be started
manually from Actions after a deployment. A PR run checks the currently deployed
release, not the unmerged branch; always correlate the result with Railway's
reported deployed commit and the bundle filename printed by the job.

The probe requires LUQI_VERIFY_PUBLIC=true. It accepts no URL, token, account
or arbitrary path input. All network requests are unauthenticated GETs, at most
three in parallel, with bounded response bodies and 15-second timeouts. It
makes no account, inference, payment, queue, database or infrastructure write
and performs no automatic retry. Unexpected responses fail the job without
printing response bodies or driver diagnostics.

Checks cover health, MySQL readiness with AI disabled, anonymous private
notes/export/Omega denial, retired payment/approval/job/USSD surfaces, tRPC
boundaries, the published reviewed-Omega/companion bundle and service-worker
readiness-cache exclusions. A successful readiness response here is 503:
the runtime/database are up while the separately gated AI pilot stays disabled.

This is an operational smoke check. It does not verify human-account sign-in,
owned-account write/export acceptance, worker execution, provider entitlements,
production-derived restoration, historic credential rotation or a full audit.
The normal CI suites and real-MySQL fixtures remain required before merging.

If a public probe fails, inspect Railway status and deployment logs without
exposing secrets. Do not enable providers/billing or reopen a retired endpoint
to turn the check green. Confirm the deployed revision before rolling back,
preserve database tables/volumes/backups, and do not restore older unsafe
authentication/payment handlers. These read-only probes cannot approve or
perform a rollback, restore or activation.
