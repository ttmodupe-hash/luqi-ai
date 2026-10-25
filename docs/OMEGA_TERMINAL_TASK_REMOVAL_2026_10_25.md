# Omega terminal-record lifecycle guard — 25 October 2026

## Defect corrected in reviewed source
The authenticated web queue imposes a persistent 100-record per-user cap.
Completed, failed and cancelled tasks previously counted forever with no
owner-visible removal. This could eventually block further submissions and
had no bounded active-storage cleanup action.

## Scope
The opt-in existing `LUQI_OMEGA_WEB_ENABLED` gate continues to control all
server task routes; production is still **disabled**. When enabled, the owner
may request `POST /api/v1/omega/tasks/:id/remove` with an exact body
`{"confirm":true}`. The authenticated server derives owner ID only from a
current validated account, locks the active user and task rows in InnoDB,
checks exact supported handler/version and no side effects, validates stored
result contract and permits deletion only for `completed`, `failed` or
`cancelled`. A committed removal returns only `{"removed":true,"id":"..."}`.
Other-owner/nonexistent tasks return indistinguishable 404. Nonterminal tasks
return 409. All outputs remain no-store and fixed-code errors redact database
diagnostics. A lost response must be checked by a manual refresh; do not retry
deletions automatically.

The client preserves current no-credentials-in-storage and no-follow-redirect
behavior. It requires a separate human confirmation, updates only the selected
task after a verified response, and distinguishes uncertain outcomes. The task
limit remains 100 active records per owner; confirmed terminal deletions can
free a slot, but the server does not expire records or overwrite old work.

## Exact boundaries still pending
- Task deletion is irreversible in active storage but backup copies remain
  subject to their separate retention. It is not whole-account export or erasure.
- Removing an idempotency key means reusing that key later can create new work:
  no automatic retry. Only deterministic non-billable handlers may be removed.
- Production currently has no Omega migration, grants or Python worker service.
  Operator must explicitly review/apply migration and grant DELETE on only
  `omega_tasks_v1` to a restricted web identity; never to the separate worker
  and never general MySQL root grants. No such production change in this PR.
- This does not clear historical credential exposure, private support,
  production-derived isolated restore, AI provider charges/limits or merchant
  checkout acceptance. Gate remains in issues #133 and #202.

## Verification
The PR includes mounted HTTP unit checks, client contract and no-retry checks,
desktop/mobile browser confirmation, and disposable real-MySQL tests: owner
isolation, nonterminal refusal, terminal deletion, quota recovery and rolled-back
trigger failures. None of this runs against production customer records.
