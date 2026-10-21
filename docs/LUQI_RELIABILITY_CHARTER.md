# LUQI Reliability Charter — release gates and truthful operations

## Non-negotiable principles
1. Never report a message delivered, file uploaded, payment completed, call connected, learning objective mastered, or video rendered without server-side or independently checkable evidence.
2. Errors must be visible, actionable and logged without leaking secrets or personal data. Distinguish failure from unknown state.
3. All expensive, financial and irreversible actions need authenticated authorization, ownership validation, idempotency, limits and audit trails.
4. Self-healing agents may retry bounded, idempotent operations, gather diagnostics and propose patches. They may not silently deploy, spend money, alter financial records or change security controls.
5. The AI companion clearly identifies itself as AI; unsupported claims must be qualified or backed by citations. No fake humans, calls, online badges, certificates or exam pass guarantees.
6. Use privacy-by-design, data minimisation, consent, retention limits, secure access and incident response.

## Proposed SLOs (targets, NOT achieved measurements)
- Authenticated messaging API: 99.9% monthly successful requests; p95 accepted-message acknowledgment < 1 second under defined load. Server accepted ≠ recipient delivered/read.
- Presence: heartbeat expiry <= 90 seconds; distinguish invisible/unknown/offline. Never assert online from expired data.
- Voice/video calls: display connected only after verified media/session state; track successful connection rate, setup time, ICE failures and TURN usage.
- Study progress writes: no acknowledged write without durable commit; test recovery and duplication.
- Critical APIs: defined latency, availability and error-budget thresholds per route; alert on elevated failures.
- No release if authorization tests, payment safety checks, secret scanning or critical TypeScript checks fail.

## Engineering gates
A. Baseline: reproduce current TypeScript/build/test errors, label pre-existing versus newly introduced.
B. Contracts: state machine tests, edge cases, authorization and invalid-input tests.
C. Integration: authenticated backend, durable database, reconnect/retry and access isolation tests.
D. Fault injection: dropped network, stale session, duplicated requests, failed uploads, provider timeout, service restarts, call signaling failures.
E. Security: ownership checks, abuse throttling, attachment scanning, privacy review, credential rotation and audit.
F. Observability: structured logs with correlation IDs, service-level metrics, alerting, error budgets, incident runbooks.
G. Staging: end-to-end tests across browsers and low-bandwidth mobile networks; accessibility and recovery.
H. Production: only after user authorization, green gates and a tested rollback. Monitor release, halt on regressions.

## Reliability reporting
Publish a dashboard with actual measured uptime, latency, errors, message acknowledgments/delivery, call connect rates, learning persistence and incident history. Show 'no data' rather than 100% when instrumentation is absent. Label targets separately from observed performance.

## Immediate risk register
- Legacy video top-up endpoint and guest identity paths require authorization/payment verification before any costly production operation.
- LUQIChat currently has domain contracts, not authenticated realtime messaging or calls.
- Academy exercises include simplified explanatory models, not production-grade protocol emulation.
- Recently added TypeScript tests and UI have not been validated by CI; do not assert successful build.

## Execution order
1. Obtain reproducible build/test baseline.
2. Fix new TypeScript regressions and security-critical API paths.
3. Wire authenticated, durable messaging and presence with integration tests.
4. Implement safe document handling and verified WebRTC calls.
5. Add AI tutoring with explicit uncertainty and evidence controls.
6. Review metrics and authorize a staged rollout. No merge/deploy without explicit approval.
