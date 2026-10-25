# Omega task dashboard

The shared web frontends expose `/#/omega-tasks` through navigation, workspace
search and the Omega card. The page now offers two no-account browser calculators alongside a separate
authenticated task-history viewer, reviewed queue submission and queued-task
cancellation when intake is enabled. Local calculations are not saved. The
page does not execute workers, enable providers, activate billing, apply
migrations or provision services.
Production intake and workers remain disabled.

## User flow and outcome boundaries

- Sign in with an existing LUQI account through the existing login endpoint.
  The dashboard keeps the token and task data only in component memory, with no
  local/session storage, cookies or provider calls. Leaving the SPA route or
  reloading requires a new sign-in. Signing out does not erase stored records.
- Check authenticated availability first. Disabled intake stops here without
  reading task storage. Configured intake reports that worker activity is not
  verified; it never labels an agent as online or promises execution.
- Load 20 account-owned records per page. Pagination uses the API's UUID cursor
  and is explicitly described as reference order rather than chronological order.
  Refresh is manual. Opening a record fetches its latest stored detail.
- Show a result only for a completed task with a valid matching response contract.
  Travel totals remain decimal strings; vehicle schedules distinguish remaining
  and overdue distance. Dates and numbers are supplied by the task, not live feeds.
  Unknown handlers, versions, states, contradictory outcomes, mismatched IDs and
  malformed result data fail closed with a generic error.
- Cancel only pending or retry-wait tasks after an explicit confirmation. Success
  requires the requested ID and a cancelled state in the response. If cancellation
  races with execution, times out or loses its acknowledgement, show an unconfirmed
  outcome, block another action and require a manual history refresh. No automatic
  retry is sent and the record is retained.
- A 401 clears account/task state. Requests completing after sign-out, route
  unmount or a new account sign-in cannot restore the old account's data. Refresh
  clears old results before loading; failed reads do not leave a stale result
  presented as freshly verified. No raw server error or arbitrary result HTML is
  displayed. Task requests use same-origin URLs, `no-store`, omitted credentials,
  rejected redirects and a 15-second abort deadline.

## Verification and limits

Client tests consume the same successful result fixtures as the real Node/Python
MySQL integration suite, including exact decimal totals and overdue service dates.
Component tests cover availability, confirmed results, cancellation ambiguity,
credential revocation, old-account response races, bounded pagination and failed
refreshes. Playwright exercises desktop/mobile fixtures, keyboard navigation,
320px layouts, cancellation conflicts and invalid responses. Both service workers
are checked to bypass the Omega API; the CI parity check covers both source trees.
All browser identities/results are synthetic. These checks do not prove a real
production account, worker activity or production backup recovery.

Still needed before broad task rollout: explicit migration and dedicated worker
credentials, operating procedures and monitoring, retention/erasure policy,
backup/restore validation, and designated production test-account acceptance.
Live worker execution, running-task cancellation, general admin roles, live-domain
feeds, autonomous execution and self-improvement are not implemented by this UI.
The existing intake switch remains the rollout boundary. Rollback can revert this
UI while preserving task rows and all existing user data.
