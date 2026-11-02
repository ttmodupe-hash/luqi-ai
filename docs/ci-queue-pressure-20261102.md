# CI queue pressure: prevention and controlled recovery

2 November 2026. Prepared separately from release PR #401 at owner request. Base main: `69fbfce48babdd09285d80f766987d1fa4315cd4`.

## Observed cause, not a claim of provider-wide outage
The earlier checkpoint recorded 452 queued workflow runs. Fresh nearby API snapshots in this investigation returned 304 queued, including 233 Dependabot-triggered runs, and 16 in progress. These are moving snapshots, not a single atomic count or an account concurrency-limit measurement. The fall happened before any queue-control action and is NOT credited to this change. Seventeen open bot PRs (#403 through #419) were returned for 2 November. The newly expanded ungrouped version-update configuration allowed 10 Python, 10 root npm, 10 app npm and 5 Actions PRs. Each relevant PR can trigger the broad acceptance suite. Root npm coverage was newly added in main's #391 release; do not assume the observed early-morning batch was the configured 09:00 UTC scheduled run.

The main Web Build workflow has no workflow-level concurrency group. Other workflows, including WebKit acceptance, already have one; do not claim every workflow lacks this safeguard. Repeated unrelated main releases also forced #401 to integrate and rerun acceptance twice. Older green heads are not evidence for the final combined head.

## Prepared changes and exact activation status
- This branch changes `.github/dependabot.yml`: retain all four ecosystems and weekly checks; stagger routine version checks across Monday through Thursday; bound routine open PRs to 3 root npm, 2 app npm, 2 Python and 1 Actions (8 total rather than 35 configured slots).
- Minor/patch version updates are grouped, with runtime and development groups separate for npm. Groups explicitly apply only to `version-updates`. Root majors remain individually reviewable. Existing Python/app major-version ignore rules, reviewers and labels are preserved. No new ignore rules, cooldown, disabled rebasing, disabled updater or dependency-version edits.
- `operations/web-build-pr-concurrency.patch` is a prepared, UNAPPLIED additive workflow patch. It cancels only superseded runs of Web Build for the same pull request. Main push and manual runs have distinct run-ID keys and retain their evidence. The patch changes no tests, events, permissions, timeouts or thresholds. Do not state it is active merely because this file exists.
- No PR is opened in this step, avoiding another full suite behind #401. No main write, auto-merge or runtime deployment. The dependency configuration also is NOT active until reviewed and merged into the default branch. Existing queued jobs are not retroactively cleared by a future setting.

## Tests actually executed
15 parsed-YAML policy assertions passed locally: retained ecosystems, weekly/staggered schedules, nonzero limits, version-only minor/patch grouping, unchanged ignore scope, retained reviewer and npm runtime/development separation. The patch passed `git apply --check` and application on an exact-header synthetic workflow fixture; parsed keys other than concurrency remained identical. Five group-key scenarios passed: same-PR supersession; different-PR isolation; main-run isolation; manual-run isolation; event isolation. This is static/fixture evidence, NOT full application CI, GitHub scheduler acceptance, or an actual cancellation.

## Immediate queue recovery and release ordering
The installed GitHub connection exposes workflow reads and reruns but no cancellation action. Available-tool and plugin discovery found no additional cancellation integration; the local runtime has no authenticated GitHub CLI. No secrets were requested or extracted and no run was cancelled here. A cancellation URL in a read response is not a cancellation result.

An authorised maintainer can use GitHub Actions to cancel only a demonstrably superseded PR run after rereading the PR's current head and confirming a replacement run for the same workflow/current head exists. Preserve latest-head acceptance, main/push/manual/deployment checks and security evidence. Deferring any still-current routine version PR requires explicit triage; do not blanket-cancel everything labelled Dependabot or assume the repository's `security` label means a particular advisory. Do not close PRs or disable security updates to manufacture green checks. Re-running queued checks adds load and is not a priority mechanism.

Coordination request is recorded in #394: avoid unrelated main merges, repeated rebases and unnecessary pushes while #401 is validating; continue read-only research and batch branch changes. This is not an enforced branch lock. A verified urgent security correction takes precedence. Do not modify automation schedules or repository protection rules as a side effect.

Keep #401 head `4ab33d648d3ce25c7cd4571da51fa4df709b2e71` unchanged unless a real defect or upstream conflict requires repair. Release only after its exact final integration has passed and canonical Railway/public-domain checks confirm the merged commit. This branch must not be used to bypass that gate.

After #401: reconcile current main, review this configuration, apply the small workflow patch to the then-current full file using `git apply --check` first, inspect that only the concurrency block changed, validate YAML/workflow expressions and run all applicable exact-head acceptance. Review a grouped update's actual diff and dependency audit before merging; split incompatible groups rather than weakening tests. Maintain enough reviewer throughput that routine caps do not become neglected dependency backlog.

## Primary platform references checked
- https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference — version update limits and groups; security updates are separate from the version PR limit.
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency — workflow groups and conditional cancellation.

No claim is made that a GitHub billing limit, vendor outage, physical phone failure, source freshness issue, or production outage has been resolved by this preparation.
