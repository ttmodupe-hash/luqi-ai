# Omega integration and truthful HTTP liveness — 25 October 2026

## Changes in this reviewed candidate

- The LUQI welcome page and local tool catalog make the already-delivered
  same-currency travel budget calculator and vehicle maintenance interval
  calculator reachable without an account, paid AI, or a worker.
- The Omega page shows a collapsed, accessible six-domain availability guide.
  Exactly two local tools work; official feeds and backend task workers remain
  explicitly unavailable until independently reviewed.
- The three public health routes no longer claim `khoro_active: true` from a
  constant. The shared process-liveness handler preserves the existing
  `status: "healthy"` response and marks it `Cache-Control: no-store`.
  HTTP process health does not prove MySQL, agent, AI inference, payment or
  application account functionality.

## Mandatory engineering and operational gates

- Both frontend trees must stay byte-for-byte identical for shared files.
  Run local no-provider unit checks, launch search parity, mobile/keyboard
  browser tests and Docker-container parity on the exact candidate.
- Confirm production Railway deployment of the exact merged commit reaches
  terminal SUCCESS, and public identity/custom HTTPS checks pass.
- These changes do **not** apply Omega MySQL migrations, create credentials,
  turn on `LUQI_OMEGA_WEB_ENABLED` or `LUQI_OMEGA_WORKER_ENABLED`, run
  a job, call an AI/weather provider or activate paid services.
- Full six-module rollout remains blocked on issue #133: source-authority
  integrations, isolation, task retention and erasure, dedicated worker
  permissions, monitoring, human approval and safe recovery.
- Broader launch still requires historical Railway credential review, a
  production-derived isolated restore, tested private support and account
  recovery, real provider-spend reconciliation and merchant approval in #202.
  Passing CI is not evidence that those operator checks occurred.
