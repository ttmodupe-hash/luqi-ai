# Ordinary private-notes request safety — 24 October 2026

## Defect and repair scope

The ordinary conversation client awaited fetch and response.json without a
request deadline or response-byte limit. A stalled list, create, message load,
save, delete or selected-conversation export could keep CompanionPage's busy lock
held indefinitely. This was established from source and synthetic cases, not
an observed production loss or outage.

Both frontend client copies now use the same single-attempt JSON transport:
- A 15-second deadline covers response headers and streamed-body acquisition.
  The deadline aborts the request and settles the caller even if a custom
  transport ignores abort or the underlying stream never finishes cancellation.
- Successful responses must be application/json with valid UTF-8 and JSON.
  Both declared size (when present) and actual streamed bytes are checked against
  8 MiB before parsing. Selected exports allow 1 MiB of saved text; JSON escaping
  can expand it sixfold, so the transport bound has space for escaping and metadata.
- Non-success HTTP bodies are cancelled, not parsed as diagnostic content.
  Existing status handling, authentication and schema checks remain intact.
- The timer is cleared after settlement. A late response is discarded and its
  body cancelled. Partial JSON is never returned as a successful result.

The deadline uses browser timers: a suspended/backgrounded tab may delay their
execution. This is not a server execution deadline, hard real-time guarantee,
server rollback or denial-of-service protection. Synchronous JSON parsing remains
bounded by the byte ceiling rather than a preemptive CPU timer.

## Write and privacy boundaries

A timed-out write may have committed. The existing UI therefore retains drafts,
marks saves/creation/deletion unconfirmed and requires an explicit saved-history
refresh before further writes. The user must compare the retained draft against
saved history to avoid manually duplicating a committed save. There is no
automatic retry, replay, background sync or idempotency claim.

Existing session epoch fences still discard late private results after sign-out
or unmount. This change does not add server logout/revocation or immediately abort
all ordinary requests on sign-out. In-memory sessions and private-cache policy
are unchanged. Failed exports cannot publish partial files.

The separate all-notes archive retains its existing 30-second / 32-MiB policy.
Sign-in and password-change behavior, server/API contracts, account ownership,
AI consent/budgets, database schema and records are not changed. Slow connections
may now receive an unconfirmed/error notice after 15 seconds rather than waiting
indefinitely; this reliability tradeoff is intentional.

## Evidence and acceptance

26 dependency-free Node tests passed locally on Node 22.16.0. They cover deadline
boundaries, ignored abort, stalled body/cancellation, late response cancellation,
HTTP denials, MIME/UTF-8/JSON validation, declared/actual byte limits, exact byte
ceiling, no retries, timer cleanup and mirrored helper equality.

Installed-dependency client tests add deadline coverage for all six ordinary
operations and selected-export size rejection. Existing synthetic fixtures now
include the JSON media type used by the real server, and exact request assertions
include the new AbortSignal without dropping authentication/body/path checks.

Two browser cases use the real built UI against loopback fixtures at 320px:
a potentially committed save with lost acknowledgement, and a stalled export.
They verify manual refresh, retained drafts, no repeated request/download,
unlocked controls and sign-out clearing. Existing Chromium/WebKit workflows run
these alongside all prior browser assertions. These are synthetic browser tests,
not physical-device acceptance or production data operations.

Actual final-head workflow and exact-revision deployment results belong in the
pull request and #202. Configuration and this document are not evidence of green
CI or a live release. No test retry or relaxed assertion is an acceptance substitute.
Production-derived restore, historical credentials, provider-cost reconciliation,
verified private support/recovery, human/device and commercial launch gates stay open.

Primary timing reference: https://playwright.dev/docs/clock
