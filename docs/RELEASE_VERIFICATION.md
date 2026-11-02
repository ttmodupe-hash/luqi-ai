# Observe the deployment before reporting a release

A green public probe from a pull request can describe the already-running
version rather than the proposed release. The public release workflow now
performs offline syntax checks on pull requests, then runs live observation
after a push to main or a manual dispatch. It cannot deploy, restart, rotate
credentials, create accounts, enable providers or alter database records.

GET `/v1/release` returns only `luqi.release.v1` and the full lowercase 40-digit
source commit supplied by `RAILWAY_GIT_COMMIT_SHA`. Missing/malformed metadata
returns 503; caller query fields are refused. All responses are no-store and
the existing service workers exclude the entire v1 namespace. No environment
dump, author identity, deployment ID, credentials or private flags are exposed.

The observer waits up to five minutes for the fixed LUQI Railway origin to
report the exact expected commit, with bounded response bytes, per-request
timeouts, no cookies/authentication, no redirects and no caller-selected URL.
It then runs the existing 23 safety probes, and checks the revision again.
Read-only identity polling is safe to repeat; the probe's anonymous AI POST
must be denied before any provider spending. No authenticated inference or
provider credential is part of this workflow.

The main workflow supplies its own GitHub commit as the expected revision.
Newer main runs cancel superseded observers. A pull-request check alone is
never counted as live deployment evidence. Final operator acceptance also
requires Railway's terminal SUCCESS, expected MySQL identity/availability,
disabled or explicitly approved provider state, preserved data and the other
gates in issue #144.

This is operational metadata, not cryptographic build attestation, a paid-AI
success, complete incident clearance or proof that every replica/rollback is
safe. A rollback to an older commit intentionally fails a current-main check;
verify an intentional rollback separately and never restore exposed secrets.
CLI/image deployments without GitHub metadata cannot claim a source identity.
Automated verification failure does not trigger a rollback or paid retry.

Local operator use, only against the fixed intended public origin:

```sh
LUQI_VERIFY_PUBLIC=true LUQI_EXPECTED_COMMIT=REPLACE_WITH_FULL_REVIEWED_SHA node scripts/verify-deployed-release.mjs
```

Primary Railway variable reference:
https://docs.railway.com/variables/reference
