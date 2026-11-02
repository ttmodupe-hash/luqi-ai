# Dependency and authentication hardening

Scope: the Railway Node auth boundary, the legacy Python SQLite auth manager,
and the root npm, Bun, standalone app, desktop and Python dependency trees.
Deploying this Node patch does not rotate production credentials, migrate database
rows, change infrastructure, or enable AI/billing. The separate Python verifier
upgrades a legacy password hash only after a successful login, as described below.

## Dependency evidence

Audits of the pre-change trees found:

- Standalone app: 7 npm findings, including 2 critical findings.
- Root Bun lock: 7 affected packages, including critical tinypool findings; the
  lock had drifted behind the already-patched npm manifest/lock.
- Desktop: 9 npm findings, including 1 critical and 8 high findings.
- Python: affected versions in 16 packages in the resolved requirements tree.
  Raw advisory counts contain duplicate aliases and are not unique CVE counts.

The updated trees return no known advisories in local scans. The Python scan
resolves 121 packages with no advisory exclusions. CI audits Python 3.10/3.12,
root npm, the Bun lock, the standalone app and the desktop build tools. Network,
resolution or scan errors fail these new checks. A clean scan is evidence about
known advisories at scan time, not proof of absence of vulnerabilities.

The Bun lock is migrated from the canonical npm lock with Bun 1.4.4, preserving
npm as Railway's package manager. The app and Electron directories now have
committed npm lockfiles. Electron is updated to 45 and electron-builder to
26.15.3. Desktop navigation cannot load a remote page into the privileged shell,
and only HTTP(S) external links may reach the operating system's URL handler.

Python upgrades include FastAPI/Starlette, multipart parsing, Pydantic, HTTP
clients, JWT, PDF and LangChain dependencies. Unused python-jose and the monolithic
langchain requirement are removed; imported LangChain packages are explicit.
Client-construction, prompt/parser, PDF roundtrip and real FastAPI request tests
exercise compatibility without sending AI requests. Full Python tests and
isolated MySQL/Omega CI remain required before merging.

## Authentication changes and compatibility

Node login, `/auth/me` and the shared pilot/private-memory/Omega auth guard require
an explicitly active MySQL account. A null flag fails closed. Login/signup aliases
limit bodies to 16 KiB, including streamed bodies without Content-Length, and
account lookup caps bearer headers. Real MySQL CI checks null and disabled flags.
No account-state migration is performed.

Legacy Python authentication no longer has a default signing key or seeds an
administrator at schema creation. It requires a configured key of at least 32
UTF-8 bytes and rejects the old known default. Tokens require their own issuer,
audience, HS256, expiration, issued-at, credential version and token purpose.
Current SQLite state is checked on every token verification; disabled/deleted
accounts and password/email/role changes revoke both access and refresh tokens.
Refresh tokens cannot authenticate protected API requests. Previously issued
legacy Python tokens must be replaced by signing in again.

New Python passwords use independent random salts and PBKDF2-SHA256 at 600,000
iterations. Successful legacy-password login upgrades only that verified hash,
using a conditional update. Tests verify account preservation and a concurrent
password-reset rejection. No bulk credential rewrites or account deletion occur.

The Railway Node deployment is not changed to run the legacy Python server.
If a separate Python server is deployed, keep the new hash verifier when rolling
back other functionality after any legacy hash has upgraded; the old verifier
cannot read the new format. Prefer a forward fix or rollback to a release that
retains this security boundary. Do not restore the known signing-key fallback.

## Remaining limits

This is not a full route/credential audit. Shared multi-instance brute-force
controls, reviewed admin enrollment/RBAC, historical secret rotation evidence,
remaining legacy endpoint retirement and designated-account production acceptance
remain outstanding. Production backup configuration and restore acceptance remain
deferred. Linux desktop smoke coverage does not replace Windows/macOS/mobile
acceptance, authenticated desktop connectivity or signing/release review.
