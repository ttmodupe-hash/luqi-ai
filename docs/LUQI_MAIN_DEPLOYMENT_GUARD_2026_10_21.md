# LUQI production deployment containment — draft, no merge

## Why this is a release blocker

The current default branch has TWO sources of auto-deploy risk:
- `.github/workflows/deploy.yml` triggers on pushes to `main` and invokes Cloud Run deployment with `--clear-env-vars` and inline secret values.
- `cloudbuild.yaml` invokes `gcloud run deploy`, sets public access and sends 100% traffic to latest. Existing external Cloud Build triggers are **unknown**; this repository change cannot disable triggers in the Google Cloud Console.

This focused draft disables the GitHub workflow auto-deploy and changes Cloud Build to **build-only**. `scripts/check-release-guard.mjs` asserts those properties; it does NOT prove the absence of other deployment paths.

## Safe activation sequence

1. **Before any merge or `main` push**, identify the actual LUQI GCP project(s) and all Cloud Build repository/webhook triggers, GitHub deployment secrets, other GitHub branches and third-party auto-deploy integrations. Do not confuse the observed Remix project with LUQI production.
2. Disable or pause Cloud Build triggers and any deployment mirrors at the provider UI, or set their service identity to a non-deploying, least-privilege identity. Verify the triggers are paused **before** pushing `main`.
3. Review this focused PR and its no-deployment CI. Verify current DNS, live Cloud Run revision, rollback path, and restoration evidence. Require manual approval for even a security-only merge if it could run existing main automation.
4. Only after triggers are paused should an authorized reviewer merge the guard PR. Confirm GitHub Actions does not deploy, and Cloud Build is build-only. Never run a legacy workflow's previous revision.
5. Leave deployment disabled until a distinct protected staging environment, short-lived OIDC workload identity, immutable images, restricted secret references, startup migration policy, human approval, canary and rollback are independently tested.

## What remains unknown

- The actual LUQI project ID / Cloud Run service / region / active revision.
- Existing provider-side Cloud Build triggers, domain mapping, IAM and GitHub secret state.
- Whether other old branches or external integrations trigger a deploy.
- Whether previously logged secrets need rotation. Never paste private keys into an issue.

No production service, DNS, IAM, secrets or Cloud Build trigger is changed by this PR.
