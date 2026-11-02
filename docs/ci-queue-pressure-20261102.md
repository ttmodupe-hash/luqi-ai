# Luqi release queue controls — 2 November 2026

## Incident and recovery
PR #401 was delayed by queued GitHub Actions runs, including a large simultaneous routine Dependabot update batch. Recorded earlier snapshots included 452 queued runs, then 304 including 233 Dependabot-triggered runs. They are point-in-time workflow counts, not running-job counts or proof of an account billing limit or GitHub-wide outage.

The follow-up read returned zero queued repository runs. All 32 exact-head PR #401 workflows had independently completed SUCCESS before intervention. No workflow was manually cancelled and no safety check was skipped to manufacture that result. The owner-authorised release was then merged as 501b4a34f5145524b86c3f2dd57a13f7acb48d24, preserving the tested tree bda13d86a136497443a68472829229a1793a515c. Canonical Railway deployment 8a40f0b7-30e1-4f0d-8045-a4e942baeb2c reached SUCCESS at 06:38:05 SAST. Public-domain verification is a separate gate, not inferred from that status.

## Controls implemented by this change
The prior preparation commit 3b86cd24 is retained in history. Its unapplied patch file is superseded by an actual edit to `.github/workflows/web-build.yml`, not another installation instruction.

1. Dependabot continues weekly checks for pip, root npm, /app npm and GitHub Actions. Routine version-update open-PR limits are 2, 3, 2 and 1 respectively: eight total configured slots instead of 35. Existing open work is not erased by this policy.
2. Routine minor/patch updates are grouped. Root and /app npm keep production and development batches separate. All six grouping rules explicitly apply only to `version-updates`. Existing major-version exclusions for pip and /app remain; no new ignore conditions were added. Security updates are not disabled, grouped or deferred by these version-update limits.
3. Weekly jobs run at 09:00 UTC (11:00 SAST): root npm Monday, /app npm Tuesday, pip Wednesday, GitHub Actions Thursday. These are update-discovery schedules, not guaranteed PR-creation times.
4. Web Build has workflow-level concurrency keyed by event and pull-request number; only an older run of the same PR can be superseded. Main/manual runs use their distinct run IDs and do not cancel each other. No global lock, priority scheduler or cancellation API is introduced.
5. Thirteen offline contract checks exercise group separation, mandatory checks, schedule, grouping and security-update boundaries inside the existing Web Build job. No additional workflow is introduced.

## Validation and change boundaries
The complete original Web Build was fetched at released commit 501b4a34 and its Git blob hash verified locally as e4758339dc06e1cf460e60cbf3e3396e7eb82192 before alteration. Removing only the new concurrency block and new test step reproduces the original byte-for-byte. Parsed YAML comparison also confirms that all prior triggers, permissions, jobs, steps, shell commands, timeouts and artifact rules remain unchanged. Local Node checks: 13 passed, zero failures/skips. The uploaded workflow blob matches the locally tested blob a5eaa8745e766d47fa3f2357749604184b42488e. These checks do not prove actual scheduler priority or future queue duration; full exact-candidate CI remains required before merge.

No application runtime or dependency version, lockfile, test threshold, customer data, account, provider budget, guest limit, payment, DNS, Railway setting or database schema is changed. Source-review and physical-device evidence issues remain separate. Do not attribute the earlier queue drain to controls that had not yet been merged.

## Release discipline
Use one reviewed candidate, avoid unnecessary pushes or unrelated main merges during its final test window, and investigate genuine failures instead of rerunning to conceal them. Urgent security repairs remain eligible for explicit prioritisation. Never mass-cancel runs, disable security checks or deploy a different tree from the one accepted. Coordination comments are not an enforced repository lock.

## Official semantics checked
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference

Activation requires this change to be merged into the repository's default branch. Later releases must still be identified by exact Railway/public commit. A successful configuration rollout reduces avoidable work; it cannot guarantee GitHub capacity or a delay-free release.
