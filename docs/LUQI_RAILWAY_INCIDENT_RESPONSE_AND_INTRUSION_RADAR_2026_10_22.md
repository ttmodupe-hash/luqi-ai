# LUQI security response: Railway variable disclosure — 22 October 2026

## Status and confidence
- Railway's 21 October 2026 official notice says some encrypted customer environment variables **may** have been accessed and some decrypted. It recommends rotating **all** Railway-stored credentials and any private registry credentials. This is a **potential** LUQI exposure, not a confirmed LUQI data breach.
- This document does **not** assert that LUQI is running on Railway, that a particular credential was used, that the Railway dashboard is fully restored, or that the crisis has been contained. Connected Railway role access was insufficient to inspect the LUQI project's environment.
- Production configuration, GCP, Railway, payments, DNS and customer databases are not changed by this draft. GitHub CI uses only dummy CI secrets.

Official disclosure: https://blog.railway.com/p/security-disclosure-wednesday-october-21st ; official status https://status.railway.com/

## P0 — urgent human-led incident response, independent of deployments

1. **Record the affected account, project and service inventory** through authorized Railway workspace owners. List **variable names** only for all projects with LUQI, Remix or Omega services. Do NOT export variable values or share credentials in email, chat, tickets or repository files.
2. **Revocation and issuance** — rotate from each upstream provider dashboard, with usage logs and existing live integrations considered. Priority order based on abuse impact: paid Gemini/OpenAI/Anthropic provider tokens; GitHub automation and image-registry credentials; cloud service-account JSONs/OAuth grants; private DB and Redis credentials; storage/S3 credentials; Stripe/PayFast credentials and webhook signing keys; session/JWT/cookie signing secrets, email/SMTP, monitoring hooks and third-party service tokens. Do not assume Railway/Google/OpenAI/Anthropic automatically rotated every credential. Validate independently.
3. For any credential reused outside Railway, rotate all copies too. Remove unneeded keys, reduce scope to one service and its required resources; enable short expiry, rotation schedules, per-key quotas and provider-level budgets. Replace long-lived deploy tokens with OIDC/workload identity where supported; avoid static cloud-admin keys in general-purpose CI.
4. Review provider audit logs and invoices around 21 October 2026 (and an appropriate earlier window). Look for unusual AI inference, token spend, cloud IAM access, DB connections/exfiltration, registry pulls/pushes, CI workflows, new users/roles, webhooks, outbound traffic and key use. Preserve logs, provider support tickets and timestamps in a restricted evidence store; set clear follow-up ownership.
5. Coordinate safe DB/service account cutover without losing data or silently breaking customer payments. Use separate least-privilege users and staged rotation where the provider allows; revoke old credentials when replacements are installed/verified, or immediately where active abuse is suspected. Revoke active sessions when signer keys could be exposed.
6. Confirm that old Railway deployment revisions do not retain usable compromised credentials. Updating a Railway variable alone is NOT equivalent to upstream revocation or confirmation a running service picked up the new value. Verify deployment readiness and control-plane status through official updates.
7. Contact impacted providers and Railway Security if suspicious use is discovered; assess privacy, contractual and payment-breach notification duties with qualified legal/security responders. Do not declare no exfiltration merely because logs are empty.

## Defensive architecture and deception plan

**Four layers, each independently verified:**

- **Identity/keys**: short-lived workload identity, minimal token scope, human MFA, independent authorizers, no secrets in browser builds and sealed secrets only as one defense-in-depth control. Rotation, break-glass recovery and a dedicated secret-management provider when justified.
- **Edge**: Cloudflare WAF, bot management, managed rate limiting and origin lockdown. Application rate limits and AI budgets remain server-side and DB-backed. Never trust arbitrary X-Forwarded-For as verified client identity.
- **App canaries/intrusion telemetry**: optional `api/security/intrusionRadarMiddleware.ts` exposes NO content from known credential-probe URLs. It always returns 404 and records only enumerated fixed categories/method/severity in `intrusion_radar_events`. Login failures can be correlated with a keyed HMAC of normalized account address without persisting raw email or IP. Database-driven one-hour aggregate for authenticated administrators; no simulated incidents.
- **Operations**: route alerts to a real monitored SIEM/pager under independent operator controls, anomaly thresholds and approval workflows; perform authorized forensic investigations and mandatory post-incident review. A defender honeypot is NOT permission to scan, exploit or retaliate against external systems.

### Deliberate limitations before rollout

- This branch adds detector, optional middleware, HMAC correlation and the schema, **but the main LUQI HTTP entrypoint has NOT yet been wired**. The security review gate blocked editing the large existing entrypoint; no active live-protection claim is justified. To activate later in an reviewed staging PR, mount `intrusionDecoyMiddleware()` ahead of application routing; add authenticated-failure event hooks AFTER verified login errors and an admin-only incident-summary endpoint. Do not enable public event querying.
- Do not expose canary tokens or real credential files. The decoy path `/__luqi_canary__/runtime-credentials` returns 404, never an apparent valid password or cloud key; it is synthetic only.
- The correlation HMAC requires a new strong `LUQI_SECURITY_HMAC_KEY` (>=32 bytes), issued via approved secret management. If key is missing, the module records no account-address signal rather than storing raw PII. Rotate this key during incident response too. Never commit its value.
- Observation does NOT prove malicious intent, bot identity, IP attribution, or exploit success. WAF false positives, unmonitored traffic and Railway provider-side secret exposure are outside this detector. There is **no automated account lockout, attack back, browser fingerprinting, raw request data collection, or supposedly unbeatable security**.
- MySQL table is not immutable; apply migration only to backed-up staging, test restore, configure retention (e.g. 30 days subject to local law and incident preservation), access control, encryption, per-service network policy, monitored SIEM export and replica-safe deployments.
- App-side detection cannot prevent vendor-side disclosure of stored environment variables. Only upstream key invalidation/reissue, identity restrictions, vendor-side logging and platform hardening can address that incident.

## CI scope and acceptance

- Unit: path probe detection/false positives; provider-free 404 decoy middleware even if storage unavailable; deterministic rotating account HMAC; no raw username/secret in event records; no fraudulent clean summary.
- Dedicated ephemeral MySQL: migration, insert, repeated failed login correlation and genuine aggregate without persistent email or test tokens.
- Node.js check and security test workflows must pass on exact head.
- **Further tasks not done here:** approved HTTP wiring, real provider logs, actual cloud access inspection, secret rotation, managed WAF policy cutover, SIEM integration, on-call alert routing, pentest with explicit scope and audit, independent staging verification.

**Never invent a 100% breach-proof system. Defense relies on layered controls, fast detection, containment and recoverability.**
