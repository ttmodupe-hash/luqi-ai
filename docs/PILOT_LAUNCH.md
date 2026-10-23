# LUQI first-user pilot

The pilot entry route is `/#/start`. It introduces two usable paths: the
browser-based physics lab without an account, and account-owned conversation
notes with registration/sign-in. It is not a full AI product launch.
An optional `/#/ai-trial` page provides a separate, signed-in text request
with explicit provider processing acknowledgement and configuration checks.
The page can remain paused; its presence is not proof of a successful AI reply.

## First-user acceptance

1. Open the public app and choose **Get started**. On mobile, confirm that both
   choices, the feature limits and help links remain readable and reachable.
2. Try the physics lab without an account. Change the string length and pause
   and resume the simulation. The AI tutor remains unavailable.
3. Create a notes account with an email you control and a unique password.
   No verification email or automatic password-reset email is sent. Keep
   recovery arrangements private with the verified operator who invited you.
4. Create a notebook and save an ordinary test note. Reload, sign in with the
   same account and verify that the saved note is still present.
5. Export the selected conversation and inspect the JSON locally. Confirm a
   deletion and check that the active records disappear. Delete the downloaded
   file separately if it is no longer needed.
6. Sign out and check that the page clears the email and private history.
7. For the owner-approved AI trial, check its current configuration status,
   sign in and acknowledge provider processing before one ordinary test question.
   Verify the real reply and provider, attempt counters and actual billing
   separately. Do not send sensitive notes or use a synthetic browser reply as
   production inference evidence. A failed/lost reply must not be retried automatically.

The session token remains in page memory. Navigation/reload ends the session;
no persistent browser login or draft recovery is promised. Registration has no
automatic retry. If its response is lost, the form keeps the account outcome
uncertain and offers explicit sign-in rather than creating more accounts.

## What the checks establish

The normal browser suite uses synthetic HTTP responses for error paths,
registration acknowledgement, mobile/keyboard controls and public information
pages. The dedicated MySQL browser suite uses the real production bundle,
HTTP server and restricted MySQL account from the disposable integration
fixture, with no API response mocks. It creates an account, writes/reloads/
exports/deletes notes and checks duplicate signup on desktop and mobile.

The latter refuses a caller-selected public URL and requires the exact
loopback CI fixture and GitHub Actions flag. It never runs against production
or makes paid provider calls. Browser fixtures are not designated human-account
acceptance, legal review, a penetration test or a production restore drill.
The separate AI page browser fixture also uses synthetic provider HTTP. It
checks explicit submission, mobile layout and session clearing without a paid call.

## Wider release gates still open

- Verify a designated human account and the recovery procedure on production.
- Publish a verified private support contact and operator identity; replace no
  missing contact with an invented mailbox. Public GitHub issues are for
  technical reports only and must not contain private account information.
- Review privacy/use information, data retention and whole-account erasure
  before collecting sensitive information or inviting a broad audience. The
  pilot pages make no compliance certification or commercial-licensing claim.
- Complete the dedicated production database identity, historic credential
  rotation and production-derived recovery acceptance in issue #144.
- Owner approval for the $100 ceiling ($60 Gemini / $40 OpenAI) was granted
  on 2026-10-23. The authenticated text trial is enabled with $60/$40 provider
  project caps, auto-reload OFF and matching deployed masked key identifiers.
  Complete a designated-account budgeted request and reconcile actual usage
  before a broad AI launch. Successful metadata/configuration checks do not
  establish generation or measured billing.
- Complete the remaining Omega domain adapters, worker rollout/operations and
  evaluated outcomes. Production intake and workers remain disabled.
- Complete source-grounded African-language evaluations with native reviewers.

Do not send invitations or promise a public AI launch based only on green CI
or runtime health. Record direct production evidence alongside these limits.
