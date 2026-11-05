# LUQI AI — Consensus is model review, not certification

## Confirmed historical problems

The production-facing module `api/services/consensusEngine.ts` previously:
1. Claimed draft content was independently verified even when the Gemini draft call failed, by returning invented legal/security/engineering prose.
2. Defaulted the adversarial audit to `APPROVED`, including after a provider failure, empty audit or invalid text.
3. Used substring `includes("APPROVED")`, so a warning saying “NOT APPROVED” could count as a pass.
4. Claimed `consensusPassed: true` even when there was no real verified audit; auditor-provided output was silently treated as a patched answer.
5. Could invoke two or three paid vendors without the persistent per-user/global allowance reservation used by other LUQI routes.
6. Accepted a client-supplied `agentIdentity` from the HTTP route and presented an in-memory SHA-256 chain as durable, immutable auditing.

These were risks regardless of whether the route is popular or a provider key is currently configured.

## New contract

The authenticated admin endpoint `POST /api/v1/consensus/execute` resolves the actual administrative user identity from the server-side session. It accepts a bounded `taskPrompt` only.

On valid requests, it reserves a durable AI allowance **before each possible paid vendor request**: one for drafting and one for model-based adversarial audit. A failed Anthropic audit does **not** trigger hidden additional Gemini consumption. A missing provider or quota store, invalid structured audit response, empty draft or failed network request results in a real failure code.

The returned answer is always `status: "review_required"`, `consensusPassed: false`, `independentlyVerified: false`, `humanReviewRequired: true`, and `deployed: false`. It can contain `modelAgreement: true` as a **claim by a model**, not proof of accuracy. A flagged draft is withheld rather than silently treating the auditor's text as final.

Review results are not presented as immutable audit records. Only a SHA-256 digest of the bounded model-review metadata is returned; this is not durable storage, a signature or an attestation.

## Limitations and next steps

- No independent fact verification, SARS legislation check, exact tax-law source validation, third-party code security review or protected user-data classification was added.
- Two different AI models can agree and still be wrong. The word “consensus” is not a legal, mathematical or security certification.
- The quota helper counts **attempted calls**, not actual billed USD or token usage; enforce additional vendor-level hard limits and model/cost dashboards.
- Model identifiers currently match the app's existing provider configuration and may need review before real deployment.
- The review model receives task and draft text; data minimization, provider agreements, privacy classification and consent remain release requirements for legal/tax/user requests.
- No automatically invoked external reviewer, release promotion, DNS change or production data mutation is authorized by these results.
- Add signed, per-request private artifact persistence after completing the MySQL agent ledger migrations and owner-scoped access checks.
- This PR is stacked on draft evaluation PR #115 and is **not deployed**.

## Verification

`api/services/consensusEngine.security.test.ts` injects fake providers to verify real error paths, correct call reservation ordering, malformed auditor denial, no extra fallback vendor spending, independent user identity and explicit noncertification. `.github/workflows/consensus-safety.yml` runs TypeScript, unit tests, build and static security invariants without paid model credentials.
