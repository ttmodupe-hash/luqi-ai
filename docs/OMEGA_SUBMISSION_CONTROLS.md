# Reviewed Omega task submission

The dashboard now prepares travel budget and vehicle service schedule tasks.
It submits only these two allowlisted, non-billable handlers after authenticated
status confirms intake is configured and the user reviews the exact inputs and
acknowledges that saving only queues a task. Production intake and worker
execution remain disabled. This page does not call a provider, run a worker,
approve an operation or invent a completed outcome.

## Input and confirmation boundaries

Amounts remain decimal strings: 1–50 non-negative values, maximum nine integer
digits and two decimal places. There is no floating-point conversion, FX lookup,
live price claim or cost estimate. Currency codes follow the existing backend's
three-uppercase-letter contract; this does not verify a currency's availability.

Vehicle inputs require bounded whole-number distances/intervals and real dates
from 1900 through 2099. Last service cannot be ahead of the current odometer or
assessment date. The user supplies manufacturer intervals; the form supplies no
recommended defaults. The assessment date initially uses the browser's local
calendar date and can be reviewed or changed.

Browser validation mirrors the server contract; the server remains authoritative.
New responses must identify the submitted handler and exact parsed payload.
A newly created task must be pending with zero attempts. Existing idempotent
responses may show a valid saved result, but the UI never computes or invents it.

## Duplicate and uncertainty handling

Each reviewed intent receives a browser-cryptographic random request reference.
The immutable payload and reference remain in page memory until confirmation,
editing before submission, sign-out or navigation/reload. Double clicks are
blocked synchronously. A timeout, lost response, contradictory JSON or error
does not confirm success, discard the request reference or retry automatically.

After an ambiguous response, editing is disabled. The user can inspect saved
tasks and explicitly retry the same request with the original reference. The
existing owner-scoped database idempotency constraint then returns the existing
task rather than inserting another. Refreshing history does not erase that
uncertainty. Signing out or leaving clears private page memory, so users must
check saved tasks before starting another intent on a later visit. Durable
cross-visit draft recovery is not implemented.

Sessions, passwords, request references and drafts are not written to browser
storage. Late responses from an earlier signed-out account are ignored. Server
diagnostic bodies are not rendered. All requests are same-origin, no-store,
without browser cookies or redirect following. Login throttling now also has
an explicit retry notice in the Omega screen.

## Verification and remaining scope

Client and component tests cover both input contracts, unsupported payloads,
review without writes, acknowledgement, duplicate clicks, lost/contradictory
responses, same-reference retry, status allowlisting and late-account responses.
Browser fixtures cover reviewed budget retry and vehicle submission with
keyboard use and 320px layouts. CI checks both frontend copies and strict
TypeScript, and builds the production application.

These tests use synthetic accounts and API fixtures. They do not establish
production-account acceptance, an active worker, public intake, evaluated
autonomy, other Omega domains, running-task cancellation or retention/deletion
policy. Backend owner quotas, transaction semantics and idempotency remain
covered by the existing disposable real-MySQL integration workflow.
