# Production API type-check repair — 24 October 2026

## Scope and evidence

The previous focused checks did not type-check every module imported by
`api/boot.ts`. Baseline run `40056230120` compiled that complete import graph
with strict TypeScript settings and exposed unresolved names, untyped query
results, invalid boolean predicates, unsupported search/orchestrator arguments,
and an SDK tool-call union mismatch. The diagnostic workflow correctly failed;
it was not a deployed runtime change.

Isolated repair run `40056701728` applied reviewed, original-source-hash-checked
edits to ten files. The repaired API import graph passed strict compilation and
77 selected tests passed (43 new regression cases plus 34 existing authorization,
AI route and budget-denial cases). Additional session-result regressions and
fixture type checks are included in the final PR. Final-head CI and exact-revision
production checks must be recorded in continuation issue #202 before claiming
that candidate is live.

## Repairs

- Use schema-derived or explicit row types where the legacy DB abstraction
  otherwise erases the selected result type. These are compile-time contracts,
  not a claim of comprehensive runtime validation of database rows.
- Normalize SQL COUNT values through `readSqlCount`, accepting only nonnegative
  safe integers represented as numbers, digit strings or bigints. Empty/null
  aggregates retain the previous zero result; malformed results fail with a
  fixed message that contains no database value.
- Use actual boolean predicates/values for boolean columns instead of `1`/`0`.
- Forward all five search helpers' existing count limits as `numResults`, the
  option their service actually accepts; remove an unsupported, ignored
  `taskType` field from the legacy orchestration call.
- Validate the entire agent tool-call batch's discriminant before executing
  any function. Custom tool calls are unsupported and reject before even an
  earlier function call in the same batch can execute. Registered function
  execution is tested using a synthetic calculator and synthetic model reply.
- Use the existing `GENERAL_INTELLIGENCE_PROMPT` fallback instead of an undefined
  constant in the legacy streaming service. Missing providers still yield an
  explicit error, not a pretend answer.
- Replace the old ownerless REST streaming handler with its own explicit 503
  denial. This removes the unresolved `sessionId` and shared-cache/session code;
  it does not invent a session owner or reopen a provider path. Boot middleware
  already denied this endpoint. Direct-router tests now verify denial without
  parsing malformed input, reading session data or calling a provider.
- Keep only actual user/assistant roles in legacy session-history results rather
  than asserting arbitrary stored roles are valid conversational turns.

## Permanent regression checks

`.github/workflows/production-api-types.yml` runs on every main-targeted PR and
main push with contents-read permission and no deployment credentials:

```sh
npx --no-install tsc --noEmit --strict --skipLibCheck --target es2022 \
  --module esnext --moduleResolution bundler --esModuleInterop api/boot.ts
```

The six new fixture files test aggregate normalization, tool-call batches,
stream denial, no-provider fallback, search option wiring and session-result
roles. Existing authorization and budget route tests remain in the workflow.
Search argument fixtures deliberately isolate handler wiring with a test-only
tRPC middleware mock; they are not authentication-acceptance evidence. No real
provider, production database or customer account is used.

The one-time source-edit script and fixed-branch writer workflow are removed
from the final release tree. There is no self-modifying production agent.

## Limits preserved

Passing the production API import graph is not the same as checking the entire
repository, every frontend page, or third-party declaration internals. The check
uses `skipLibCheck`, and existing explicit `any` in the old DB layer has not been
eliminated. Legacy session ownership/retention, remaining route authorization,
whole-account erasure, MFA/ingress, real production-user and paid-AI acceptance,
historic credential review, production-derived restore, domain/support and
merchant readiness retain their existing gates. Existing provider-route denials,
the $100/month text-pilot allocation, worker switches, credentials, schema,
customer billing and infrastructure configuration are unchanged.
