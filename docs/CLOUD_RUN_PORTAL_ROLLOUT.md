# LUQI AI: Cloud Run public/admin rollout plan

Status: planning document only. No production infrastructure or DNS has been changed.

## Deployment boundaries
- Keep the current public Cloud Run service and HostAfrica DNS unchanged until staging validation.
- Deploy a second service, `luqi-admin`, from the same reviewed GitHub commit, with Cloud Run Identity-Aware Proxy (IAP) enabled directly on that service. Require authentication and grant access only to approved administrator identities.
- Do not infer authorization from a hostname, React route, UI passkey, or client-supplied header. All privileged API operations must enforce a server-side administrator identity.
- The public service must not expose privileged endpoints or privileged credentials. Prefer distinct runtime service accounts and secrets for public/admin services. Existing shared `api/boot.ts` routes need an inventory and hardening before any public deployment.
- Do not connect `admin.luqi-ai.com` until IAP and authorization tests pass. Use the actual DNS targets returned by the selected Google Cloud domain setup, not guessed CNAMEs.
- Do not change production traffic until build, typecheck, tests, and manual smoke tests pass.

## Known blocking issues from code review
1. `/api/v1/billing/stripe-webhook` accepts unsigned JSON and records it as a billing event. Implement provider signature verification against raw request bytes before accepting any real webhook.
2. The HITL dashboard contains illustrative records; approve/reject controls are disabled until an authenticated persistent workflow is built. Never execute payouts or tax submissions on a UI-only approval.
3. Admin verification currently accepts a master passkey and browser sessionStorage; migrate to server-issued short-lived HttpOnly sessions and MFA, with logout, revocation, rate limiting, and audit logs.
4. The API matrix now returns unknown funds/latency as null, but real balance and latency probes are not implemented.
5. CI typecheck has previously failed; confirm the latest PR revision passes all gates.

## Rollout checklist
- [ ] Identify actual GCP project, service, region, container image, database, service account, and existing DNS mapping (no secrets copied into tickets).
- [ ] Inventory and test every admin REST/tRPC endpoint and remove public privilege paths.
- [ ] Add server-side admin identity and IAP-aware authorization, with negative tests.
- [ ] Build database-backed HITL queue with immutable decision records and idempotent execution.
- [ ] Verify signed payment webhooks, reconciliation, and test-mode flows.
- [ ] Configure `luqi-admin` Cloud Run service with IAP and least-privilege service account.
- [ ] Smoke-test public labs, chat, academy, wallet, mobile and low-bandwidth routes.
- [ ] Configure `admin.luqi-ai.com` in HostAfrica only after Google supplies the target.
- [ ] Confirm rollback and backups, then progressively release.

## Official guidance
https://docs.cloud.google.com/run/docs/securing/identity-aware-proxy-cloud-run
