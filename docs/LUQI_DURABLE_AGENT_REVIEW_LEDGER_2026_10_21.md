# LUQI — Durable, reviewable agent-improvement ledger (draft)

## What changes
The existing `healing_patches` MySQL table stores proposed changes. Previously `applyPatch` and `rollbackPatch` simply flipped a status without proving who requested the state change, whether an independent reviewer approved it, or whether a historical event had been modified.

This draft introduces `agent_review_events`, an InnoDB event ledger with the **server-validated administrator user ID**, proposal SHA-256 digest, transition, previous-event digest, hashed reviewer rationale and timestamp. Proposal creation and its genesis event are one transaction. Review-state mutation and its event are one transaction.

### Permitted transitions

`proposed` → `approved_for_ci` (review requested, **no CI actually started**)

`proposed` → `rejected`

`approved_for_ci` → `review_revoked`

All other actions fail closed. For initial approval/rejection, the reviewer must be a **different authenticated administrator** than the proposal creator. Actions serialized under an InnoDB row lock cannot both win. Missing or inconsistent history blocks mutation. Existing legacy proposals without genesis events remain viewable as **untracked**, not silently backfilled with fictional approvals.

### Features wired into ledger
- Human-triggered `analyzeAndProposePatch` now creates a **non-executing** evidence proposal (does not invent a fix).
- `aiDiagnoseError` and `proposeAgentImprovement` create a genesis event for their real proposals.
- `applyPatch` requests external CI review (does not execute or dispatch tests). `rollbackPatch` revokes a review, **not** a production deployment.
- `rejectPatchProposal` rejects the proposed change without running code.
- `getProposalReviewTrail` exposes admin-only event history with local digest-chain verification.

### Explicit security boundaries
- These are **administrator-only** endpoints; reviewer IDs come from authenticated sessions, not request input. No API key, shell, Docker, deploy credential, GitHub token or auto-merge capability is introduced.
- Event hashes are calculated using SHA-256; this is evidence of accidental/inconsistent DB changes **not an immutable forensic trail**. Anyone with unrestricted database write access could forge a new consistent chain. Audit requires independent log export, DB access controls and external anchoring.
- The ledger records that review was requested, **not that independent CI actually ran or passed**. Reviewer identity independence is an in-app check, not dual-control proof in GitHub. A protected GitHub CI workflow, reviewed signed artifact/digest, branch protection and explicit release approval remain necessary.
- Neither this PR nor its staging migration auto-deploys or changes Railway/GCP/Cloudflare.
- User personal memories, content, or cross-user data are NOT migrated or merged. This is an admin-only agent proposals ledger.
- Raw review reason is not saved: only a SHA-256 digest is stored. Reviewers must keep the full signed rationale in an independently protected ticket if required.
- The current backend cannot yet automatically recover failed jobs or dispatch tested patches. This is a durable first step, not autonomous production self-repair.

### Database staging deployment / rollback
1. Identify **staging** MySQL (not unverified Railway production), snapshot/backup, test restoration.
2. Run `db/migrations/20261021_agent_review_events.sql` manually with an authorized migration identity.
3. Confirm MySQL 8.0+ InnoDB, unique user/admin identities, and event records on an isolated staging test.
4. Run `LUQI Agent Review Ledger MySQL` CI plus main Node/TypeScript, security review and integration suites. Check the exact final commit SHA.
5. Validate browser/admin flows and old proposals that now fail closed when history is unavailable.
6. Do not merge the draft until the main auto-deploy guard #100 and cloud trigger inventory issue #104 are safely resolved.
7. Rollback is an explicitly authorized reviewed schema/application release. Do not drop the event table once real audit events have been recorded.

## Future sophistication after review
- External CI attestation: linked GitHub PR, commit SHA, runner identity, test evidence manifest, threat-model checks, artifact digest and signed reviewer approval.
- Per-task idempotency keys, deduplication, scheduler backpressure, bounded budgets and human paging.
- Durable private proposal queue instead of legacy `healing_patches` statuses; controlled migration with equality checks.
- Data retention, PII classification, encryption, disaster recovery and append-only external archive.
