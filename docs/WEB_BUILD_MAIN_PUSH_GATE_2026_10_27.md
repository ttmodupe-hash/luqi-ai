# Exact-main Web Build gate — 27 October 2026

## Scope
The canonical LUQI production application is Railway project `kind-spontaneity` / `production` / `web`, backed by MySQL. This change closes one **code-level release-check gap**: `.github/workflows/web-build.yml` previously checked pull requests but did not run the complete production-equivalent job on each push to `main`. It now runs for both events; checkout does not persist a GitHub credential, and its permissions remain `contents: read`.

`.github/workflows/launch-safety.yml` validates the exact trigger, full job presence, read-only checkout and the test's own wiring with an offline Node test. The full Web Build still performs package installation, static checks, unit/desktop/mobile synthetic tests, hosted-checkout fail-closed fixtures, production build and local health checks without taking customer payments or invoking paid AI.

## Important limitations
- **A workflow is not an enforced deployment gate.** Railway's correct service last reported `source.checkSuites: false` (Wait for CI OFF). GitHub branch protection/required checks and real reviewer controls still need authorized setup and a separate read-back acceptance.
- Other Railway projects attach failed **deployment statuses** to the same GitHub commit. Railway's [Wait for CI documentation](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci) explicitly says it evaluates GitHub **Actions check suites** and ignores statuses from other GitHub apps. These stale integrations should be reviewed to reduce failed builds/noise, but their statuses are **not by themselves a Wait-for-CI blocker**. When enabled, any failed GitHub Actions workflow skips deployment; incomplete workflows time out after two hours. Review GitHub App permission updates and workflow behavior before changing the production setting.
- Successful CI checks are not real user acceptance, merchant activation, money collection, provider-cost reconciliation, security incident resolution, or a production-derived restore drill.
- The code and checks in the older unmerged PR #265 include additional release-control work; review or reconcile that PR before a later merge to avoid replacing this current branch's controls with stale workflow content.

## Acceptance sequence
1. Confirm this PR's exact-head offline check and all relevant existing CI jobs complete successfully.
2. Merge only after review; observe the new `push`-triggered Web Build on the merged SHA and its final result. Historical PR green checks do not count as that run.
3. Verify the correct Railway web deployment reaches terminal SUCCESS, matches GitHub `main`, and passes current public release, TLS and health observation. A completed GitHub job alone does not prove service health.
4. Review GitHub branch protection/required checks, stale Railway integrations and Wait for CI as **separate, authorized** production-control work. Observe consequences carefully before changing any settings.
5. Preserve the closed merchant checkout, separate operator acceptance, and USD100/month AI budget (Gemini USD60 / OpenAI USD40).

Continues [launch tracker #202](https://github.com/ttmodupe-hash/luqi-ai/issues/202). No merchant credentials, real account data, database state, DNS, payments, provider spending or production configuration are modified by this pull request.
