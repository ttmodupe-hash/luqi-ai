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
Self-service recovery, verified email delivery, and an authenticated user-facing
password-change flow remain separate work.

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
