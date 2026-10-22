# LUQI self-improvement — evidence attached to an actual proposal

## Scope
The agent proposal ledger (draft PR #109) previously recorded suggestions and independently attributed review transitions. The offline evaluator (draft PR #115) could calculate whether reported candidate results met provisional safety, quality, African-language coverage, performance and cost checks, but **the two components were not connected**.

This change adds a versioned, intentionally *unattested* evidence record to the **existing** `healing_patches` and `agent_review_events` workflow. It neither starts an AI provider nor executes proposed code.

### Reviewer-controlled lifecycle

1. A real authenticated administrator creates an inert proposal. It receives a database ID and hash-linked genesis event.
2. A **different** authenticated administrator records an independent review request; the proposal changes to `approved_for_ci`. This still does not start CI.
3. A separately authenticated administrator may submit a bounded offline baseline-versus-candidate report to `selfHealing.submitProposalEvaluationEvidence`. The service verifies that the proposal is in `approved_for_ci`, locks it in MySQL, checks the event hash chain and matches the current proposal contents to the original hash.
4. The service calculates the **provisional** evaluator verdict from individual measurements, then stores only a digest, revision/dataset identifiers, score summary, original review-event hash, author ID and clear unattested flags in `agent_evaluation_evidence`.
5. Submitting the same report twice to the same proposal is idempotent (unique patch + report digest). Revoked, malformed, legacy-untracked or tampered proposals cannot receive additional evidence.
6. `selfHealing.listProposalEvaluationEvidence` returns bounded admin-only summaries. It **never** claims provider verification, authenticated CI or production release authority.

A failing legitimate evaluation is stored as `reviewEligible: false`, providing useful negative feedback and avoiding a selective record of successes. Raw personal learner prompts, model output and per-case data **are not stored** in the new table.

### Security and epistemic limits

- **No real benchmarks were run by this implementation**. Tests submit synthetic results to exercise the evaluator and real MySQL transactions only.
- A user-provided dataset hash or Git SHA is **not** evidence that the dataset/commit was actually used. A matching report SHA only identifies *what was submitted*; it is not a signature or authenticated CI attestation.
- `reviewEligible: true` is only an *untrusted reported scorecard* meeting provisional heuristics, not a security release gate. Every API result stays `sourceAttested:false`, `ciAttested:false`, and `releaseAuthorized:false`.
- Model statements, signed-in administrator roles and even a two-person workflow do not prove actual review quality, independent CI execution, or production safety.
- No internal application method is permitted to mark `source_attested` or `release_authorized` true; a database CHECK constraint refuses either state. A new independent evidence-verifier service with restricted identities and CI-backed provenance must be designed separately.
- The new service does not store credentials, raw learner data, session cookies, or provider outputs. It is not a personal long-term memory store.
- There is no pretense that a MySQL-local hash chain cannot be rewritten by a privileged database attacker.
- Bounded Zod schema limits request size to 120–1000 cases; actual transport-level body limits and authenticated ingress throttling should also be verified before staging.

### Next release gates
- Apply migrations `20261021_agent_review_events.sql` then `20261022_agent_evaluation_evidence.sql` to an approved, backed-up **staging** MySQL; test restore and negative-case authorization.
- Validate GitHub branch protection, CI runner identity, authentic input data and reference snapshots.
- Independent CI must issue signed, immutable, access-controlled evaluation evidence bound to a proposal digest, exact commit and dataset. Never accept agent-supplied `attested:true` fields as proof.
- Consolidate the currently independent draft PRs for Python self-healing safety (#107), archival integrity (#106), staging Docker (#105), proposal budgeting (#108), MySQL ledger (#109), evaluation (#115) and consensus budget (#116) into a single internally tested integration candidate before human-approved staging.
- Resolve auto-deploy controls (#100/#104). No production migration, host cutover, Railway or DNS action is authorized by this draft.

## CI evidence

GitHub Actions `LUQI Agent Evidence Integration (no deployment)` uses an ephemeral MySQL 8.0 server to test real transaction behavior, state-lock races, submission duplicates, failed evaluations, revocation and tampering. It also runs TypeScript, the full offline unit test suite and an application build, without vendor credentials, production database access or deployment.
