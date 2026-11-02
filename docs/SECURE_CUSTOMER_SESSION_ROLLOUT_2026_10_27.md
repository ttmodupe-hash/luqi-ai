# Secure mobile session restoration — release hold

27 October 2026. PR #315 addresses issue #312. **Draft; production restoration remains disabled.**

### 28 October: current Chat integration

The owner again requested no repeated login while using Luqi and collaboration tools.
This candidate now includes the deployed midnight-blue Chat, bottom-right Circles
panel, preferred account name and language controls from main `6c1cedb0`.
Signup accepts the preferred name and
the separate explicit private-device choice together. A verified restore retains
the saved name. Short-lived token rotation within the same signed device family
preserves the in-tab conversation and provider acknowledgement; a fresh family,
another account, sign-out or reload still clears them. Suspended-tab restoration
hides private controls while retaining their mounted drafts until the result is
known. Cookies do not authorize messaging, presence or paid inference.

The operational holds below remain open. This change updates the disabled
candidate; it does not enable production restoration or messaging, claim physical
phone acceptance, or weaken replay, expiry, CSRF or account-isolation checks.

## Reviewed implementation

- Persistence requires the unchecked **Keep me signed in on this private device** choice, the explicit JSON boolean `rememberMe: true`, a verified login/signup, and `LUQI_CUSTOMER_RESUME_ENABLED=true`. Existing clients and unremembered logins retain memory-only 24-hour bearer behaviour.
- Remembered access JWTs last 15 minutes and live only in React memory. Every protected request checks active account, current credential version and the current, unrevoked device family. Cookies never authorize Notes, Chat, password changes or other private APIs by themselves.
- `POST /api/v1/auth/session` requires an empty JSON object, exact Origin scheme/host/port, `Sec-Fetch-Site: same-origin`, JSON content type, no query string and `X-Luqi-Session-Intent: restore`. Missing metadata, cross-site/same-site origins, GET/HEAD and unexpected ports are rejected. Credentialed CORS remains disabled and the custom intent header is not offered to cross-origin clients.
- The host-only `__Host-luqi_resume` cookie is Secure, HttpOnly, SameSite=Strict, Path=/, has no Domain and never outlives its original 24-hour server deadline. A separate readable yes/no/pending hint contains no identity or credential and never authorizes requests.
- A dedicated `customer_device_sessions_v1` table stores only keyed HMAC-SHA-256 digests of 256-bit random refresh secrets, an independent device-family identifier, durable owner, issued/last-used times, absolute and 12-hour idle deadlines, rotation counter and consumed/revoked state. Historical `sessions` rows are neither read nor adopted as remembered credentials.
- Restoration locks the current row and owning user in an InnoDB transaction, consumes the old credential and inserts the successor. It cannot extend the absolute deadline. Consumed-token replay revokes the whole family, including a concurrent winner. Replayed/expired/disabled sessions cannot restore. Replay audit messages contain no account identifiers, secrets or customer text.
- Browser refresh is one-shot. A shared in-flight promise handles StrictMode; Web Locks serialize restore, logout and new login/signup across supported tabs, preventing a late response from overwriting the newer account cookie. An inert `pending` hint prevents automatic replay of an uncertain refresh after reload. Failed restoration requires explicit sign-in; it never issues an AI request. A visible active app refreshes its short-lived access token before expiry; suspended-app expiry hides private tools until restoration is verified.
- Logout revokes by the protected cookie and/or verified bound bearer, regardless of whether the readable hint exists. It never claims server revocation after a DB error. Account switching revokes the old cookie family even when the new account declines persistence. The owner-scoped bearer endpoint `POST /api/v1/auth/sessions/revoke` cannot revoke another customer's family.
- Current-password changes and operator-assisted password resets revoke device rows in the same transaction as the credential update while the feature is enabled. Credential-version binding also rejects former tokens after any password-hash change. A disabled-account restore revokes all of that owner's device families. Operators must perform account disabling and device-family revocation atomically; re-enabling an account must not reactivate its old device families.

## Database and privilege preflight

Canonical Railway project: `kind-spontaneity` (`9f627cb8-3136-4b30-89d2-32ca648a1e5f`); production environment `1e192ef3-1fa6-4684-81fc-60165c7b0e22`; `web` service `a9b293e0-1966-43be-80ef-3dd27acc6ab7`; `MySQL` service `8094576f-f2c7-4e50-b474-69661e7c0ba8`. Do not use `html-public-test` or another project.

1. Keep the flag OFF. Independently inspect the exact release, existing account/session usage, backup completeness and recovery evidence. The additive migration is `db/migrations/customer-device-sessions-v1.sql`; it is never invoked by startup, bootstrap or flag activation. Do not alter or copy historical sessions or reset accounts.
2. The authorised database operator reviews/applies that isolated migration after confirming the actual `users.id` type, engine and approved recovery path. The migration creates only the new table, full-length binary-collation digest primary key, owner foreign key, family/owner/expiry indexes and expiry/rotation constraints. It intentionally has no `IF NOT EXISTS` shortcut hiding a mismatched existing table.
3. On the dedicated web identity, approve **only SELECT, INSERT, UPDATE on customer_device_sessions_v1**. Runtime DELETE, DDL, global/database-wide grants and GRANT OPTION are unnecessary. Expired-history purging remains an operator maintenance action. No access to historical sessions is required by this feature.
4. Run the bundled schema checker with the **restricted runtime connection**, `LUQI_CUSTOMER_RESUME_ENABLED=true` only in that isolated check process: `node dist/prepare-mysql-schema.js --check`. It reads schema, binary collations, owner foreign key, transactional engine, full digest key, active roles and exact session-table privileges. It writes no rows or grants. An enabled production boot performs the same read-only checks before listening. Run `node dist/prepare-mysql-runtime-role.js --check` in the authorised operator context to independently verify the full expected web grant set. Neither check provisions or repairs anything.
5. Complete an approved production-derived restore drill on an encrypted operator workstation, with the feature table explicitly required: `python3 scripts/verify-local-mysql-backup.py --backup <private-export.sql.gz> --sha256 <independently-recorded-hash> --source-kind production-derived --report <new-private-report.json> --require-device-sessions --execute`. Never copy production backups, raw credentials, logs or customer content to public CI. Import/readability alone does not establish source completeness; record both independently.
6. Retain consumed/revoked rows at least until their original absolute expiry so replay remains detectable. Review aggregate row growth and expiry-index use; purging after expiry is operator-only. Keep encrypted backup retention proportional to policy and account information needs.

The connected Railway OAuth read tools expose platform state and variable names, not a SQL connection or credential values. Direct platform reads cannot prove SQL grants or a production-derived restore. No production migration, grant or flag change is made by this correction.

### 28 October continuation: private metadata inspection

The reconciled candidate uses one grant definition for sessions, P2P, Omega and the project vault. Previously the P2P preflight omitted the session-table grant and would reject the combined configuration. Session and P2P boot/schema checks are now preserved together; both production flags remain OFF.

`ops/Dockerfile.db-check` and `scripts/inspect-release-database.ts` provide a separate, one-shot, read-only checker. It is never an HTTP handler or web startup command. A private Railway service named `luqi-release-db-check` must match the canonical project/environment and an explicitly pinned source commit. Opaque Railway references supply the existing web connection and MySQL operator connection directly inside Railway; credential values are never exported to chat, local files, source, browser or public CI. No public domain or database TCP proxy is needed.

The checker sets both SQL sessions to READ ONLY and reads only schema, zero-row column projections and grants. It compares the actual restricted identity, active roles, existing feature-table metadata and combined expected grant set. Its bounded JSON report contains checks, fixed table names, a schema fingerprint and the source commit; no customer rows, raw grants or secrets. Missing/extra privileges are reported and never repaired. A fresh production report must be recorded before it can count as operational evidence. CI tests use only the exact disposable database and prove inspection does not change its grants.

This checker does not verify backups, report-key recovery, real school/adult eligibility or physical-phone reopening. A successful inspection is not permission to enable either feature; all remaining rollout gates below still apply. Creating or altering production tables/grants is a separate, explicitly reviewed operator step, not part of inspection.

## Automated evidence and acceptance still required

The security workflow uses a disposable MySQL 8.4 service and a separate restricted fixture identity, with no provider keys or production URLs. It verifies opt-in, real rotation/replay/concurrency, account separation, bearer-only private API access, device logout, expiry, disabled accounts, atomic password/revocation rollback and missing grants. It exports/restores the complete fixture including device history into a new isolated database and compares full logical content. A second job exercises the compiled SPA, actual API and restricted MySQL over HTTPS in mobile Chromium and iPhone-sized WebKit. This is synthetic browser evidence, not a physical-phone PWA acceptance.

Before merge/release: all required checks must pass on the exact corrected PR head, security/schema review must be recorded, and the production operational checks above must be independently completed. Keep #312 open and #315 draft while those gates are unmet. Do not substitute a green ordinary MySQL/WebKit workflow for session-enabled coverage.

Before enabling on production: independently accept real iOS **and** Android installed-PWA close/reopen, access renewal after suspension, 12-hour idle and 24-hour absolute expiry, sign-out/reopen, credential change, disabled account/re-enable, two devices, explicit device revocation, account switch, offline/uncertain refresh, missing permissions and stolen-cookie replay. Test multi-tab concurrency on devices both with and without Web Locks. A replay race may deliberately require fresh credentials. Review support/recovery handling and confirm no automatic provider, Notes or payment writes.

## Rollout and rollback

Only after the gates are recorded may the existing owner-authorised release advance. Verify the exact merged commit reaches canonical Railway SUCCESS and recheck HTTPS health/readiness and customer paths. Feature activation remains separate from deploying disabled code.

Rollback first disables `LUQI_CUSTOMER_RESUME_ENABLED`. Bound bearer tokens fail closed immediately, restoration is refused and cookies are cleared on the next verified same-origin session request. Ordinary memory-only login remains available. Do not drop tables, reset accounts, change signing secrets, or broaden database/CORS privileges as a rollback shortcut. Retain the table and replay history for investigation/recovery.

Existing accounts, customer information, AI budgets, provider configuration and payment settings must remain unchanged. This feature does not establish paid-launch readiness.

### 29 October 2026 — reconciliation with current main and explicit customer UI gate

Integrated onto current main in PR #356, preserving the public-service release (#353) and
frontend/PWA recovery (#355). **Production remains disabled**: the required runtime
`LUQI_CUSTOMER_RESUME_ENABLED` variable and separate build-time
`VITE_LUQI_CUSTOMER_RESUME_UI_APPROVED` flag must both be explicitly reviewed
and enabled in the rollout. Ordinary production builds hide the opt-in
checkbox rather than implying it works while the server feature is off.
The isolated real-MySQL HTTPS browser fixture builds with the UI test flag
only and activates the reviewed backend against disposable MySQL; this does
not give production access. Continue to require current production-derived
isolated recovery and physical installed-device acceptance before turning on
any customer session persistence. None of the old 24h memory-only sessions
or P2P/payment/provider budgets are altered by the disabled code.
