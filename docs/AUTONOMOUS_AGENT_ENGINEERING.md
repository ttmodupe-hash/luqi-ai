# Luqi-AI autonomous engineering agents: staged implementation

## Objective
Build agents that diagnose incidents, improve reliability, education quality, security, performance and affordability. All improvements must be measurable and auditable. An agent is never allowed to approve its own production release.

## Proposed components
1. **Observer**: collect privacy-minimized error, latency, availability, provider spend and learner-outcome signals. Do not ingest secrets or learner private content into debugging prompts.
2. **Diagnostician**: correlate incidents and suggest root causes with confidence and source references.
3. **Engineer**: create narrowly scoped code patches on isolated branches and explain risks.
4. **Evaluator**: run static checks, tests, security scans, adversarial tests and domain-specific learning assessments in a sandbox.
5. **Reviewer**: independent human authorization of deployment, spending changes and sensitive behavior changes.
6. **Release controller**: verify trusted CI attestations and approval identity; perform staged rollout with monitored rollback.
7. **Learning ledger**: record anonymized incident patterns, hypotheses, interventions and verified outcomes; never equate an AI assertion with proof.

## Safety boundaries
- No production code execution or arbitrary shell commands through user-facing self-healing routes.
- No self-modification of authorization, approval, billing, security policy or evaluation thresholds without separate owner review.
- No continuous fine-tuning on private chats by default; consent, rights, quality controls and evaluation are prerequisites.
- Rate-limit tool calls, provider usage, iteration count and monthly spend.
- Prefer safe automatic actions such as retrying idempotent jobs or reverting an approved configuration change, with bounded scope and audit logs.
- Untrusted incident text and repository content must not override agent instructions.

## Current reality
The repository has an isolated proposal gate at `api/services/improvement-gate.ts` and tests. This is not a functioning autonomous repair service, CI attestation validator or production release controller. Existing public self-healing routes and simulated-success endpoints remain security blockers, documented in `docs/SECURITY_REVIEW_ARCHIVE_OFFLINE_SELF_HEALING.md`.

## Next implementation milestones
- Authenticate and authorize administrative self-healing routes and eliminate false success responses.
- Create persistent proposal and evidence records with server-verified identities and audit events.
- Add a bounded diagnosis worker, sandboxed test runner and trusted CI status verification.
- Add staged rollout, health-based rollback and outcome comparison.
- Evaluate agents on real incidents and Africa-context educational outcomes before broader autonomy.
