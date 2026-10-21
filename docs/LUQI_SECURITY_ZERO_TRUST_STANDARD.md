# LUQI Security Standard — Zero Trust and Defence in Depth

**Status:** Security requirements and proposed controls, NOT certification, penetration-test results, or proof of breach-free operation.

## Absolute rules
- Never promise an unhackable service or zero breaches. Reduce attack likelihood, detect incidents and contain damage.
- All user and admin access requires verified authentication, short-lived sessions, least privilege, server-side authorisation on every request, and ownership checks for every object.
- Sensitive operations (billing, credit top-ups, rendering, document access, admin changes, AI-agent actions) require explicit authorisation, audit logs, rate limits, replay protection and idempotency.
- Store credentials in a managed secret store, never source control, browser bundles, logs, chat messages or CI artifacts. Rotate compromised secrets and review historical exposure.
- Encrypt traffic using TLS; encrypt stored sensitive data; maintain tested backups and key management. Do not claim end-to-end encryption without independent verification.
- Validate inputs and file types server-side; scan attachments in quarantine, serve through short-lived scoped URLs, apply upload and download limits.
- Default-deny network access, restrict database exposure, use service identities and separate development, staging and production environments.
- Implement privacy-by-design for POPIA and applicable jurisdictional requirements; document retention, deletion, consent and data-subject requests.
- Audit third-party processors and AI providers for data retention, training use, geographic transfers and incident notification.
- AI agents operate with bounded permissions and human approval for deployment, payments, financial records, secrets and security-policy changes. No autonomous permission escalation.
- Separate payment processor webhooks from client claims: verify signatures and event identity; never credit accounts on an unverified client request.
- Log security-relevant events without personal secrets, passwords, access tokens or raw confidential prompts.

## Security release gates
1. Reproducible build, unit tests, typecheck and integration tests.
2. Secret scanning and dependency vulnerability review. Any high/critical finding must be remediated or have an explicitly documented, time-limited risk acceptance by an authorised owner.
3. API authorisation tests for unauthenticated access, cross-tenant IDOR, admin escalation, repeated requests and forged billing callbacks.
4. Security headers, CSRF/cookie protection where relevant, strict CORS, session expiry, request limits and safe error responses.
5. File upload and AI prompt-injection abuse testing; outbound network restrictions and cost caps.
6. Staging penetration test and remediation before sensitive production functions are enabled.
7. Verified cloud IAM, domain/DNS ownership, managed secrets, monitoring and rollback; release approval recorded.
8. Backups with actual restore drills, incident response tabletop exercise and defined recovery objectives.

## Incident response
- Detect and triage suspicious access or billing anomalies; preserve evidence and isolate affected identities/services.
- Revoke and rotate exposed credentials; suspend unsafe endpoints; determine scope from immutable audit logs.
- Assess legal and contractual notification duties, including POPIA, without inventing deadlines.
- Restore from verified clean state, test integrity, communicate confirmed facts and publish a corrective-action report.

## Immediate priority risks
- Legacy video operations have been fail-closed on the development branch only; production and default branch remain unverified.
- No evidence of a completed independent penetration test or production threat model.
- CI checks are not substitutes for runtime security, cloud IAM validation or a third-party assessment.
- Do not enable real-time chat, video calling, attachments or payment settlement until their security controls and ownership tests pass.

## Metrics to measure, not assume
Unresolved high/critical findings; privileged access reviews; security-event detection and response times; patch lead time; failed login/rate-limit events; backup restoration success; access-control test coverage; incident recurrence.
