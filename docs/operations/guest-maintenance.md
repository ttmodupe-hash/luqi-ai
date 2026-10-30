# Guest rollout operations

Railway private function: `luqi-guest-maintenance`, service `2de8a6d0-bbaa-45a7-8a21-3b66f96982b6`, project `kind-spontaneity`, production. It has no listener, public domain or HTTP entry point. The function exits after bounded work; restart policy NEVER. The scheduled production mode must be `cleanup`, not `canary`.

Build from the reviewed source and installed lockfile with `node operations/build-guest-maintenance.mjs`. Deploy the complete generated `operations/guest-maintenance.railway.ts` with the Railway Function source API. The unversioned `.mjs` artifact is used for isolated Node/MySQL CI; the `.ts` artifact pins root package versions for Railway/Bun. Subpath imports remain ordinary package/subpath imports because the Function scanner does not preserve versioned subpaths.

Modes:

- `canary`: explicit one-off metered verification. Reads the actual approved budget triplet via service references; refuses any allocation other than USD165 Gemini / USD135 OpenAI. Invokes the same mounted guest route and its production MySQL reservation transaction. The expanded profile exists only in this private script until public activation. A fixed signed visitor capability limits all redeployments combined to three attempts/month. Captures only provider token counts, HTTP status, challenge-match boolean and aggregate reservation delta; no prompts, replies, addresses, cookies or secrets in maintenance logs. A failed or ambiguous call retains its reservation. There is no automatic retry.
- `check`: read-only budget/guest counters and known spoofed-address counter checks. These checks support a paired customer-domain test with deliberate X-Real-IP/X-Forwarded-For spoof values; they do not establish invoice authenticity or a general penetration-test pass.
- `cleanup`: deletes at most 10,000 negative visitor/network/burst counter rows older than 62 days per run. Preserves positive account usage, current records and -1/-2/-3 aggregate count/cost rows. Reports pending backlog and exits nonzero if more eligible rows remain. Schedule daily at `15 2 * * *` UTC (04:15 SAST). Run and verify an initial cleanup before leaving it scheduled. Backups and third-party logs have separate retention and are not deleted by this operation.

The one private operator process references `${{MySQL.MYSQL_URL}}`; it does not add DELETE or administrative permissions to the public app's restricted database identity. It is a database credential consumer to include in future root-credential rotation. Keep source static and never expose an HTTP execution endpoint. Budget values/provider keys are reference variables, not copied into code or revealed by the connected tools. After the one-off canary, switch to cleanup and remove provider/signing references from this service when supported; cleanup does not require them. Schedule and execution read-back are required; a service saying SUCCESS alone does not prove its script ran.

Token-based cost estimates are separate from invoices. For the 2026 standard Gemini 3.8 Flash rates, estimated USD = `(input_tokens * 0.75 + (candidate_tokens + thinking_tokens) * 3.75) / 1,000,000`. Inspect actual provider token counts and compare with the durable one-cent reservation. Provider billing, delayed charges, tax/credits and unrelated project traffic remain separate audit evidence.

## Offline cost-review correction

The original v1 evidence format remains a historical USD100 / USD60 / USD40, ten-cent-only review. New `luqi.pilot-spend-evidence.v2` requires an explicit `budget_profile`: `approved-300-v1` or `approved-100-v1`. The USD300 profile evaluates Gemini USD165 / OpenAI USD135. For mixed guest 1c, visual/legacy 10c and longer text 20c reservations, attempt counts are unknown; never divide total money by ten cents to invent customer replies. Missing provider reports remain unknown, not zero. This tool changes no settings and cannot approve activation or certify reconciliation.

See `guest-capacity-20261030.md` for quotas, capacity arithmetic, shared-network limits and the controlled activation sequence. Record live deployment/configuration and response evidence separately from synthetic CI and from any future claim of 1,000 simultaneous customers.

## Live preflight compatibility repair

The first expanded-path canary exposed an actual SDK restriction missed by the original mocked test: `@google/genai` rejects `countTokens.config.systemInstruction` in Gemini Developer API mode. `api/services/guestTokenCount.ts` now uses the documented Developer REST `generateContentRequest` envelope, carrying the complete model, system instruction and user/history input. It keeps the key in a header, bounds the response to 4 KiB, refuses redirects, times out after five seconds, validates the token count, and never retries or generates after an unverified count. The existing durable reservation still occurs first. This is a runtime repair, not a reason to remove token or budget enforcement.

Reference: https://ai.google.dev/api/tokens#request-body . Regression tests assert the actual HTTP envelope and failure paths rather than configuring a synthetic SDK method that could never accept the production request.
