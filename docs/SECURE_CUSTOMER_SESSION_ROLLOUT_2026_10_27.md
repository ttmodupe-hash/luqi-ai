# Secure customer session restoration — rollout hold (27 October 2026)

Status: **DRAFT, NOT ENABLED IN PRODUCTION**. This feature must never be activated by simply copying a flag without review.

## The customer experience being prepared

After a verified same-origin login or account creation, the browser may receive a 24-hour `__Host-luqi_resume` cookie (Secure, HttpOnly, SameSite=Strict, Path=/, no Domain). Its 256-bit random secret is stored only in the cookie; a SHA-256 domain-separated digest is stored in the **existing** MySQL `sessions` table. An additional inert readable `__Host-luqi_resume_hint=1` allows the SPA to avoid requesting resume for unauthenticated guests.

On a full page reload, exactly one bounded `GET /api/v1/auth/session` with same-origin credentials and a custom intent header can return an authenticated bearer JWT to React memory. Every new JWT is bound to the persisted session digest, active user status and current bcrypt-credential version. Explicit `POST /api/v1/auth/logout`, with same-origin header and strict CSRF/origin checks, revokes its digest row. Password changes invalidate the HMAC bound to the user's old bcrypt hash. No bearer token, cookie secret or private account content is persisted to localStorage, sessionStorage, URL, service worker or analytics. No AI/provider call or paid retry is ever made by session restore.

The old 24-hour bearer-only pilot continues functioning while the feature is disabled and remains subject to its established limits. Sessions from old clients must not be granted persistence without the reviewed header. Any unconfirmed server logout is exposed as a warning instead of claiming revocation.

## Operator preflight before enabling the feature (NOT performed by this PR)

1. Independently confirm the canonical Railway `kind-spontaneity` production `web` and MySQL service identities. Do not use `html-public-test`, `comfortable-illumination` or its mislabeled Postgres service.
2. With the authorised database operator, verify the **existing** `sessions` table is InnoDB, has the exact expected columns and unique full-length token key, and that the actual web runtime identity will have only `SELECT, INSERT, DELETE` on that table. The current restricted runtime role does **not** have this grant. This PR does not run GRANT, CREATE USER, ALTER, migrations or backups. Do not change `DATABASE_URL` or request any secrets in chat.
3. Perform an isolated production-derived recovery drill and historical access/credential review separately. Existing synthetic MySQL fixture tests do not count as production restoration.
4. Exercise anonymous CSRF denial, account A/B isolation, old signed JWT compatibility, signup atomicity, password change, explicit server logout and stolen-cookie/expired-cookie rejection on a safe isolated environment. Verify login under existing rate limits and no cookies on unexpected responses.
5. Test on one physical Android and one physical iPhone: normal signup/login, full reload/home-screen reopen, expiry after 24 hours, explicit logout/reopen, password change/reopen, private notes, Chat consent and no unprompted provider POST.
6. Only after all gates pass and with owner/operator activation decision, set `LUQI_CUSTOMER_RESUME_ENABLED=true` in canonical Railway production. Independently recheck deployed commit, `/v1/health`, `/v1/readiness`, failed-login behavior and customer-path HTTPS. A missing grant fails closed; never silently store bearer tokens in a browser.

## Safe rollback

Disable `LUQI_CUSTOMER_RESUME_ENABLED` without weakening public/session/API protections. Existing cookie sessions cannot restore when the flag is off; explicit logout still attempts revocation. The operator reviews session-row retention and active-session cleanup separately. Do not drop the table or reset accounts. Every event must remain within existing AI USD 300 budget: Gemini USD 165, OpenAI USD 135. Session tests do not invoke providers or modify billing.

Related: issue #202, proposed PR #315. This staged work alone is not launch readiness.
