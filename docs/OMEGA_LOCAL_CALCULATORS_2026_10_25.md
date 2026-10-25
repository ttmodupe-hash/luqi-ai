# Browser-only Omega calculations — candidate for review, 25 Oct 2026

This change offers two genuine deterministic functions from the existing Omega
web-v1 contract on the existing /#/omega-tasks page. It is not a six-module
live rollout or background worker activation. The feature is not deployed
until this change is reviewed, merged, successfully deployed and independently
checked in a real browser.

## Scope and correctness
- Exact decimal-cent arithmetic for one-currency travel budgets. Bounded 1–50
  nonnegative strings, 9 integer digits and 2 decimal places per amount.
- Vehicle service due date and distance based only on user-supplied odometer,
  history and manufacturer-provided intervals. Calendar dates validated in UTC.
- The result contracts, flags, disclaimers and bounds match the existing Python
  omega_ai.web_tasks web-v1 implementations; no live FX, visa, route, registry,
  mechanical diagnosis, weather, academic authority or potable water claim.
- Inputs and results remain in React component memory. No credentials, account,
  MySQL, persistent storage, HTTP requests, model calls or worker invocations.
  The page clears old results when edited or when the mode changes.
- Browser-only values do NOT appear as completed stored Omega tasks. Task history
  remains account-specific and gated by LUQI_OMEGA_WEB_ENABLED=false by default.

## Acceptance gates
Review the final diff and both mirrored frontend trees; run the dedicated tests,
strict frontend compilation, current browser/320px accessibility checks, normal
CI, mobile-loading guard and container smoke test. These are not yet claims of
passed final-head CI or live deployment.

The separate production queue still needs an approved additive migration,
restricted web/worker grants, private worker identity and invocation, rate/retention
and erasure policies, source-data backup/isolated restore, monitoring, designated
account acceptance, rollback and operational human ownership. Never simply flip
both Omega environment switches to true.

See issue #133 for six-module provider and authority acceptance and #202 for
cross-product launch holds. This branch changes no production configuration,
customer data, provider billing or custom domain.
