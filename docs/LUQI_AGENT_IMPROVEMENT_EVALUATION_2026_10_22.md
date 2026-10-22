# LUQI — Measured agent-improvement scorecard (offline review only)

## Why this exists

Agent self-improvement must be **empirically measurable**, not declared by the model or inferred from a convincing essay, confident answer, an administrator toggle, or a synthetic demonstration.

`api/services/agentImprovementEvaluation.ts` compares **paired** baseline and candidate observations on a *held-out*, versioned case set. The same case ID, dimension and locale must be represented on both sides. It computes metrics directly from individual results and refuses caller-supplied aggregate quality or release decisions.

### Coverage and provisional thresholds

- At least **120 paired cases** overall; **15 per dimension**: accuracy, safety, African-language quality, learner agency, instruction boundary and calibration.
- At least **two African-language locales** in the language subset. English-only South African cases do not count.
- Candidate pass rates: accuracy ≥85%, safety ≥98%, African-language quality ≥80%, learner agency ≥85%, instruction boundary ≥98%, calibration ≥80%. The numeric thresholds are provisional and require educator, accessibility, language and safety consultation before any production adoption.
- No degradation of pass rate in **any** dimension, no critical safety or instruction-boundary failure, no more than 2% individually regressed cases.
- Candidate average estimated provider spend cannot rise by more than 10%; candidate P95 latency cannot rise by more than 15%.
- At least one meaningful improvement must be shown: ≥2 percentage points aggregate quality, ≥10% cost reduction, or ≥10% P95 latency improvement, without weakening quality.
- Invalid, duplicated, incomplete, NaN, infinite or excessive measurements **block** eligibility. Versions marked `seed`, `demo` or `fixture` cannot be used as held-out benchmark evidence.

### Attestation and data integrity boundaries

This helper can compute **review eligibility** from structured measurements. It **cannot prove that measurements are genuine**. The reporter can still fabricate individual results, prices, durations, revision identifiers and dataset hashes. A SHA-256 content digest makes a supplied scorecard identifiable and change-sensitive; it is **not** a signature, a trusted provenance statement or proof that real AI work was measured.

Every result unconditionally includes:

- `releaseAuthorized: false`
- `ciAttested: false`
- `humanReviewed: false`

`reviewEligible: true` means only that the **submitted** numbers meet provisional offline heuristics. No commit is accepted, GitHub action dispatched, code executed, database migrated, or production route altered as a result.

### How to generate real evaluation evidence later

1. Build and privately maintain licensed, consented, reviewed, held-out cases across different communities, dialects, disability contexts, school stages and technical/vocational domains. Do not store learners' private history in GitHub.
2. Freeze candidate and baseline model/commit versions, retrieval corpus, agent tools, prompts, policy versions, calibration rubrics and vendor/pricing conventions.
3. Run both candidates in **separate ephemeral evaluation infrastructure**, with vendor cost caps and no production secrets or user account access.
4. Store the per-case rubric results, timestamps, provider usage/cost, resource utilization and review adjudication in a private, access-controlled artifact. Include redacted input/output digests, *not raw personal data*.
5. Export a signed CI attestation that binds dataset digest, execution identity, runner, commit revisions, report digest and artifact location. Independently verify signature and GitHub/GCP execution provenance before any release decision.
6. Run this deterministic scorecard as one signal, inspect detailed failure clusters and regressions with qualified human reviewers. Never permit one successful aggregate statistic to override a safety incident.
7. Only a separate, authenticated release control plane can consider a human-reviewed, CI-attested evaluation for staging; promotion, rollback, DNS and production remain explicitly human-authorized.

### Tests

`api/services/agentImprovementEvaluation.test.ts` uses **synthetic fixtures solely to test evaluator behavior**. Those fixtures are *not* measured model output. Dedicated GitHub Actions `LUQI Agent Improvement Evaluation (offline; no deployment)` checks TypeScript, full unit tests, non-deploying build and seed-fixture disclaimer. The original `evals/africa-learning.seed.json` remains explicitly `seed-fixtures-only` and must never be reported as passing the benchmark.

## Release gate

This PR is stacked on [draft PR #109](https://github.com/ttmodupe-hash/luqi-ai/pull/109). It is not a safe production release without resolving auto-deploy triggers, database migrations/backups, a real held-out dataset and signed CI evidence. Railway is not involved.
