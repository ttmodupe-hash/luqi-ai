# Account credential recovery and authentication rollout

New login tokens are scoped to LUQI, expire after 24 hours, and contain an HMAC
of the account ID and current stored password hash. The hash itself never leaves
the server. Account lookup and paid-pilot authorization compare the token with
the persisted credential. A committed password reset invalidates previous
tokens on subsequent authorization checks; requests authorized before the reset
may already be in flight. Old unscoped/unbound tokens require signing in again.

## Operator-assisted recovery

This release provides an operator CLI, not an automated email reset service.
It can recover accounts whose legacy passwords exceeded bcrypt's 72-byte limit.
The CLI cannot establish ownership: an authorized operator must verify identity
through an independent trusted channel before running it. Knowing an email
address or having an existing session alone is insufficient ownership evidence.
Never ask users to send passwords, API keys or database credentials in chat,
email, screenshots, tickets or command-line arguments.

1. Confirm the recovery build is deployed and live MySQL is reachable. Use a
   trusted interactive shell on the production web service with its existing
   environment variables. Do not copy production secrets to a workstation.
2. Record the request and identity-verification evidence in the restricted
   operational audit trail, excluding passwords. Confirm the account ID and
   email against the verified identity before resetting anything.
3. Run `node dist/reset-account-password.js` in that interactive terminal.
   Pipes and command-line arguments are refused. Enter the verified ID/email,
   confirm `RESET <id>`, and enter the new password twice at the hidden prompts.
   The new password must have at least 12 characters and no more than 72 UTF-8
   bytes. It must differ from the old effective password.
4. The CLI locks the matching active user, changes its password, and deletes
   that user's stored sessions in one InnoDB transaction. Any failure rolls
   back both operations. It never enables a disabled account, changes roles,
   or deletes conversations, quota counters, or other account data.
5. Deliver any operator-established replacement credential only through an
   approved secure credential-transfer mechanism. Ask the account owner to
   sign in. Confirm old tokens are rejected and record the completion time and
   account ID in the restricted audit trail. Never log the new password.

No production account is reset by deployment, CI, or this runbook. The CLI has
no HTTP endpoint and requires existing trusted production shell/DB access.
Self-service recovery and verified email delivery remain separate work.
An authenticated change of a known password is described below.

## Failure and rollback

`ACCOUNT_UNAVAILABLE` means the ID/email pair did not match an active account.
`PASSWORD_REUSED` requires a different password. `RECOVERY_UNAVAILABLE` means
the transaction or required InnoDB storage was unavailable; no success is
reported. Connection details and raw database errors are withheld.

Keep this credential-bound verifier during rollback. Reverting to an older
verifier could make pre-reset tokens usable again. If an emergency rollback to
old authentication code is unavoidable, coordinate signing-secret rotation
and a full sign-in reset; do not restore old password hashes. A code rollback
does not call for reverting the database or replacing its volume.

## Verification

Offline tests cover strict JWT claims, credential-version mismatch, malformed
inputs, missing DB access, and refusal of nontransactional tables. A terminal
smoke test proves hidden input and refusal of pipe/argv-driven resets. Isolated
MySQL CI exercises a legacy long-password account, successful recovery, old
token rejection in `/auth/me` and paid-pilot authorization, unchanged account
fields, preserved other users' sessions, disabled-account refusal, and a forced
session-deletion failure that must roll back the password update.

These tests are not a claim that a production recovery or identity verification
has been performed. Backups and external deployment-trigger verification remain
separate release responsibilities.

## Change a known password

A signed-in user can open **Notes → Change password**. This requires the current
password; it is not a forgotten-password reset or identity-verification channel.
`POST /api/v1/account/password` accepts only `currentPassword` and `newPassword`,
requires an active persisted credential-bound session before parsing, and refuses
query fields, non-JSON input and bodies over 4 KiB. New passwords must have at
least 12 characters and no more than 72 UTF-8 bytes. Current inputs above 72
bytes are refused rather than truncated; legacy overlong passwords require the
operator-assisted procedure. The new password must differ from the old one.

Durable MySQL admission permits 20 changes/attempts globally per minute and five
per authenticated account per 15 minutes, separate from login/signup limits. The existing scope ENUM is unchanged:
password changes use its login scopes with a reserved global key and a separate
HMAC namespace for account keys. They do not share login counters.
Every valid attempt, including a success or wrong current password, counts.
Missing throttle storage fails closed; no caller IP header can reset a counter.
Shared global limits can temporarily deny other users under abuse.

The server rechecks the JWT against the fetched credential, verifies the current
password, hashes the new password with bcrypt cost 12, then atomically updates
only that active account if its former hash still matches byte for byte. No row
lock is held during bcrypt. A simultaneous reset, password change or account
disable cannot be overwritten. No schema, grant, billing, provider or note change
is required. Legacy session rows are not deleted by this flow; all reviewed web
account endpoints reject tokens bound to the former hash on subsequent checks.
Already-authorized requests may finish. Do not roll back to an unbound verifier.

Success returns only `{changed:true,signInRequired:true}` and no replacement
token. The page clears its sign-in and saved view and requires a fresh login.
A lost response or service error may follow a committed change: the client never
retries automatically and asks the user to try the new password first, then the
previous password if needed. It clears password fields as the request begins,
limits the full response to 4 KiB and 20 seconds, cancels on unmount and ignores
late responses. Drafts and uncertain saves block starting a password change.

Offline checks cover authorization, field/UTF-8 bounds, rate-denial ordering,
credential races, redacted failures, uncertain responses, transport bounds and
form behavior. Disposable MySQL CI exercises competing changes, disable-during-
hashing, update failure, durable limits, old-token rejection and unchanged notes.
The compiled restricted-runtime fixture and desktop/mobile browser journeys
also exercise the flow. These are synthetic accounts, not an assertion that a
production user's password or infrastructure secret has been changed.
