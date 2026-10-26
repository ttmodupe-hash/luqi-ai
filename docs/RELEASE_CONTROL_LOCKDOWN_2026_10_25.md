# LUQI P0 — lock production releases before merging launch PRs

**Observed 25 October 2026 (SAST): ACTION REQUIRED — NO PRODUCTION CHANGE MADE.**

## What is verified

The authoritative public repo is ttmodupe-hash/luqi-ai and the production Railway project is kind-spontaneity, environment production, service web. The independently read GitHub main SHA and Railway SUCCESS deployment were both 032e60056d92c55e9935c568a61b73f0fbd8c0f0. The web/MySQL services were online with no staged changes.

Two separate, genuine **release-control weaknesses** were read directly using connected app tools:

- GitHub branch API reported main protected:false, and the accessible repository rulesets listing returned zero rulesets. The protected-branch detailed endpoint was not accessible to the installed GitHub integration; don't invent required-review or checks configuration. Passing PR workflows do not stop a contributor with write privileges pushing straight to an unprotected branch.
- Railway production web config.source.checkSuites=false means **Wait for CI is OFF**. The web source is exactly ttmodupe-hash/luqi-ai, branch main. Without the setting, a new commit may deploy before the source checks finish. A successful previous deployment is not proof of safe next-deploy ordering.

The existing WebKit acceptance and Production API Types workflows already trigger on push to main, but the broad **LUQI Web Build** workflow only triggered on PRs. This candidate adds a main push trigger so its exact merged SHA gets validated. It will not run a live provider request or change any customer data; CI still uses synthetic browser/API fixtures.

Official Railway explanation: https://docs.railway.com/deployments/github-autodeploys#wait-for-ci . Railway waits for **GitHub Actions workflow conclusions**, not every job; cancelled/skipped/neutral conclusions have caveats, and outstanding checks time out. At least one push-to-main workflow is required. Railway is not a substitute for enforced GitHub rules.

## Owner-managed controls — **not enabled by this PR**

1. In **GitHub → ttmodupe-hash/luqi-ai → Settings → Rules → Rulesets**, inspect repository permissions and create an **enforced** branch ruleset targeting only main. Require pull requests, block force pushes and deletion, and restrict bypass. Arrange an eligible independent reviewer before requiring approval to avoid locking out the only owner.
2. Require suitable continuously triggered checks, starting with **LUQI Web Build / validate-web**, **LUQI Production API Types / check-production-api**, and **LUQI WebKit Launch Acceptance / verify-webkit-journeys**. Inspect actual check names in your GitHub account. Frontend-parity or MySQL jobs use path filters, so don't blindly make a path-filtered job globally required unless it runs on every PR.
3. Independently verify protected-branch enforcement with a deliberately harmless non-production branch: unapproved direct changes to main should be rejected; a PR must require the chosen review and exact-commit checks. Do not create test failures by pushing bad code into production.
4. After reviewing the new main-push Web Build check and preserving a known-good release/rollback plan, an authorised Railway project administrator can open **production → web → Settings → Source** and enable **Wait for CI**. Confirm the Railway GitHub App's updated permissions are accepted. Check that Railway recognises the GitHub workflows and does not deploy a failing exact SHA. **No toggle is changed by this code.**
5. Check the actual Railway deployment remains the exact intended merged commit. Preserve audit evidence of GitHub/Railway owners, rollout times, required checks, approved rollback and failed-check behavior in a private operational record. Post only redacted conclusions in GitHub issue #202.
6. Keep production exports, MySQL root/operator/provider key rotations, support inbox recovery, provider invoice reconciliation and paid merchant settlement as separate owner-approved P0 items. Protecting the branch is **not** full launch approval.

The existing workflows and roughly 38 open PRs may be expensive or conflict. Review overlaps before merging. In particular, PR #261 is an earlier private-vault browser client that overlaps conceptually with the fuller gated workflow in PR #263; do not blindly merge both or enable either in production.

## Redacted offline posture handoff (no source credentials)

From an **authorised, independently checked** GitHub/Railway read-only observation, an operator can transcribe **only the allowlisted non-secret fields** into a private file. The script makes no network calls, reads no backing credentials and performs no writes.

**Example only** — based on the dated October 25 observation, not permanent current state:

    {
      "format": "luqi.release-control-observation.v1",
      "repository": "ttmodupe-hash/luqi-ai",
      "observed_at_utc": "2026-10-25T17:20:00Z",
      "github_main": {
        "branch": "main",
        "sha": "032e60056d92c55e9935c568a61b73f0fbd8c0f0",
        "protected": false
      },
      "railway_web": {
        "project_id": "9f627cb8-3136-4b30-89d2-32ca648a1e5f",
        "environment_id": "1e192ef3-1fa6-4684-81fc-60165c7b0e22",
        "service_id": "a9b293e0-1966-43be-80ef-3dd27acc6ab7",
        "source_repo": "ttmodupe-hash/luqi-ai",
        "source_branch": "main",
        "wait_for_ci": false,
        "deployment_sha": "032e60056d92c55e9935c568a61b73f0fbd8c0f0",
        "deployment_status": "SUCCESS",
        "pending_change_count": 0
      }
    }

Run only after operator authorisation in a local, protected shell:

    node scripts/review-release-controls.mjs < /private/release-observation.json

Exit **2**: blockers (the presently observed case). Exit **1**: malformed/unsafe input. Exit **0**: reported controls appear enabled but **independent human verification remains required**. A file can be fabricated: the tool itself **cannot authenticate GitHub/Railway source data**. It never certifies branch review rules, paid launch, backup restore, merchant checkout or invoice charges; public_or_paid_launch_approved is always false.

No user IDs, account emails, keys, tokens, URLs with embedded credentials, GitHub/CI secrets, customer content or raw Railway outputs are accepted. This is a no-deploy review candidate, not an automated authorization service.

Until settings are genuinely enforced, do not merge feature PRs merely because their CI workflows passed. Human release review must include the final merged SHA and actual production acceptance.
