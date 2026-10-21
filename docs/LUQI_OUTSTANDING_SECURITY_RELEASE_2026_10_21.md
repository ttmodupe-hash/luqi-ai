# LUQI Outstanding Security and Release Work — 21 October 2026

## Verified from GitHub Actions
- Node CI run 39576621404 failed due to malformed literal backslash-n in api/video.ts; correction committed at 9872cb55ad849da185ec0bd095197b7445c59e73. **Retest pending.**
- Security Review run 39576621392: secret-scan passed; dependency-audit failed at npm ci before audit because package-lock.json is stale. This is NOT a passing vulnerability audit.
- Earlier Node CI run 39572362152 passed TypeScript, 90 unit tests and build, **before** subsequent security changes.

## Release blockers (in order)
1. Regenerate and commit package-lock.json using Node 22 / npm 10 and `npm install --package-lock-only`; verify `npm ci`, `npm audit --omit=dev --audit-level=high`. Do not hand-edit transitive lockfile dependencies.
2. Confirm CI and security-review checks pass for the current commit, including the repaired video middleware.
3. Implement authenticated ownership checks for video projects and credit balances, verified payment webhooks, idempotent credit ledger, and rate-limited, budget-capped video generation. Current legacy operations are intentionally blocked on development branch.
4. Add API security integration tests: unauthenticated access, cross-user IDs, forged payments, duplicate webhooks, rate limits and malformed inputs.
5. Verify no secrets are exposed in repository history, cloud runtime, client bundles, CI logs or third-party dashboards; rotate any exposed keys.
6. Verify Cloud Run GCP project ID, service and region; confirm service account permissions, Secret Manager references, backup restoration, monitoring and rollback. Existing deployment workflow is disabled **on development branch only**; main branch may still have unsafe auto-deployment.
7. Verify DNS authority and domain ownership before changing any DNS; preserve MX/SPF/DKIM/DMARC.
8. Deploy to a separate staging environment and run authenticated end-to-end tests; obtain independent penetration testing for sensitive functionality.
9. Record explicit production approval, staged rollout and rollback readiness. Do not merge/deploy on unverified assumptions.

## Additional security program
- Implement privacy impact assessment, POPIA data inventory, retention/deletion and access-request workflows.
- Security headers, CSRF/cookie review, strict CORS, abuse detection, uploads scanning, audit logging and least privilege.
- Threat-model real-time chat, calls, documents, AI agent tools and third-party API data flows before enabling them.
- Measure vulnerability remediation times, restore success, intrusion detection coverage and incident response.

No claim of zero breaches, complete penetration-test coverage or production deployment is supported.
