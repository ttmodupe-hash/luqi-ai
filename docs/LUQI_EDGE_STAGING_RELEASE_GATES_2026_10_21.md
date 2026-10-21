# LUQI Edge Protection and Staging Acceptance — Review Only

**Status:** code prepared, NOT routed to live traffic, NOT deployed, NO migration or DNS changes.

## 1. What the application now has
- Database-backed per-account limits for authenticated tRPC and credential attempts, using reviewed MySQL `rate_limit_windows` migration. 10 login attempts and 5 registration attempts per normalized-email key per minute; global credential attempt caps remain conservative.
- Optional Cloudflare Worker at `edge/cloudflareWorker.js` with **no shared API cache** and a fail-closed check for its managed rate-limit bindings.
- Example `edge/wrangler.staging.example.toml` (not an active deployment config). API limit 240 requests per minute per edge client IP, plus 20 per minute for canonical and legacy auth endpoints. These are initial hypotheses, not a tested production SLO.
- Unit tests for edge guard bypass/missing binding/unsafe cache behavior. CI is not proof of edge configuration or active Cloudflare routing.

## 2. Critical deployment prerequisites
1. Determine the real **LUQI** staging GCP project, Cloud Run service/region and hosting provider. The known `gen-lang-client-0251020190` is the observed **Remix** project, not verified to be main LUQI.
2. Identify which edge vendor actually fronts the selected staging hostname: Cloudflare, or Google Cloud external Application Load Balancer + Cloud Armor. **Do not deploy both by assumption.** Never guess active DNS delegation or account permissions.
3. For **Cloudflare**: create distinct account-local limiter namespace IDs; configure bindings in a private staging Wrangler config; attach only to the reviewed staging route after validating zone ownership. Require the Cloudflare-managed connecting IP for API admission. Investigate shared corporate NAT / carrier-grade NAT false positives before enforcing.
4. For **Cloud Armor**: attach a rate-limiting security policy in **preview** to the actual staging load-balancer backend; log and review false positives before enforcement. A Cloud Run service must not be directly reachable around the load balancer. Use `internal-and-cloud-load-balancing` ingress, or disable the default URL with correctly constrained ingress, after confirming topology and rollback.
5. Limit bypass paths: review direct `run.app` URLs, Railway/VPS endpoints, alternative domains, public IPs, and WebSocket/API routes. Vendor webhook callbacks need their own signature validation and realistic vendor-origin allowance. An edge rule alone never replaces MySQL per-user spending/credential quotas.
6. Review `FRONTEND_URL`, `ALLOWED_ORIGINS`, CDN caching, cookie scope/SameSite/Secure/HttpOnly, CSRF, no-store headers and OPTIONS preflights. Do not cache authenticated or dynamic API data at the edge.
7. Test at staging: bursts from two genuinely distinct client IPs, repeated requests from one IP, 429 Retry-After handling, anonymous browsing under NAT, login/reset paths, OPTIONS, static content, webhook retries, video access and direct-origin bypass attempts.
8. Configure managed alerting (429 rate, 503 limiter fault, request count, auth error rate, provider cost) and audit logs without emitting raw tokens or passwords.
9. Keep protected GitHub `staging` environment with OIDC least privilege. Verify backup restore and manually review migration `db/migrations/20261021_distributed_rate_limit.sql` before routing traffic. Do not expose database ports publicly.

## 3. Stop/go evidence
| Gate | What establishes completion |
| --- | --- |
| Developer tests | Node CI successful on the **specific** head commit |
| Edge routing | Verified staging Cloudflare/Armor service identity, hostname and attached policy |
| Bypass prevention | Direct-origin external requests denied under verified ingress rules |
| Behavior | Logged 429/503 and negative cross-user tests on running staging service |
| Database | Checked migrations applied in protected staging and backup restoration works |
| Operations | Verified dashboard alerts, rollback, budget controls and human signoff |
| Release | Independent PR review, no known blocker and explicit authorized merge/deploy |

## 4. Scope limitations
This repository does not grant Cloudflare or GCP control-panel access, so **none of the cloud gates above has been executed**. Config examples and local tests do not establish active WAF/rate-limiting coverage. Edge limits are best-effort abuse control, **not** strict billing quota or a replacement for independently verified origin and auth security. The old Cloudflare Worker used broad public-looking cache patterns; do not re-enable until a vetted immutable-asset allowlist, Cache-Control contract and auth-negative tests are available.

## 5. Release review decomposition
PR #96 is too large for single-pass approval. Prepare logical reviews in this order while keeping it a **draft**:

1. **Foundation / build:** lockfile, CI, non-deploy Cloud Build, security workflow, migration correctness. Owner: platform/release reviewer.
2. **Identity / API:** session ownership, CSRF, credential quotas, network-edge limits, legacy REST endpoints, data deletion. Owner: application security reviewer.
3. **Billing / media:** Paystack sandbox verification, idempotent ledgers, vendor caps, private assets and failure/refunds. Owner: payments and security reviewer.
4. **Agent guardrails:** remove executable AI output; inert proposals, isolated CI, human approval, rollback and reliable telemetry. Owner: agent/runtime reviewer.
5. **Education / OMEGA:** provenance, culture/community review, educational boundaries and vocational pathways. Owner: domain reviewer.
6. **Staging / operations:** verified Cloud Run service, protected OIDC, migrations, restore, incident response, observability and privacy. Owner: infrastructure/privacy reviewers.

For actual smaller mergeable PRs, reconstruct each slice **from main**, selecting only its dependent files/commits, then run CI. Do not merge PR #96 and independent slices together without reconciling duplicated changes. Archive a per-slice diff and explicit dependency checklist before approval. No independent slices are represented as reviewed until that has happened.
