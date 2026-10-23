# Shared web authentication protection

The Railway Node service previously had a bounded, process-local `/api/*`
throttle. `/auth/*` aliases bypassed it and replica restarts reset its state.
It is still an outer abuse filter; durable authentication admission now lives
in MySQL and applies to all five public login/signup aliases.

| Operation | Shared global admission | Per account/identifier |
|---|---|---|
| Login | 120 attempts per 60 seconds | 10 attempts per 300 seconds |
| Signup | 20 attempts per 60 seconds | 5 attempts per 3,600 seconds |

Windows begin on the first admitted attempt and use MySQL's clock. Blocked
requests do not extend a window. All valid attempts count, including success;
a known password cannot repeatedly reset the quota. Signup limits do not
change account activation or consume login counters. These conservative pilot
defaults need operational review before larger public traffic.

Every request reserves global admission, resolves the account with MySQL's
actual email comparison, then reserves its subject counter in one InnoDB
transaction. Case/accent variants of an existing account therefore share a
counter even when the database collation equates different strings. Unknown
emails use a normalized email identifier. Subject keys are domain-separated
HMACs under the existing signing secret; no emails, IPs, passwords or tokens
are written to the throttle table. All replicas must use the same signing
secret. Rotating it creates new subject keys; global limits remain shared.

The guard does not trust caller-provided `X-Forwarded-For`, `X-Real-IP` or
Cloudflare headers. Trusted ingress/IP-based controls and MFA remain separate
work. Account-specific limits can still be abused to temporarily deny login;
the guard never permanently locks an account or invalidates an existing
session. Shared global limits can also affect legitimate traffic during an
attack. Layered ingress protection and monitored tuning are needed before
scale; this is not a complete credential-stuffing or DDoS solution.

HTTP 429 includes a generic `AUTH_RATE_LIMITED` response, `no-store` and a
positive `Retry-After`. Missing storage, queue exhaustion, transaction failure
or missing signing configuration denies authentication with HTTP 503. No
in-memory fallback, automatic password retry or simulated success exists.
Unknown/disabled accounts perform password comparison against a synthetic
non-account hash when needed, instead of taking the previous immediate return.
This reduces a timing distinction; it is not a constant-time guarantee.

The companion frontend displays a bounded numeric retry time, clears its
password field and makes no automatic retry. Server diagnostic text is never
rendered. Both frontend source trees stay identical.

## Migration and operations

`db/migrations/20261023_auth_attempt_windows.sql` adds one table without
rewriting accounts. The identical DDL is in the explicit operator bootstrap, making 38 tables
in the current Node schema. Rollback can leave this unused table intact; do not
delete it or roll back to older unsafe payment/auth handlers merely to clear
an auth error. Deployments should validate storage before accepting login.

The dedicated throttle pool has four connections and a bounded queue of 32.
Reservations release their transaction before bcrypt. Global admission bounds
creation of new subject rows. Every twentieth admitted global attempt removes
at most 100 counters expired for more than an hour. Cleanup is best effort:
with no traffic or a cleanup failure, old counters remain longer. Backups also
retain them according to their own retention policy. No user data is deleted
by cleanup. A future restricted runtime credential needs SELECT on users and
SELECT/INSERT/UPDATE/DELETE on this guard table; schema creation belongs to
the deployment/migration identity. Production least-privilege provisioning is
still outstanding.

## Verification scope

Local route tests cover all aliases, failures before password work, generic
denials and private retry responses. Real-MySQL CI tests cover concurrency
across independent pools, bootstrap/reconnect persistence, collation aliases,
expiry without sleeping, success not resetting limits, global cardinality,
transaction rollback, unavailable storage and bounded cleanup. The existing
restore fixture now includes a guard counter and compares all 38 tables and
their complete logical contents. Browser fixtures test the throttled sign-in
message with a keyboard at 320px.

All CI databases/accounts are disposable. These checks do not establish a
production-derived restore, live human sign-in acceptance, complete historic
credential rotation or full authorization of remaining legacy services. AI
providers and billing remain disabled. The legacy Python service is outside
this Node guard and must stay isolated until separately reviewed.

Design references (checked 2026-10-23):
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
